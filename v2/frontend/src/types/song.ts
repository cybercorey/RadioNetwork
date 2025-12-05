export interface Song {
  id: number;
  title: string;
  artist: string;
  titleNormalized: string;
  artistNormalized: string;
  duration?: number;
  createdAt: string;
  playCount?: number;
}
