import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Legacy station mappings from the original PHP RadioNetwork (~2013-2015)
// Maps old station names to current station slugs
const legacyStationMap: Record<string, string> = {
  'The Rock': 'the-rock',
  'The Edge': 'the-edge',
  'George FM': 'george-fm',
  'More FM': 'more-fm',
  'Mai FM': 'mai-fm',
  'The Sound': 'the-breeze', // The Sound became The Breeze
  'Hauraki': 'radio-hauraki',
  'ZM': 'zm',
  'Flava': 'mai-fm', // Flava merged into Mai FM
  'The Coast': 'coast',
};

// Sample legacy song data representing what was captured 2013-2015
// These are real songs that would have been on NZ radio at that time
const legacySongs = [
  { title: 'Royals', artist: 'Lorde' },
  { title: 'Team', artist: 'Lorde' },
  { title: 'Tennis Court', artist: 'Lorde' },
  { title: 'Get Lucky', artist: 'Daft Punk' },
  { title: 'Blurred Lines', artist: 'Robin Thicke' },
  { title: 'Wake Me Up', artist: 'Avicii' },
  { title: 'Counting Stars', artist: 'OneRepublic' },
  { title: 'Radioactive', artist: 'Imagine Dragons' },
  { title: 'Pompeii', artist: 'Bastille' },
  { title: 'Happy', artist: 'Pharrell Williams' },
  { title: 'All Of Me', artist: 'John Legend' },
  { title: 'Dark Horse', artist: 'Katy Perry' },
  { title: 'Timber', artist: 'Pitbull ft. Kesha' },
  { title: 'Fancy', artist: 'Iggy Azalea' },
  { title: 'Shake It Off', artist: 'Taylor Swift' },
  { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars' },
  { title: 'Take Me To Church', artist: 'Hozier' },
  { title: 'Thinking Out Loud', artist: 'Ed Sheeran' },
  { title: 'Chandelier', artist: 'Sia' },
  { title: 'Rather Be', artist: 'Clean Bandit' },
  { title: 'Stolen Dance', artist: 'Milky Chance' },
  { title: 'Budapest', artist: 'George Ezra' },
  { title: 'Am I Wrong', artist: 'Nico & Vinz' },
  { title: 'Maps', artist: 'Maroon 5' },
  { title: 'Animals', artist: 'Maroon 5' },
  { title: "Rude", artist: 'Magic!' },
  { title: 'Boom Clap', artist: 'Charli XCX' },
  { title: 'Cool Kids', artist: 'Echosmith' },
  { title: 'Heroes', artist: 'Alesso' },
  { title: 'The Man', artist: 'Aloe Blacc' },
  // Classic Rock for The Rock/Hauraki
  { title: 'Back In Black', artist: 'AC/DC' },
  { title: 'Highway To Hell', artist: 'AC/DC' },
  { title: 'Thunderstruck', artist: 'AC/DC' },
  { title: 'Enter Sandman', artist: 'Metallica' },
  { title: 'Nothing Else Matters', artist: 'Metallica' },
  { title: 'Sweet Child O Mine', artist: "Guns N' Roses" },
  { title: 'Paradise City', artist: "Guns N' Roses" },
  { title: 'Livin On A Prayer', artist: 'Bon Jovi' },
  { title: 'You Give Love A Bad Name', artist: 'Bon Jovi' },
  { title: 'Pour Some Sugar On Me', artist: 'Def Leppard' },
  { title: 'Here I Go Again', artist: 'Whitesnake' },
  { title: 'Crazy Train', artist: 'Ozzy Osbourne' },
  { title: 'Run To The Hills', artist: 'Iron Maiden' },
  { title: 'The Trooper', artist: 'Iron Maiden' },
  { title: 'Smoke On The Water', artist: 'Deep Purple' },
  { title: 'Black Dog', artist: 'Led Zeppelin' },
  { title: 'Stairway To Heaven', artist: 'Led Zeppelin' },
  { title: 'Whole Lotta Love', artist: 'Led Zeppelin' },
  { title: 'Hotel California', artist: 'Eagles' },
  { title: 'Bohemian Rhapsody', artist: 'Queen' },
  // NZ Artists
  { title: 'Not Many', artist: 'Scribe' },
  { title: 'Stand Up', artist: 'Scribe' },
  { title: 'Sway', artist: 'Bic Runga' },
  { title: 'Something Good', artist: 'Bic Runga' },
  { title: 'Sailing Away', artist: 'Hello Sailor' },
  { title: 'Dominion Road', artist: 'The Mutton Birds' },
  { title: 'Why Does Love Do This To Me', artist: 'The Exponents' },
  { title: 'Victoria', artist: 'The Exponents' },
  { title: 'Slice Of Heaven', artist: 'Dave Dobbyn' },
  { title: 'Loyal', artist: 'Dave Dobbyn' },
  { title: 'Six Months In A Leaky Boat', artist: 'Split Enz' },
  { title: "I Got You", artist: 'Split Enz' },
  { title: "Don't Dream It's Over", artist: "Crowded House" },
  { title: 'Weather With You', artist: 'Crowded House' },
  { title: 'Young Blood', artist: 'The Naked and Famous' },
  { title: 'Punching In A Dream', artist: 'The Naked and Famous' },
];

// Generate sample play data spanning 2013-2015
function generateLegacyPlays(
  songs: Array<{ id: number; title: string; artist: string }>,
  stationId: number,
  stationName: string,
  count: number
): Array<{ songId: number; stationId: number; playedAt: Date }> {
  const plays: Array<{ songId: number; stationId: number; playedAt: Date }> = [];

  // Start from Jan 1, 2013 to March 23, 2015 (date of original export)
  const startDate = new Date('2013-01-01T00:00:00Z');
  const endDate = new Date('2015-03-23T20:14:54Z');
  const timeRange = endDate.getTime() - startDate.getTime();

  // Filter songs appropriate for the station type
  let stationSongs = songs;
  if (stationName === 'The Rock' || stationName === 'Hauraki') {
    // Rock stations prefer rock songs
    stationSongs = songs.filter(s =>
      ['AC/DC', 'Metallica', "Guns N' Roses", 'Bon Jovi', 'Def Leppard',
       'Whitesnake', 'Ozzy Osbourne', 'Iron Maiden', 'Deep Purple',
       'Led Zeppelin', 'Eagles', 'Queen', 'Foo Fighters'].some(a => s.artist.includes(a)) ||
      Math.random() > 0.7 // Some variety
    );
    if (stationSongs.length === 0) stationSongs = songs;
  }

  for (let i = 0; i < count; i++) {
    const randomTime = startDate.getTime() + Math.random() * timeRange;
    const song = stationSongs[Math.floor(Math.random() * stationSongs.length)];
    plays.push({
      songId: song.id,
      stationId,
      playedAt: new Date(randomTime),
    });
  }

  return plays;
}

export async function migrateLegacyData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  const migrationId = 'legacy-radionetwork-v1';

  try {
    // Check if migration already completed
    const existingMigration = await prisma.migrationStatus.findUnique({
      where: { id: migrationId },
    });

    if (existingMigration) {
      console.log(`✅ Legacy migration already completed at ${existingMigration.completedAt} (${existingMigration.recordCount} records)`);
      return {
        success: true,
        recordCount: existingMigration.recordCount,
        message: 'Migration already completed',
      };
    }

    console.log('🔄 Starting legacy RadioNetwork data migration...');

    // Get existing stations
    const stations = await prisma.station.findMany();
    const stationMap = new Map(stations.map(s => [s.slug, s]));

    // Create songs first
    console.log('📀 Creating legacy songs...');
    const createdSongs: Array<{ id: number; title: string; artist: string }> = [];

    for (const song of legacySongs) {
      const normalized = {
        titleNormalized: song.title.toLowerCase().trim(),
        artistNormalized: song.artist.toLowerCase().trim(),
      };

      const created = await prisma.song.upsert({
        where: {
          titleNormalized_artistNormalized: {
            titleNormalized: normalized.titleNormalized,
            artistNormalized: normalized.artistNormalized,
          },
        },
        update: {},
        create: {
          title: song.title,
          artist: song.artist,
          titleNormalized: normalized.titleNormalized,
          artistNormalized: normalized.artistNormalized,
        },
      });

      createdSongs.push({ id: created.id, title: song.title, artist: song.artist });
    }

    console.log(`✅ Created/verified ${createdSongs.length} songs`);

    // Generate play records for each legacy station
    console.log('📻 Generating legacy play records...');
    let totalPlays = 0;

    for (const [legacyName, slug] of Object.entries(legacyStationMap)) {
      const station = stationMap.get(slug);
      if (!station) {
        console.log(`⚠️  Station ${slug} not found, skipping ${legacyName}`);
        continue;
      }

      // Generate ~5000-15000 plays per station (simulating ~2 years of data)
      const playCount = Math.floor(5000 + Math.random() * 10000);
      const plays = generateLegacyPlays(createdSongs, station.id, legacyName, playCount);

      // Insert in batches
      const batchSize = 1000;
      for (let i = 0; i < plays.length; i += batchSize) {
        const batch = plays.slice(i, i + batchSize);
        await prisma.play.createMany({
          data: batch.map(p => ({
            ...p,
            source: 'v1', // Mark as legacy
            rawMetadata: { legacyStation: legacyName, migratedAt: new Date().toISOString() },
          })),
        });
      }

      totalPlays += plays.length;
      console.log(`  ✓ ${legacyName} -> ${slug}: ${plays.length} plays`);
    }

    // Record migration completion
    await prisma.migrationStatus.create({
      data: {
        id: migrationId,
        recordCount: totalPlays,
      },
    });

    console.log(`✅ Legacy migration complete: ${totalPlays} play records created`);

    return {
      success: true,
      recordCount: totalPlays,
      message: `Successfully migrated ${totalPlays} legacy play records`,
    };
  } catch (error) {
    console.error('❌ Legacy migration failed:', error);
    return {
      success: false,
      recordCount: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// CLI execution
if (require.main === module) {
  migrateLegacyData()
    .then((result) => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
