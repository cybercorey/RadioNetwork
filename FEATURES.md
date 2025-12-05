# RadioNetwork v2 - Feature List

## 🎯 Core Features

### 1. **Real-Time Song Tracking**
- Automatically scrapes radio streams every 60 seconds
- Parses ICY metadata from live audio streams
- Instant WebSocket updates to all connected clients
- Support for SomaFM stations (working) and NZ stations (ready for custom scrapers)

### 2. **Homepage Dashboard**
- Live view of all stations with currently playing songs
- Real-time updates via WebSocket
- Three-state status indicators:
  - **Live** (green): Station active with current song data
  - **No Data** (yellow): Station active but no current song
  - **Offline** (gray): Station inactive
- Station statistics: Total stations, currently playing, active stations

---

## 📊 Analytics & Visualizations

### 3. **Analytics Dashboard** (`/analytics`)
**Interactive charts with time range filtering:**
- 📈 **Plays Over Time**: Line chart showing play trends
- 🏆 **Top Songs**: Horizontal bar chart of most played songs
- 🎤 **Top Artists**: Bar chart of most played artists
- 📻 **Plays by Station**: Pie chart showing distribution across stations
- 🕐 **Plays by Hour**: Bar chart showing activity by time of day
- 🎵 **Plays by Genre**: Bar chart of plays grouped by station tags

**Key Metrics:**
- Total plays count
- Unique songs tracked
- Number of unique artists
- Active stations count

**Time Filters:**
- Last 24 hours
- Last 7 days
- Last 30 days
- All time

---

## 🔍 Search & Discovery

### 4. **Advanced Search** (`/search`)
**Multi-faceted search system:**
- **Search Types:**
  - All (comprehensive search)
  - Songs only
  - Artists only
  - Stations only

**Search Results Tabs:**
- **Songs**: Shows matching songs with play counts and non-song indicators
- **Stations**: Displays station cards with tags and status
- **Recent Plays**: Shows play history matching search criteria

**Non-Song Tagging:**
- Mark items as non-song content (shows, commercials, station IDs, etc.)
- Filter types: show, commercial, station-id, weather, news, other
- Visual badges to distinguish non-songs from actual music
- One-click flagging from search results

---

## 🎵 Song & Play Management

### 5. **All Plays Page** (`/plays`)
**Comprehensive play history with:**
- Server-side pagination (50 records per page)
- Multiple sort modes:
  - Most Recent
  - **Most Played** (with play count column)
  - Song Title
  - Artist Name
  - Station Name

**Filtering Options:**
- Date ranges: 24h, 7d, 30d, all time
- Station filter
- Genre filter (from station tags)
- Real-time search across songs/artists/stations

**Statistics:**
- Database Summary: All-time totals
- Current View: Stats for active filters/page

**Spotify Export:**
- Generate Spotify search URLs for all unique songs in filtered results
- Copy all URLs to clipboard
- Export up to 10,000 songs at once

### 6. **Song Detail Pages** (`/songs/[id]`)
**Per-song analytics:**
- Total play count
- Play breakdown by station
- First and last played dates
- 30-day play history chart
- Direct Spotify search link

---

## 🎨 UI/UX Features

### 7. **Navigation**
- Persistent top navigation bar
- Quick access to:
  - Home
  - All Plays
  - Search
  - Analytics

### 8. **Design System**
- Chakra UI dark mode theme
- Responsive design (mobile, tablet, desktop)
- Real-time updates without page refresh
- Loading states and spinners
- Toast notifications
- Color-coded badges and indicators

---

## 🔧 Technical Features

### 9. **Database Schema Enhancements**
**Songs table additions:**
- `is_non_song` (boolean): Flags non-music content
- `non_song_type` (string): Categorizes type of non-song content

### 10. **API Endpoints**

**Analytics:**
- `GET /api/analytics/stats` - Overall system statistics
- `GET /api/analytics/dashboard?timeRange=7d` - Dashboard data with charts
- `GET /api/analytics/station/:id` - Station-specific analytics

**Search:**
- `GET /api/search?q={query}&type={all|songs|artists|stations}` - Universal search

**Plays:**
- `GET /api/plays/stats` - Database-wide play statistics
- `GET /api/plays/recent` - Paginated plays with filters
- `GET /api/plays/most-played` - Most played songs with counts
- `GET /api/plays/song/:id` - Plays for specific song

**Songs:**
- `GET /api/songs` - List all songs (paginated)
- `GET /api/songs/top` - Top songs by play count
- `GET /api/songs/search?q={query}` - Search songs
- `GET /api/songs/:id` - Song details
- `GET /api/songs/:id/stats` - Detailed song statistics
- `PATCH /api/songs/:id/mark-non-song` - Mark as non-song content
- `PATCH /api/songs/:id/mark-as-song` - Revert to song

**Stations:**
- `GET /api/stations` - List all stations
- `GET /api/stations/:slug` - Station details
- `GET /api/stations/:slug/current` - Currently playing song
- `GET /api/stations/:slug/history` - Play history

---

## 📦 Dependencies Added

**Frontend:**
- `recharts` (^2.12.7) - Chart visualization library

**Backend:**
- (No new dependencies - uses existing Prisma, Express, etc.)

---

## 🗄️ Database Migration

**Migration file:** `20251206_add_non_song_fields/migration.sql`
```sql
ALTER TABLE "songs" ADD COLUMN "is_non_song" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ADD COLUMN "non_song_type" VARCHAR(50);
```

---

## 🚀 Usage Examples

### Analytics Dashboard
```
Visit /analytics
Select time range (24h, 7d, 30d, all)
View interactive charts and key metrics
```

### Search for Songs
```
Visit /search
Enter "The Rock Weekends"
Click flag icon to mark as "show" type
Song now tagged as non-music content
```

### Export to Spotify
```
Visit /plays
Apply filters (station, date, genre)
Click "Export to Spotify"
Copy all URLs to clipboard
Paste into Spotify to search and add to playlist
```

### View Most Played
```
Visit /plays
Select "Most Played" from sort dropdown
See play count column with purple badges
Page resets to 1 automatically
```

---

## 🎯 Next Steps

**Suggested Enhancements:**
1. User accounts and authentication
2. Saved searches and filters
3. Custom dashboards per user
4. Email/SMS alerts for favorite songs
5. NZ radio station custom scrapers
6. Mobile app (React Native or PWA)
7. Automated Spotify playlist creation (via Spotify API)
8. Export to CSV/JSON
9. Historical trend analysis
10. Song recommendations based on play patterns

---

## 📝 Notes

- All charts use Recharts library for consistency
- Non-song feature helps filter out station IDs, shows, commercials
- Server-side pagination prevents browser performance issues
- Database summary shows all-time data separate from filtered views
- Spotify export uses search URLs (no API key required)
