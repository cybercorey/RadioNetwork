import { prisma } from '../config/database';
import { Song, Prisma } from '@prisma/client';
import { normalizeText } from '../utils/normalizer';
import { detectRadioShow } from '../utils/showDetection';
import { logger } from '../utils/logger';

export class SongService {
  async findAll(limit = 100, offset = 0): Promise<Song[]> {
    return prisma.song.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: number): Promise<Song | null> {
    return prisma.song.findUnique({
      where: { id }
    });
  }

  async findByNormalized(artist: string, title: string): Promise<Song | null> {
    const artistNormalized = normalizeText(artist);
    const titleNormalized = normalizeText(title);

    return prisma.song.findUnique({
      where: {
        titleNormalized_artistNormalized: {
          titleNormalized,
          artistNormalized
        }
      }
    });
  }

  async findOrCreate(data: {
    artist: string;
    title: string;
    duration?: number;
    stationName?: string;
  }): Promise<Song> {
    const artistNormalized = normalizeText(data.artist);
    const titleNormalized = normalizeText(data.title);

    // Try to find existing
    let song = await this.findByNormalized(data.artist, data.title);

    if (!song) {
      // Check if this is a radio show (artist matches station name)
      let isNonSong = false;
      let nonSongType: string | null = null;

      if (data.stationName) {
        const detection = detectRadioShow(data.artist, data.title, data.stationName);
        if (detection.isShow) {
          isNonSong = true;
          nonSongType = 'show';
          logger.info(`Auto-detected radio show: "${data.artist} - ${data.title}" (${detection.reason})`);
        }
      }

      // Create new song
      song = await prisma.song.create({
        data: {
          artist: data.artist,
          title: data.title,
          artistNormalized,
          titleNormalized,
          duration: data.duration,
          isNonSong,
          nonSongType,
        }
      });
    }

    return song;
  }

  async getTopSongs(limit = 100, stationId?: number): Promise<any[]> {
    const where: any = {};
    if (stationId) {
      where.stationId = stationId;
    }

    const topSongs = await prisma.play.groupBy({
      by: ['songId'],
      where,
      _count: {
        songId: true
      },
      orderBy: {
        _count: {
          songId: 'desc'
        }
      },
      take: limit
    });

    // Get full song details
    const songs = await Promise.all(
      topSongs.map(async (item) => {
        const song = await this.findById(item.songId);
        return {
          ...song,
          playCount: item._count.songId
        };
      })
    );

    return songs;
  }

  async search(query: string, limit = 50): Promise<Song[]> {
    const normalized = normalizeText(query);

    return prisma.song.findMany({
      where: {
        OR: [
          { titleNormalized: { contains: normalized } },
          { artistNormalized: { contains: normalized } },
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getSongStats(songId: number): Promise<any> {
    // Get total play count
    const totalPlays = await prisma.play.count({
      where: { songId }
    });

    // Get plays by station
    const playsByStation = await prisma.play.groupBy({
      by: ['stationId'],
      where: { songId },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Get station details for each
    const stationsWithCounts = await Promise.all(
      playsByStation.map(async (item) => {
        const station = await prisma.station.findUnique({
          where: { id: item.stationId }
        });
        return {
          station,
          playCount: item._count.id
        };
      })
    );

    // Get first and last played dates
    const firstPlay = await prisma.play.findFirst({
      where: { songId },
      orderBy: { playedAt: 'asc' }
    });

    const lastPlay = await prisma.play.findFirst({
      where: { songId },
      orderBy: { playedAt: 'desc' }
    });

    // Get plays over time (last 30 days grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPlays = await prisma.play.findMany({
      where: {
        songId,
        playedAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        playedAt: true
      },
      orderBy: { playedAt: 'asc' }
    });

    // Group by day
    const playsByDay: { [key: string]: number } = {};
    recentPlays.forEach((play) => {
      const date = play.playedAt.toISOString().split('T')[0];
      playsByDay[date] = (playsByDay[date] || 0) + 1;
    });

    return {
      totalPlays,
      playsByStation: stationsWithCounts,
      firstPlayed: firstPlay?.playedAt,
      lastPlayed: lastPlay?.playedAt,
      playsByDay
    };
  }
}

export const songService = new SongService();
