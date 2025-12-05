# RadioNetwork v2

Modern radio station tracking system for New Zealand radio stations.

## Features

- 🎵 Real-time song tracking via ICY metadata parsing
- 📊 Analytics and historical play data
- 🔄 Bull queue-driven automatic scraping
- 🚀 Next.js + Chakra UI frontend
- 🐳 Docker Compose for dev and production

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (database)
- Redis (cache & queue)
- Bull (job queue)
- Prisma (ORM)
- Socket.io (real-time)

### Frontend
- Next.js 14 (App Router)
- Chakra UI
- TypeScript
- Socket.io Client

## Quick Start

### Development

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

Frontend: http://localhost:3000
Backend API: http://localhost:4000
PostgreSQL: localhost:5432
Redis: localhost:6379

### Production

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## API Endpoints

- `GET /api/stations` - List all stations
- `GET /api/stations/:slug/current` - Current playing song
- `GET /api/stations/:slug/history` - Play history
- `GET /api/songs` - All songs
- `GET /api/songs/top` - Top songs
- `GET /api/analytics/stats` - System statistics

## Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## License

MIT
