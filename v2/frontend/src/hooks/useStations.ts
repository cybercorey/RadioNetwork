import useSWR from 'swr';
import api from '@/services/api';
import { Station } from '@/types/station';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useStations() {
  const { data, error, isLoading, mutate } = useSWR<Station[]>('/stations', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  return {
    stations: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useStation(slug: string) {
  const { data, error, isLoading, mutate } = useSWR<Station>(
    slug ? `/stations/${slug}` : null,
    fetcher
  );

  return {
    station: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useCurrentSong(slug: string) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/stations/${slug}/current` : null,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
}
