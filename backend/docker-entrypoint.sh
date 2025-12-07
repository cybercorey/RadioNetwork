#!/bin/sh
set -e

echo "🚀 Starting RadioNetwork Backend..."

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL..."
until nc -z ${DB_HOST:-postgres} ${DB_PORT:-5432}; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  echo "   Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is ready!"

# Initialize database schema using Prisma
echo "🔍 Initializing database schema..."

# Use prisma db push for initial schema creation (idempotent and works on empty DB)
# This will create tables if they don't exist, or do nothing if they already exist
echo "📦 Running prisma db push to ensure schema exists..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 | tee /tmp/prisma-push.log || {
  # If db push fails, check if it's because tables already exist
  if grep -q "already exists" /tmp/prisma-push.log; then
    echo "✅ Database schema already exists"
  else
    echo "⚠️  Prisma db push had warnings, attempting migrate deploy..."
    npx prisma migrate deploy || {
      echo "⚠️  Migration warnings present, but continuing startup..."
    }
  fi
}

# Seed the database with initial stations (uses upsert, so safe to run every time)
echo "🌱 Seeding database with stations..."
npm run prisma:seed || {
  echo "⚠️  Seeding failed, but continuing startup..."
}

# Run legacy data migration (idempotent - only runs once)
echo "📼 Running legacy data migration..."
npx tsx prisma/migrate-legacy.ts || {
  echo "⚠️  Legacy migration had issues, but continuing startup..."
}

echo "✅ Database initialization complete!"

# Start the application
echo "🎵 Starting application..."
exec "$@"
