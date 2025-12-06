import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

// Cache configuration for different endpoints
const CACHE_CONFIG: Record<string, { duration: number; staleWhileRevalidate?: number }> = {
  '/stations': { duration: 300, staleWhileRevalidate: 600 }, // 5 min cache, 10 min stale
  '/stations/[slug]/current': { duration: 10, staleWhileRevalidate: 30 }, // 10s cache, 30s stale
  '/plays/recent': { duration: 30, staleWhileRevalidate: 60 }, // 30s cache, 1 min stale
  '/plays/stats': { duration: 60, staleWhileRevalidate: 120 }, // 1 min cache, 2 min stale
  '/analytics/dashboard': { duration: 120, staleWhileRevalidate: 300 }, // 2 min cache, 5 min stale
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

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
