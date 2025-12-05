import { Router } from 'express';
import { prisma } from '../../config/database';
import { playService } from '../../services/playService';

const router = Router();

// GET /api/analytics/stats - Get system statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [totalStations, totalSongs, totalPlays] = await Promise.all([
      prisma.station.count(),
      prisma.song.count(),
      playService.getTotalPlays()
    ]);

    const activeStations = await prisma.station.count({
      where: { isActive: true }
    });

    res.json({
      totalStations,
      activeStations,
      totalSongs,
      totalPlays,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/station/:id - Get analytics for a specific station
router.get('/station/:id', async (req, res, next) => {
  try {
    const stationId = parseInt(req.params.id);
    
    const totalPlays = await playService.getPlaysByStation(stationId);
    
    // Get plays per day for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const playsPerDay = await prisma.$queryRaw`
      SELECT 
        DATE(played_at) as date,
        COUNT(*) as count
      FROM plays
      WHERE station_id = ${stationId}
        AND played_at >= ${thirtyDaysAgo}
      GROUP BY DATE(played_at)
      ORDER BY date DESC
    `;

    res.json({
      stationId,
      totalPlays,
      playsPerDay
    });
  } catch (error) {
    next(error);
  }
});

export default router;
