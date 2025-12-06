/**
 * CORS Configuration
 * Handles multiple origins from environment variable (comma-separated)
 * Supports wildcard patterns for Vercel preview deployments
 */

export function getCorsOrigins(): string | string[] | RegExp | (string | RegExp)[] {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (!corsOrigin) {
    return 'http://localhost:3000';
  }

  // Split by comma and trim whitespace
  const origins = corsOrigin.split(',').map(origin => origin.trim());

  // Convert wildcard patterns to RegExp
  const processedOrigins: (string | RegExp)[] = origins.map(origin => {
    if (origin.includes('*')) {
      // Convert wildcard to regex pattern
      // Example: https://radionetwork-*.vercel.app -> /^https:\/\/radionetwork-.*\.vercel\.app$/
      const pattern = origin
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`);
    }
    return origin;
  });

  return processedOrigins;
}

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getCorsOrigins();

    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (Array.isArray(allowedOrigins)) {
      const isAllowed = allowedOrigins.some((allowed: string | RegExp) => {
        if (typeof allowed === 'object' && 'test' in allowed) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else if (allowedOrigins instanceof RegExp) {
      if (allowedOrigins.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Single origin string
      if (allowedOrigins === origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
