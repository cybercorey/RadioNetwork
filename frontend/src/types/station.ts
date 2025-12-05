export interface Station {
  id: number;
  name: string;
  slug: string;
  streamUrl: string;
  homepageUrl?: string;
  logoUrl?: string;
  countryCode: string;
  tags: string[];
  isActive: boolean;
  scrapeInterval: number;
  lastScrapedAt?: string;
  metadataType: string;
  createdAt: string;
  updatedAt: string;
}
