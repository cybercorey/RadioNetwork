export interface Song {
  id: number;
  title: string;
  artist: string;
  titleNormalized: string;
  artistNormalized: string;
  duration?: number;
  isNonSong: boolean;
  nonSongType?: string | null; // 'show', 'commercial', 'station-id', 'weather', 'news', 'other'
  createdAt: string;
  playCount?: number;
}
