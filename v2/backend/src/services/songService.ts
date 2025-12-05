import { prisma } from '../config/database';
import { Song, Prisma } from '@prisma/client';
import { normalizeText } from '../utils/normalizer';

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

  async findOrCreate(data: { artist: string; title: string; duration?: number }): Promise<Song> {
    const artistNormalized = normalizeText(data.artist);
    const titleNormalized = normalizeText(data.title);

    // Try to find existing
    let song = await this.findByNormalized(data.artist, data.title);

    if (!song) {
      // Create new song
      song = await prisma.song.create({
        data: {
          artist: data.artist,
          title: data.title,
          artistNormalized,
          titleNormalized,
          duration: data.duration
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
}

export const songService = new SongService();
