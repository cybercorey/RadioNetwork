<p align="center">
  <img src="frontend/public/banner.svg" alt="RadioNetwork Banner" width="800">
</p>

Modern radio station tracking system for New Zealand radio stations.

## Features

- 🎵 Real-time song tracking via ICY metadata parsing
- 📊 Analytics and historical play data
- 🔄 Bull queue-driven automatic scraping (60-second intervals)
- 🚀 Next.js + Chakra UI frontend
- 🐳 Docker Compose for dev and production
- ✅ **Currently tracking 3 SomaFM stations with live "Now Playing" data**

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (database)
- Redis (cache & queue)
- Bull (job queue)
- Prisma (ORM)
- Socket.io (real-time)

### Frontend
- Next.js 15 (App Router)
- Chakra UI
- TypeScript
- Socket.io Client

## Quick Start

### Development

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down
```

**Services:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:4000
- PostgreSQL: localhost:5433
- Redis: localhost:6380

**Seed Database:**
```bash
docker exec radionetwork_api_dev npm run prisma:seed
```

### Production

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Stations

### Working Stations (ICY Metadata Supported)
The following stations are actively scraping "Now Playing" data:
- **SomaFM Groove Salad** - Ambient, Downtempo, Chillout
- **SomaFM Drone Zone** - Ambient, Drone, Space Music
- **SomaFM Secret Agent** - Lounge, Spy Jazz, Downtempo

### NZ Stations (Limited Support)
The database includes 10 top NZ radio stations, but they use HLS streams which don't support ICY metadata:
- **ZM** - Top 40, Pop, Hit Music
- **The Edge** - Rock, Alternative, Hit Music  
- **The Rock** - Rock, Classic Rock, Hard Rock
- **More FM** - Classic Hits, 80s, 90s, 00s
- **Newstalk ZB** - News, Talk, Current Affairs
- **Radio Hauraki** - Rock, Classic Rock, Alternative
- **Coast** - Easy Listening, Adult Contemporary, Classic Hits
- **The Breeze** - Easy Listening, Soft Rock, Adult Contemporary
- **Mai FM** - Hip Hop, R&B, Urban, Pacific
- **George FM** - Electronic, Dance, House, EDM

**Note:** NZ stations require alternative scraping methods (website parsing or official APIs) as they stream via HLS (.m3u8) instead of ICY metadata.

## API Endpoints

- `GET /api/stations` - List all stations
- `GET /api/stations/:slug` - Get station details
- `GET /api/stations/:slug/current` - Current playing song
- `GET /api/stations/:slug/history` - Play history
- `GET /api/songs` - All songs
- `GET /api/songs/top` - Top songs
- `GET /api/analytics/stats` - System statistics

## Docker Commands

```bash
# Start services
docker compose -f docker-compose.dev.yml up -d

# Stop services
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Restart a service
docker restart radionetwork_api_dev
docker restart radionetwork_frontend_dev

# Seed database with NZ stations
docker exec radionetwork_api_dev npm run prisma:seed

# Run Prisma migrations
docker exec radionetwork_api_dev npx prisma migrate deploy

# Generate Prisma client
docker exec radionetwork_api_dev npx prisma generate

# Access database
docker exec -it radionetwork_db_dev psql -U radionetwork -d radionetwork_dev
```

## Testing the System

Check if songs are being scraped:
```bash
# View recent plays
docker exec radionetwork_db_dev psql -U radionetwork -d radionetwork_dev -c "SELECT st.name, s.artist, s.title, p.played_at FROM plays p JOIN stations st ON p.station_id = st.id JOIN songs s ON p.song_id = s.id ORDER BY p.played_at DESC LIMIT 10;"

# Check SomaFM Groove Salad current song
curl http://localhost:4000/api/stations/soma-groove-salad/current | jq

# View all working stations
curl http://localhost:4000/api/stations | jq '.[] | select(.name | contains("SomaFM")) | {name, lastScrapedAt}'
```

Visit http://localhost:3001/stations/soma-groove-salad to see live updates in the UI.

## License

MIT
