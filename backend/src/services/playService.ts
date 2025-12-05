import { prisma } from '../config/database';
import { Play, Prisma } from '@prisma/client';

export class PlayService {
  async create(data: Prisma.PlayCreateInput): Promise<Play> {
    return prisma.play.create({ data });
  }

  async getLastPlay(stationId: number): Promise<Play | null> {
    return prisma.play.findFirst({
      where: { stationId },
      orderBy: { playedAt: 'desc' }
    });
  }

  async getCurrentPlay(stationId: number): Promise<any> {
    const play = await prisma.play.findFirst({
      where: { stationId },
      orderBy: { playedAt: 'desc' },
      include: {
        song: true,
        station: true
      }
    });

    return play;
  }

  async getHistory(stationId: number, options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    const { limit = 50, offset = 0 } = options;

    return prisma.play.findMany({
      where: { stationId },
      include: {
        song: true
      },
      orderBy: { playedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async getRecentPlays(limit = 100): Promise<any[]> {
    return prisma.play.findMany({
      include: {
        song: true,
        station: true
      },
      orderBy: { playedAt: 'desc' },
      take: limit
    });
  }

  async getPlaysForSong(songId: number, limit = 100): Promise<any[]> {
    return prisma.play.findMany({
      where: { songId },
      include: {
        station: true
      },
      orderBy: { playedAt: 'desc' },
      take: limit
    });
  }

  async getPlaysBetween(stationId: number, startTime: Date, endTime: Date): Promise<Play[]> {
    return prisma.play.findMany({
      where: {
        stationId,
        playedAt: {
          gte: startTime,
          lte: endTime
        }
      },
      orderBy: { playedAt: 'asc' }
    });
  }

  async checkDuplicates(stationId: number, songId: number, hours = 8): Promise<Play[]> {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    return prisma.play.findMany({
      where: {
        stationId,
        songId,
        playedAt: {
          gte: startTime,
          lte: now
        }
      },
      orderBy: { playedAt: 'asc' }
    });
  }

  async getTotalPlays(): Promise<number> {
    return prisma.play.count();
  }

  async getPlaysByStation(stationId: number): Promise<number> {
    return prisma.play.count({
      where: { stationId }
    });
  }
}

export const playService = new PlayService();
