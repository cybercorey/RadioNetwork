import http from 'http';
import https from 'https';
import { URL } from 'url';
import { logger } from '../utils/logger';
import { parseSongMetadata } from '../utils/normalizer';

export interface IcyMetadata {
  title?: string;
  artist?: string;
  raw: string;
}

export async function parseIcyStream(streamUrl: string, timeoutMs = 10000): Promise<IcyMetadata> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(streamUrl);
      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.get(streamUrl, {
        headers: {
          'Icy-MetaData': '1',
          'User-Agent': 'RadioNetwork/2.0',
          'Accept': '*/*'
        },
        timeout: timeoutMs
      }, (res) => {
        const metaint = parseInt(res.headers['icy-metaint'] as string || '0');

        if (!metaint || metaint === 0) {
          req.destroy();
          return reject(new Error('Stream does not support ICY metadata'));
        }

        let buffer = Buffer.alloc(0);
        let bytesRead = 0;
        let metadataExtracted = false;

        res.on('data', (chunk: Buffer) => {
          if (metadataExtracted) return;

          buffer = Buffer.concat([buffer, chunk]);
          bytesRead = buffer.length;

          // Read metadata when we hit metaint boundary
          if (bytesRead >= metaint + 1) {
            try {
              const metadataLength = buffer[metaint] * 16;
              
              if (metadataLength === 0) {
                req.destroy();
                return resolve({ raw: '', artist: '', title: '' });
              }

              const metadataStart = metaint + 1;
              const metadataEnd = metadataStart + metadataLength;

              if (buffer.length >= metadataEnd) {
                const metadataBuffer = buffer.slice(metadataStart, metadataEnd);
                const metadata = metadataBuffer.toString('utf8').replace(/\0/g, '').trim();
                const parsed = parseMetadataString(metadata);

                metadataExtracted = true;
                req.destroy();
                resolve(parsed);
              }
            } catch (error) {
              req.destroy();
              reject(error);
            }
          }
        });

        res.on('error', (error) => {
          req.destroy();
          reject(error);
        });

        res.on('end', () => {
          if (!metadataExtracted) {
            reject(new Error('Stream ended before metadata could be extracted'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Stream timeout'));
      });

    } catch (error) {
      reject(error);
    }
  });
}

function parseMetadataString(metadata: string): IcyMetadata {
  // Extract StreamTitle from metadata
  const titleMatch = metadata.match(/StreamTitle='([^']*)'/);
  const raw = titleMatch ? titleMatch[1].trim() : '';

  if (!raw) {
    return { raw: '', artist: '', title: '' };
  }

  // Parse artist and title from raw metadata
  const parsed = parseSongMetadata(raw);

  return {
    raw,
    artist: parsed.artist,
    title: parsed.title
  };
}

/**
 * Test if a stream URL supports ICY metadata
 */
export async function supportsIcyMetadata(streamUrl: string): Promise<boolean> {
  try {
    await parseIcyStream(streamUrl, 5000);
    return true;
  } catch (error) {
    logger.debug(`Stream ${streamUrl} does not support ICY metadata:`, error);
    return false;
  }
}
