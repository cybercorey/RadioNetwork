import { prisma } from '../config/database';
import { Station, Prisma } from '@prisma/client';

export class StationService {
  async findAll(): Promise<Station[]> {
    return prisma.station.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findAllActive(): Promise<Station[]> {
    return prisma.station.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: number): Promise<Station | null> {
    return prisma.station.findUnique({
      where: { id }
    });
  }

  async findBySlug(slug: string): Promise<Station | null> {
    return prisma.station.findUnique({
      where: { slug }
    });
  }

  async create(data: Prisma.StationCreateInput): Promise<Station> {
    return prisma.station.create({ data });
  }

  async update(id: number, data: Prisma.StationUpdateInput): Promise<Station> {
    return prisma.station.update({
      where: { id },
      data
    });
  }

  async updateLastScraped(id: number): Promise<void> {
    await prisma.station.update({
      where: { id },
      data: { lastScrapedAt: new Date() }
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.station.delete({
      where: { id }
    });
  }
}

export const stationService = new StationService();
