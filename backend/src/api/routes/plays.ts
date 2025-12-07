import { Router } from 'express';
import { playService } from '../../services/playService';
import { prisma } from '../../config/database';

const router = Router();

// Helper function to parse date filters (both modern and legacy)
function parseDateFilter(dateFilter: string): { gte?: Date; lte?: Date } | null {
  if (!dateFilter || dateFilter === 'all') return null;

  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (dateFilter) {
    // Modern relative filters
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return null;
  }

  if (startDate && endDate) {
    return { gte: startDate, lte: endDate };
  } else if (startDate) {
    return { gte: startDate };
  }
  return null;
}

// Helper function to build date range conditions for legacy multi-select filters
// years: comma-separated list of years (e.g., "2013,2014")
// months: comma-separated list of months (e.g., "1,2,3" for Jan, Feb, Mar)
function buildLegacyDateFilter(years: string, months: string): { OR: Array<{ playedAt: { gte: Date; lte: Date } }> } | null {
  if (!years || years === 'all') return null;

  const yearList = years.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
  if (yearList.length === 0) return null;

  const monthList = months && months !== 'all'
    ? months.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m) && m >= 1 && m <= 12)
    : []; // Empty means all months

  const conditions: Array<{ playedAt: { gte: Date; lte: Date } }> = [];

  for (const year of yearList) {
    if (monthList.length === 0) {
      // Full year
      conditions.push({
        playedAt: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lte: new Date(`${year}-12-31T23:59:59Z`),
        },
      });
    } else {
      // Specific months
      for (const month of monthList) {
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // Day 0 of next month = last day of current month
        conditions.push({
          playedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        });
      }
    }
  }

  return conditions.length > 0 ? { OR: conditions } : null;
}

