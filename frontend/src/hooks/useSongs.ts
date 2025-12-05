import useSWR from 'swr';
import api from '@/services/api';
import { Song } from '@/types/song';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useSongs(limit = 100, offset = 0) {
  const { data, error, isLoading, mutate } = useSWR(
    `/songs?limit=${limit}&offset=${offset}`,
    fetcher
  );

  return {
    songs: data?.songs || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTopSongs(limit = 100, stationId?: number) {
  const url = stationId 
    ? `/songs/top?limit=${limit}&stationId=${stationId}`
    : `/songs/top?limit=${limit}`;

  const { data, error, isLoading, mutate } = useSWR<Song[]>(url, fetcher);

  return {
    songs: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}
