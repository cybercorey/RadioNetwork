import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

// Cache configuration for different endpoints
const CACHE_CONFIG: Record<string, { duration: number; staleWhileRevalidate?: number }> = {
  '/stations': { duration: 300, staleWhileRevalidate: 600 }, // 5 min cache, 10 min stale
  '/stations/[slug]/current': { duration: 10, staleWhileRevalidate: 30 }, // 10s cache, 30s stale
  '/stations/compare/stats': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/stations/compare/overlap': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/stations/compare/unique': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/stations/compare/timeline': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/plays/recent': { duration: 30, staleWhileRevalidate: 60 }, // 30s cache, 1 min stale
  '/plays/stats': { duration: 60, staleWhileRevalidate: 120 }, // 1 min cache, 2 min stale
  '/analytics/dashboard': { duration: 120, staleWhileRevalidate: 300 }, // 2 min cache, 5 min stale
  '/analytics/song-momentum': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/analytics/cross-station': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/analytics/genre-evolution': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/playlists/trending': { duration: 300, staleWhileRevalidate: 600 }, // 5 min cache, 10 min stale
  '/playlists/weekly-top': { duration: 3600, staleWhileRevalidate: 7200 }, // 1 hour cache, 2 hour stale
  '/playlists/discover': { duration: 300, staleWhileRevalidate: 600 }, // 5 min cache, 10 min stale
  '/playlists/throwback': { duration: 3600, staleWhileRevalidate: 7200 }, // 1 hour cache, 2 hour stale
  '/search/filters/values': { duration: 600, staleWhileRevalidate: 1200 }, // 10 min cache, 20 min stale
  '/search/autocomplete': { duration: 30, staleWhileRevalidate: 60 }, // 30s cache, 1 min stale
  '/search/advanced': { duration: 60, staleWhileRevalidate: 120 }, // 1 min cache, 2 min stale
};

function getCacheConfig(path: string) {
  // Check exact match
  if (CACHE_CONFIG[path]) {
    return CACHE_CONFIG[path];
  }

  // Check pattern match (e.g., /stations/the-rock/current)
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (pattern.includes('[slug]')) {
      const regex = new RegExp('^' + pattern.replace('[slug]', '[^/]+') + '$');
      if (regex.test(path)) {
        return config;
      }
    }
  }

  // Default: short cache for dynamic content
  return { duration: 10, staleWhileRevalidate: 30 };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add a timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Get cache config for this endpoint
    const cacheConfig = getCacheConfig(`/${path}`);

    // Create response with CDN caching headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        // Cache-Control for CDN and browser caching
        'Cache-Control': `public, s-maxage=${cacheConfig.duration}, stale-while-revalidate=${cacheConfig.staleWhileRevalidate || cacheConfig.duration * 2}`,
        // Vercel-specific header to enable edge caching
        'CDN-Cache-Control': `public, s-maxage=${cacheConfig.duration}`,
        // Add CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');
    const body = await request.text();
    const url = `${BACKEND_URL}/api/${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to post to backend' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy POST error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');
    const body = await request.text();
    const url = `${BACKEND_URL}/api/${path}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to patch backend' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy PATCH error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');
    const url = `${BACKEND_URL}/api/${path}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy DELETE error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
