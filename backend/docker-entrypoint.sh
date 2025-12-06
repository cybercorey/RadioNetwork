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

# Check if database schema exists
echo "🔍 Checking database schema..."
TABLES_EXIST=$(PGPASSWORD=${DATABASE_URL#*://*/} psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stations';" 2>/dev/null || echo "0")

if [ "$TABLES_EXIST" = "0" ] || [ -z "$TABLES_EXIST" ]; then
  echo "⚠️  Database schema not found. Attempting to create using Prisma..."

  # Try to push the schema directly (this creates tables without migration history)
  echo "📦 Running prisma db push..."
  npx prisma db push --accept-data-loss --skip-generate || {
    echo "❌ Prisma db push failed, trying migrate deploy..."
    npx prisma migrate deploy || {
      echo "❌ Migration failed. Database may need manual initialization."
      exit 1
    }
  }
else
  echo "✅ Database schema exists, running migrations..."
  npx prisma migrate deploy || {
    echo "⚠️  Migration failed, but continuing startup..."
  }
fi

echo "✅ Database initialization complete!"

# Start the application
echo "🎵 Starting application..."
exec "$@"
