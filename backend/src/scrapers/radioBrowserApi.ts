import axios from 'axios';
import { logger } from '../utils/logger';

const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json';

export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  codec: string;
  bitrate: number;
}

/**
 * Search for stations by country code
 */
export async function searchStationsByCountry(countryCode: string): Promise<RadioBrowserStation[]> {
  try {
    const response = await axios.get(`${RADIO_BROWSER_API}/stations/bycountrycodeexact/${countryCode}`, {
      headers: {
        'User-Agent': 'RadioNetwork/2.0'
      }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch stations from Radio Browser:', error);
    return [];
  }
}

/**
 * Search for specific station by name
 */
export async function searchStationByName(name: string, countryCode?: string): Promise<RadioBrowserStation[]> {
  try {
    const params: any = { name };
    if (countryCode) {
      params.countrycode = countryCode;
    }

    const response = await axios.get(`${RADIO_BROWSER_API}/stations/search`, {
      headers: {
        'User-Agent': 'RadioNetwork/2.0'
      },
      params
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to search station:', error);
    return [];
  }
}

/**
 * Get NZ radio stations
 */
export async function getNZStations(): Promise<RadioBrowserStation[]> {
  return searchStationsByCountry('NZ');
}
