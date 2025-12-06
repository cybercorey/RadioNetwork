#!/bin/bash
set -e

echo "🚀 Deploying RadioNetwork Backend to Home Server"
echo "================================================"

# Check if .env file exists
if [ ! -f .env.backend ]; then
    echo "❌ Error: .env.backend file not found!"
    echo "📝 Please copy .env.backend.example to .env.backend and configure it"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.backend | xargs)

echo "✅ Environment variables loaded"

# Pull latest code (if in git repo)
if [ -d .git ]; then
    echo "📥 Pulling latest code..."
    git pull origin v2
fi

# Pull latest Docker image from GitHub Container Registry
echo "🐳 Pulling latest Docker image from GitHub Container Registry..."
docker pull ghcr.io/cybercorey/radionetwork/backend:latest || echo "⚠️  Could not pull image, will build locally"

# Start containers (will use pulled image or build if pull failed)
echo "🚀 Starting containers..."
docker compose -f docker-compose.backend.yml --env-file .env.backend up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
docker exec radionetwork_api npx prisma migrate deploy

# Seed database if needed (optional - comment out if already seeded)
# echo "🌱 Seeding database..."
# docker exec radionetwork_api npm run prisma:seed

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.backend.yml ps
echo ""
echo "📝 View logs with:"
echo "   docker compose -f docker-compose.backend.yml logs -f"
echo ""
echo "🔍 Health check:"
echo "   curl http://localhost:4000/health"
echo ""
echo "🌐 API should be available at: https://${API_DOMAIN}"
