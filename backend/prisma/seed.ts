import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stations = [
  // NZME Stations - Use Rova scraping
  {
    name: 'ZM',
    slug: 'zm',
    streamUrl: 'http://ais-nzme.streamguys1.com/nz_002/playlist.m3u8',
    homepageUrl: 'https://www.zmonline.com',
    countryCode: 'NZ',
    tags: ['Top 40', 'Pop', 'Hit Music'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy' // NZME stations don't support Rova currently
  },
  {
    name: 'The Edge',
    slug: 'the-edge',
    streamUrl: 'http://ais-nzme.streamguys1.com/nz_011/playlist.m3u8',
    homepageUrl: 'https://www.theedge.co.nz',
    countryCode: 'NZ',
    tags: ['Rock', 'Alternative', 'Hit Music'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'rova'
  },
  {
    name: 'Radio Hauraki',
    slug: 'radio-hauraki',
    streamUrl: 'http://ais-nzme.streamguys1.com/nz_009/playlist.m3u8',
    homepageUrl: 'https://www.hauraki.co.nz',
    countryCode: 'NZ',
    tags: ['Rock', 'Classic Rock', 'Alternative'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'Newstalk ZB',
    slug: 'newstalk-zb',
    streamUrl: 'http://ais-nzme.streamguys1.com/nz_008/playlist.m3u8',
    homepageUrl: 'https://www.newstalkzb.co.nz',
    countryCode: 'NZ',
    tags: ['News', 'Talk', 'Current Affairs'],
    isActive: true,
    scrapeInterval: 120,
    metadataType: 'icy'
  },
  {
    name: 'Coast',
    slug: 'coast',
    streamUrl: 'http://ais-nzme.streamguys1.com/nz_003/playlist.m3u8',
    homepageUrl: 'https://www.coast.co.nz',
    countryCode: 'NZ',
    tags: ['Easy Listening', 'Adult Contemporary', 'Classic Hits'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  // MediaWorks Stations - Use Rova scraping
  {
    name: 'The Rock',
    slug: 'the-rock',
    streamUrl: 'http://mediaworks-nz.streamguys1.com/nz_005/playlist.m3u8',
    homepageUrl: 'https://www.therock.net.nz',
    countryCode: 'NZ',
    tags: ['Rock', 'Classic Rock', 'Hard Rock'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'rova'
  },
  {
    name: 'The Breeze',
    slug: 'the-breeze',
    streamUrl: 'http://mediaworks-nz.streamguys1.com/nz_006/playlist.m3u8',
    homepageUrl: 'https://www.thebreeze.co.nz',
    countryCode: 'NZ',
    tags: ['Easy Listening', 'Soft Rock', 'Adult Contemporary'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'rova'
  },
  {
    name: 'More FM',
    slug: 'more-fm',
    streamUrl: 'http://mediaworks-nz.streamguys1.com/nz_008/playlist.m3u8',
    homepageUrl: 'https://www.morefm.co.nz',
    countryCode: 'NZ',
    tags: ['Classic Hits', '80s', '90s', '00s'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'rova'
  },
  {
    name: 'Mai FM',
    slug: 'mai-fm',
    streamUrl: 'http://mediaworks-nz.streamguys1.com/nz_013/playlist.m3u8',
    homepageUrl: 'https://www.maifm.co.nz',
    countryCode: 'NZ',
    tags: ['Hip Hop', 'R&B', 'Urban', 'Pacific'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'rova'
  },
  {
    name: 'George FM',
    slug: 'george-fm',
    streamUrl: 'http://mediaworks-nz.streamguys1.com/nz_012/playlist.m3u8',
    homepageUrl: 'https://www.georgefm.co.nz',
    countryCode: 'NZ',
    tags: ['Electronic', 'Dance', 'House', 'EDM'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'rova'
  },
  // SomaFM Stations - Use ICY metadata
  {
    name: 'SomaFM Groove Salad',
    slug: 'soma-groove-salad',
    streamUrl: 'http://ice1.somafm.com/groovesalad-128-mp3',
    homepageUrl: 'https://somafm.com',
    countryCode: 'US',
    tags: ['Ambient', 'Downtempo', 'Chillout'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'SomaFM Drone Zone',
    slug: 'soma-drone-zone',
    streamUrl: 'http://ice1.somafm.com/dronezone-128-mp3',
    homepageUrl: 'https://somafm.com',
    countryCode: 'US',
    tags: ['Ambient', 'Drone', 'Space Music'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'SomaFM Secret Agent',
    slug: 'soma-secret-agent',
    streamUrl: 'http://ice1.somafm.com/secretagent-128-mp3',
    homepageUrl: 'https://somafm.com',
    countryCode: 'US',
    tags: ['Lounge', 'Spy Jazz', 'Downtempo'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  }
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const station of stations) {
    const result = await prisma.station.upsert({
      where: { slug: station.slug },
      update: station,
      create: station,
    });
    console.log(`✓ Created/Updated: ${result.name}`);
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
