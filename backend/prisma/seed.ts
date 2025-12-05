import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stations = [
  {
    name: 'ZM',
    slug: 'zm',
    streamUrl: 'https://ais-nzme.streamguys1.com/nz_002/playlist.m3u8',
    homepageUrl: 'https://www.zmonline.com',
    countryCode: 'NZ',
    tags: ['Top 40', 'Pop', 'Hit Music'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'The Edge',
    slug: 'the-edge',
    streamUrl: 'https://ais-nzme.streamguys1.com/nz_011/playlist.m3u8',
    homepageUrl: 'https://www.theedge.co.nz',
    countryCode: 'NZ',
    tags: ['Rock', 'Alternative', 'Hit Music'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'The Rock',
    slug: 'the-rock',
    streamUrl: 'https://mediaworks-nz.streamguys1.com/nz_005/playlist.m3u8',
    homepageUrl: 'https://www.therock.net.nz',
    countryCode: 'NZ',
    tags: ['Rock', 'Classic Rock', 'Hard Rock'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'More FM',
    slug: 'more-fm',
    streamUrl: 'https://mediaworks-nz.streamguys1.com/nz_008/playlist.m3u8',
    homepageUrl: 'https://www.morefm.co.nz',
    countryCode: 'NZ',
    tags: ['Classic Hits', '80s', '90s', '00s'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'Newstalk ZB',
    slug: 'newstalk-zb',
    streamUrl: 'https://ais-nzme.streamguys1.com/nz_008/playlist.m3u8',
    homepageUrl: 'https://www.newstalkzb.co.nz',
    countryCode: 'NZ',
    tags: ['News', 'Talk', 'Current Affairs'],
    isActive: true,
    scrapeInterval: 120,
    metadataType: 'icy'
  },
  {
    name: 'Radio Hauraki',
    slug: 'radio-hauraki',
    streamUrl: 'https://ais-nzme.streamguys1.com/nz_009/playlist.m3u8',
    homepageUrl: 'https://www.hauraki.co.nz',
    countryCode: 'NZ',
    tags: ['Rock', 'Classic Rock', 'Alternative'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'Coast',
    slug: 'coast',
    streamUrl: 'https://ais-nzme.streamguys1.com/nz_003/playlist.m3u8',
    homepageUrl: 'https://www.coast.co.nz',
    countryCode: 'NZ',
    tags: ['Easy Listening', 'Adult Contemporary', 'Classic Hits'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'The Breeze',
    slug: 'the-breeze',
    streamUrl: 'https://mediaworks-nz.streamguys1.com/nz_006/playlist.m3u8',
    homepageUrl: 'https://www.thebreeze.co.nz',
    countryCode: 'NZ',
    tags: ['Easy Listening', 'Soft Rock', 'Adult Contemporary'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'Mai FM',
    slug: 'mai-fm',
    streamUrl: 'https://mediaworks-nz.streamguys1.com/nz_013/playlist.m3u8',
    homepageUrl: 'https://www.maifm.co.nz',
    countryCode: 'NZ',
    tags: ['Hip Hop', 'R&B', 'Urban', 'Pacific'],
    isActive: true,
    scrapeInterval: 60,
    metadataType: 'icy'
  },
  {
    name: 'George FM',
    slug: 'george-fm',
    streamUrl: 'https://mediaworks-nz.streamguys1.com/nz_012/playlist.m3u8',
    homepageUrl: 'https://www.georgefm.co.nz',
    countryCode: 'NZ',
    tags: ['Electronic', 'Dance', 'House', 'EDM'],
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
