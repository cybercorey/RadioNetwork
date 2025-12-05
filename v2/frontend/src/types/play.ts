import { Song } from './song';
import { Station } from './station';

export interface Play {
  id: number;
  stationId: number;
  songId: number;
  playedAt: string;
  rawMetadata?: any;
  confidenceScore?: number;
  createdAt: string;
  song?: Song;
  station?: Station;
}