// GET /api/plays/stats - Get overall database statistics
// Query params:
//   - source: 'v1' | 'v2' | 'all' - filter by data source (legacy vs modern)
router.get('/stats', async (req, res, next) => {
  try {
    const sourceFilter = req.query.source as string || 'all';

    // Build where clause for source filter
    const playWhere: any = {};
    if (sourceFilter === 'v1') {
      playWhere.source = 'v1';
    } else if (sourceFilter === 'v2') {
      playWhere.source = 'v2';
    }

    const totalPlays = await prisma.play.count({ where: playWhere });

    // Get unique songs and artists based on source filter
    let totalSongs: number;
    let uniqueArtists: number;
    let totalStations: number;

    if (sourceFilter === 'v1' || sourceFilter === 'v2') {
      // Get songs that have plays with the specified source
      const songsWithPlays = await prisma.play.findMany({
        where: playWhere,
        select: { songId: true },
        distinct: ['songId'],
      });
      totalSongs = songsWithPlays.length;

      // Get unique artists from those songs
      const songIds = songsWithPlays.map(p => p.songId);
      const artistsFromSongs = await prisma.song.findMany({
        where: { id: { in: songIds } },
        select: { artist: true },
      });
      uniqueArtists = new Set(artistsFromSongs.map(s => s.artist)).size;

      // Get stations that have plays with the specified source
      const stationsWithPlays = await prisma.play.findMany({
        where: playWhere,
        select: { stationId: true },
        distinct: ['stationId'],
      });
      totalStations = stationsWithPlays.length;
    } else {
      // All sources - count everything
      totalSongs = await prisma.song.count();
      totalStations = await prisma.station.count({ where: { isActive: true } });
      const allSongs = await prisma.song.findMany({ select: { artist: true } });
      uniqueArtists = new Set(allSongs.map(s => s.artist)).size;
    }

    // Get breakdown by source
    const legacyPlays = await prisma.play.count({ where: { source: 'v1' } });
    const modernPlays = await prisma.play.count({ where: { source: 'v2' } });

    // Get date range for legacy data
    const oldestLegacy = await prisma.play.findFirst({
      where: { source: 'v1' },
      orderBy: { playedAt: 'asc' },
      select: { playedAt: true },
    });
    const newestLegacy = await prisma.play.findFirst({
      where: { source: 'v1' },
      orderBy: { playedAt: 'desc' },
      select: { playedAt: true },
    });

    res.json({
      totalPlays,
      totalSongs,
      totalStations,
      uniqueArtists,
      source: sourceFilter,
      breakdown: {
        legacy: {
          plays: legacyPlays,
          dateRange: oldestLegacy && newestLegacy ? {
            from: oldestLegacy.playedAt,
            to: newestLegacy.playedAt,
          } : null,
        },
        modern: {
          plays: modernPlays,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/recent - Get recent plays with pagination and filtering
// Query params:
//   - limit, offset: pagination
//   - station: filter by station slug
//   - genre: filter by genre tag
//   - search: search in title/artist/station
//   - dateFilter: '24h' | '7d' | '30d' | 'all' - for modern mode
//   - years: comma-separated years (e.g., '2013,2014') - for legacy mode
//   - months: comma-separated months 1-12 (e.g., '1,2,3') - for legacy mode
//   - filter: 'songs' (default) | 'shows' | 'all' - filter by content type
//   - source: 'v1' | 'v2' | 'all' - filter by data source (legacy vs modern)
router.get('/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const stationSlug = req.query.station as string;
    const genre = req.query.genre as string;
    const search = req.query.search as string;
    const dateFilter = req.query.dateFilter as string;
    const years = req.query.years as string;
    const months = req.query.months as string;
    const contentFilter = req.query.filter as string || 'songs'; // 'songs', 'shows', or 'all'
    const sourceFilter = req.query.source as string || 'all'; // 'v1', 'v2', or 'all'

    // Build where clause
    const where: any = {};

    // Source filter (legacy v1 vs modern v2)
    if (sourceFilter === 'v1') {
      where.source = 'v1';
    } else if (sourceFilter === 'v2') {
      where.source = 'v2';
    }
    // 'all' = no filter

    // Content type filter (songs vs shows)
    if (contentFilter === 'songs') {
      where.song = { isNonSong: false };
    } else if (contentFilter === 'shows') {
      where.song = { isNonSong: true };
    }
    // 'all' = no filter

    // Station filter
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        where.stationId = station.id;
      }
    }

    // Date filter - check for legacy multi-select first, then modern filters
    const legacyDateFilter = buildLegacyDateFilter(years, months);
    if (legacyDateFilter) {
      where.AND = [...(where.AND || []), legacyDateFilter];
    } else {
      const dateRange = parseDateFilter(dateFilter);
      if (dateRange) {
        where.playedAt = dateRange;
      }
    }

    // Get total count with filters
    const total = await prisma.play.count({ where });

    // Get plays
    let plays = await prisma.play.findMany({
      where,
      include: {
        song: true,
        station: true,
      },
      orderBy: { playedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Client-side filters (genre and search) - apply after fetching
    if (genre && genre !== 'all') {
      plays = plays.filter(play => play.station.tags.includes(genre));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      plays = plays.filter(play =>
        play.song.title.toLowerCase().includes(searchLower) ||
        play.song.artist.toLowerCase().includes(searchLower) ||
        play.station.name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      plays,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + plays.length < total,
      },
      filter: contentFilter,
      source: sourceFilter,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/most-played - Get most played songs with pagination
// Query params:
//   - limit, offset: pagination
//   - station: filter by station slug
//   - dateFilter: '24h' | '7d' | '30d' | 'all' - for modern mode
//   - years: comma-separated years (e.g., '2013,2014') - for legacy mode
//   - months: comma-separated months 1-12 (e.g., '1,2,3') - for legacy mode
//   - filter: 'songs' (default) | 'shows' | 'all' - filter by content type
//   - source: 'v1' | 'v2' | 'all' - filter by data source (legacy vs modern)
router.get('/most-played', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const stationSlug = req.query.station as string;
    const dateFilter = req.query.dateFilter as string;
    const years = req.query.years as string;
    const months = req.query.months as string;
    const contentFilter = req.query.filter as string || 'songs'; // 'songs', 'shows', or 'all'
    const sourceFilter = req.query.source as string || 'all'; // 'v1', 'v2', or 'all'

    // Build where clause for filtering
    const where: any = {};

    // Source filter (legacy v1 vs modern v2)
    if (sourceFilter === 'v1') {
      where.source = 'v1';
    } else if (sourceFilter === 'v2') {
      where.source = 'v2';
    }
    // 'all' = no filter

    // Content type filter (songs vs shows)
    if (contentFilter === 'songs') {
      where.song = { isNonSong: false };
    } else if (contentFilter === 'shows') {
      where.song = { isNonSong: true };
    }
    // 'all' = no filter

    // Station filter
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        where.stationId = station.id;
      }
    }

    // Date filter - check for legacy multi-select first, then modern filters
    const legacyDateFilter = buildLegacyDateFilter(years, months);
    if (legacyDateFilter) {
      where.AND = [...(where.AND || []), legacyDateFilter];
    } else {
      const dateRange = parseDateFilter(dateFilter);
      if (dateRange) {
        where.playedAt = dateRange;
      }
    }

    // Group by songId and count
    const songPlayCounts = await prisma.play.groupBy({
      by: ['songId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = songPlayCounts.length;

    // Get paginated results
    const paginatedSongs = songPlayCounts.slice(offset, offset + limit);

    // Fetch full song and latest play details
    const results = await Promise.all(
      paginatedSongs.map(async (item) => {
        const song = await prisma.song.findUnique({ where: { id: item.songId } });
        const latestPlay = await prisma.play.findFirst({
          where: { songId: item.songId, ...where },
          include: { station: true },
          orderBy: { playedAt: 'desc' },
        });

        return {
          song,
          playCount: item._count.id,
          latestPlay: latestPlay
            ? {
                playedAt: latestPlay.playedAt,
                station: latestPlay.station,
              }
            : null,
        };
      })
    );

    res.json({
      results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
      filter: contentFilter,
      source: sourceFilter,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/song/:id - Get plays for a specific song
router.get('/song/:id', async (req, res, next) => {
  try {
    const songId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;

    const plays = await playService.getPlaysForSong(songId, limit);

    res.json(plays);
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/this-day-in-history - Get plays from the same day/time in past years
// Shows what was playing on each station at this time X years ago
// Query params:
//   - hour: specific hour to look at (0-23, default: current hour)
//   - minute: specific minute (0-59, default: current minute)
//   - source: 'v1' | 'v2' | 'all' - filter by data source (default: v1 for legacy)
router.get('/this-day-in-history', async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    const hour = parseInt(req.query.hour as string) || now.getHours();
    const minute = parseInt(req.query.minute as string) || now.getMinutes();
    const sourceFilter = req.query.source as string || 'v1';

    // Get available years from legacy data
    const availableYears = await prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM played_at)::int as year
      FROM plays
      WHERE source = ${sourceFilter}
      ORDER BY year DESC
    `;

    const years = availableYears.map(y => y.year);

    // For each year, find plays around the same time on the same day
    const historyByYear = await Promise.all(
      years.map(async (year) => {
        // Create time window: same day, +/- 30 minutes from specified time
        const targetTime = new Date(Date.UTC(year, currentMonth - 1, currentDay, hour, minute, 0));
        const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
        const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);

        // Get plays in this window, grouped by station
        const plays = await prisma.play.findMany({
          where: {
            source: sourceFilter,
            playedAt: {
              gte: windowStart,
              lte: windowEnd,
            },
          },
          include: {
            song: true,
            station: true,
          },
          orderBy: { playedAt: 'asc' },
        });

        // Group by station and get the closest play to target time
        const stationPlays = new Map<number, typeof plays[0]>();
        for (const play of plays) {
          const existing = stationPlays.get(play.stationId);
          if (!existing) {
            stationPlays.set(play.stationId, play);
          } else {
            // Keep the one closest to target time
            const existingDiff = Math.abs(new Date(existing.playedAt).getTime() - targetTime.getTime());
            const currentDiff = Math.abs(new Date(play.playedAt).getTime() - targetTime.getTime());
            if (currentDiff < existingDiff) {
              stationPlays.set(play.stationId, play);
            }
          }
        }

        return {
          year,
          targetTime: targetTime.toISOString(),
          stations: Array.from(stationPlays.values()).map(play => ({
            station: {
              id: play.station.id,
              name: play.station.name,
              slug: play.station.slug,
            },
            song: {
              id: play.song.id,
              title: play.song.title,
              artist: play.song.artist,
            },
            playedAt: play.playedAt,
            legacyStation: (play.rawMetadata as any)?.legacyStation || play.station.name,
          })),
        };
      })
    );

    // Filter out years with no data
    const validHistory = historyByYear.filter(h => h.stations.length > 0);

    res.json({
      currentDate: {
        month: currentMonth,
        day: currentDay,
        hour,
        minute,
        displayDate: `${now.toLocaleDateString('en-NZ', { month: 'long', day: 'numeric' })}`,
        displayTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      },
      years: validHistory,
      source: sourceFilter,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/plays/heatmap - Get hourly play counts for heatmap visualization
// Returns play counts by hour and day of week for each station
// Query params:
//   - station: station slug (optional, returns all if not specified)
//   - days: number of days to analyze (default: 30) - ignored if year is specified
//   - year: specific year to analyze (e.g., 2013, 2014, 2015) - for legacy data
//   - source: 'v1' | 'v2' | 'all' - filter by data source
//   - metric: 'total' | 'unique' - count total plays or unique songs (default: total)
router.get('/heatmap', async (req, res, next) => {
  try {
    const stationSlug = req.query.station as string;
    const days = parseInt(req.query.days as string) || 30;
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const sourceFilter = req.query.source as string || 'all';
    const metric = req.query.metric as string || 'total';

    // Determine date range - either by year or by days
    let dateCondition: string;
    let dateParams: any[];
    let timeframeLabel: string;

    if (year) {
      // Use specific year range
      const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      dateCondition = 'p.played_at >= $1 AND p.played_at <= $2';
      dateParams = [startOfYear, endOfYear];
      timeframeLabel = `${year}`;
    } else {
      // Use days-based threshold
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      dateCondition = 'p.played_at >= $1';
      dateParams = [dateThreshold];
      timeframeLabel = `${days} days`;
    }

    // Build source filter SQL
    const sourceCondition = sourceFilter === 'v1'
      ? `AND p.source = 'v1'`
      : sourceFilter === 'v2'
        ? `AND p.source = 'v2'`
        : '';

    // Get station filter if specified
    let stationCondition = '';
    let stationInfo = null;
    if (stationSlug && stationSlug !== 'all') {
      const station = await prisma.station.findUnique({ where: { slug: stationSlug } });
      if (station) {
        stationCondition = `AND p.station_id = ${station.id}`;
        stationInfo = { id: station.id, name: station.name, slug: station.slug };
      }
    }

    // Query for heatmap data: hour (0-23) x day of week (0-6, 0=Sunday)
    const heatmapData = metric === 'unique'
      ? await prisma.$queryRawUnsafe<{ day_of_week: number; hour: number; count: number }[]>(`
          SELECT
            EXTRACT(DOW FROM p.played_at)::int as day_of_week,
            EXTRACT(HOUR FROM p.played_at)::int as hour,
            COUNT(DISTINCT p.song_id)::int as count
          FROM plays p
          WHERE ${dateCondition}
            ${sourceCondition}
            ${stationCondition}
          GROUP BY EXTRACT(DOW FROM p.played_at), EXTRACT(HOUR FROM p.played_at)
          ORDER BY day_of_week, hour
        `, ...dateParams)
      : await prisma.$queryRawUnsafe<{ day_of_week: number; hour: number; count: number }[]>(`
          SELECT
            EXTRACT(DOW FROM p.played_at)::int as day_of_week,
            EXTRACT(HOUR FROM p.played_at)::int as hour,
            COUNT(*)::int as count
          FROM plays p
          WHERE ${dateCondition}
            ${sourceCondition}
            ${stationCondition}
          GROUP BY EXTRACT(DOW FROM p.played_at), EXTRACT(HOUR FROM p.played_at)
          ORDER BY day_of_week, hour
        `, ...dateParams);

    // Build a 7x24 matrix (days x hours)
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxCount = 0;

    for (const row of heatmapData) {
      matrix[row.day_of_week][row.hour] = row.count;
      if (row.count > maxCount) maxCount = row.count;
    }

    // Calculate peak hours (top 5 hours)
    const hourlyTotals: { hour: number; total: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const total = matrix.reduce((sum, day) => sum + day[hour], 0);
      hourlyTotals.push({ hour, total });
    }
    hourlyTotals.sort((a, b) => b.total - a.total);
    const peakHours = hourlyTotals.slice(0, 5);

    // Get per-station heatmaps if no specific station selected
    let stationHeatmaps: any[] = [];
    if (!stationSlug || stationSlug === 'all') {
      const stations = await prisma.station.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
      });

      stationHeatmaps = await Promise.all(
        stations.map(async (station) => {
          // Build query with year or days-based date condition
          const stationData = year
            ? await prisma.$queryRawUnsafe<{ hour: number; count: number }[]>(`
                SELECT
                  EXTRACT(HOUR FROM p.played_at)::int as hour,
                  COUNT(*)::int as count
                FROM plays p
                WHERE ${dateCondition}
                  AND p.station_id = $3
                  ${sourceCondition}
                GROUP BY EXTRACT(HOUR FROM p.played_at)
                ORDER BY hour
              `, ...dateParams, station.id)
            : await prisma.$queryRawUnsafe<{ hour: number; count: number }[]>(`
                SELECT
                  EXTRACT(HOUR FROM p.played_at)::int as hour,
                  COUNT(*)::int as count
                FROM plays p
                WHERE ${dateCondition}
                  AND p.station_id = $2
                  ${sourceCondition}
                GROUP BY EXTRACT(HOUR FROM p.played_at)
                ORDER BY hour
              `, ...dateParams, station.id);

          const hourlyData = Array(24).fill(0);
          let stationMax = 0;
          for (const row of stationData) {
            hourlyData[row.hour] = row.count;
            if (row.count > stationMax) stationMax = row.count;
          }

          // Find peak hour for this station
          const peakHour = hourlyData.indexOf(Math.max(...hourlyData));

          return {
            station: { id: station.id, name: station.name, slug: station.slug },
            hourlyData,
            peakHour,
            maxCount: stationMax,
          };
        })
      );

      // Sort by total plays
      stationHeatmaps.sort((a, b) => {
        const aTotal = a.hourlyData.reduce((s: number, v: number) => s + v, 0);
        const bTotal = b.hourlyData.reduce((s: number, v: number) => s + v, 0);
        return bTotal - aTotal;
      });
    }

    res.json({
      timeframe: timeframeLabel,
      source: sourceFilter,
      metric,
      year: year || null,
      station: stationInfo,
      matrix, // 7x24 matrix [day][hour]
      maxCount,
      peakHours,
      dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      stationHeatmaps: stationHeatmaps.slice(0, 20), // Top 20 stations
    });
  } catch (error) {
    next(error);
  }
});

export default router;
