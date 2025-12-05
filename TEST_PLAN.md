# RadioNetwork v2 - Test Plan

## Phase 1: Foundation Test ✓

### Database & Docker
- [x] Docker Compose starts all services
- [x] PostgreSQL is accessible
- [x] Redis is accessible
- [x] Database migrations run
- [x] Seed data is loaded

### Backend API
- [x] Backend starts without errors
- [x] Health endpoint responds
- [x] Prisma client connects

### Frontend
- [x] Frontend builds successfully
- [x] Next.js starts
- [x] Homepage loads

## Phase 2: Core Scraping Test

### ICY Metadata Parser
- [ ] Parse metadata from NZ station streams
- [ ] Handle various metadata formats
- [ ] Error handling for unavailable streams

### Bull Queue
- [ ] Jobs are created
- [ ] Workers process jobs
- [ ] Failed jobs retry
- [ ] Repeating jobs schedule correctly

### Database Operations
- [ ] Songs are created
- [ ] Plays are recorded
- [ ] Duplicates are detected

## Phase 3: API & Real-time Test

### REST Endpoints
- [ ] GET /api/stations
- [ ] GET /api/stations/:slug
- [ ] GET /api/stations/:slug/current
- [ ] GET /api/stations/:slug/history
- [ ] GET /api/songs
- [ ] GET /api/songs/top
- [ ] GET /api/analytics/stats

### WebSocket
- [ ] Socket.io connects
- [ ] New song events emit
- [ ] Clients receive updates

## Phase 4: Frontend Features Test

### Pages
- [ ] Homepage displays stations
- [ ] Station detail page loads
- [ ] Now playing updates in real-time
- [ ] History displays correctly

### Components
- [ ] Station cards render
- [ ] Real-time updates work
- [ ] Navigation works

## Phase 5: Integration Test

### End-to-End
- [ ] Scraper fetches song from stream
- [ ] Song saved to database
- [ ] API returns current song
- [ ] Frontend displays song
- [ ] WebSocket updates frontend in real-time

### Performance
- [ ] Multiple stations scrape concurrently
- [ ] Database queries are fast
- [ ] Memory usage is acceptable
- [ ] No memory leaks

### Error Handling
- [ ] Failed scrapes don't crash system
- [ ] Invalid data is handled
- [ ] Network errors are recoverable
