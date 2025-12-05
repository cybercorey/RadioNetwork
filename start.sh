#!/bin/bash

# RadioNetwork v2 - Quick Start Script
# This script helps you get the application running quickly

set -e

echo "🎵 RadioNetwork v2 - Quick Start"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Navigate to v2 directory
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"
echo ""

# Function to show menu
show_menu() {
    echo "What would you like to do?"
    echo ""
    echo "1) Start Development Environment"
    echo "2) Stop All Services"
    echo "3) View Logs"
    echo "4) Clean & Restart (removes all data)"
    echo "5) Check Service Status"
    echo "6) Run Database Migrations"
    echo "7) Access Database Shell"
    echo "8) Exit"
    echo ""
    read -p "Enter choice [1-8]: " choice
}

# Function to start services
start_services() {
    echo "🚀 Starting services..."
    echo ""
    
    # Stop any existing services
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Start databases first
    echo "📊 Starting databases..."
    docker compose -f docker-compose.dev.yml up -d postgres redis
    
    # Wait for health checks
    echo "⏳ Waiting for databases to be ready..."
    sleep 10
    
    # Start backend
    echo "🔧 Starting backend API..."
    docker compose -f docker-compose.dev.yml up -d api
    
    # Wait for backend
    sleep 5
    
    # Start frontend
    echo "🎨 Starting frontend..."
    docker compose -f docker-compose.dev.yml up -d frontend
    
    echo ""
    echo "✅ All services started!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:4000"
    echo "   Health:    http://localhost:4000/health"
    echo ""
    echo "📊 Database Ports:"
    echo "   PostgreSQL: localhost:5433"
    echo "   Redis:      localhost:6380"
    echo ""
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping all services..."
    docker compose -f docker-compose.dev.yml down
    echo "✅ All services stopped"
}

# Function to view logs
view_logs() {
    echo "Which service logs would you like to view?"
    echo "1) All services"
    echo "2) Backend API"
    echo "3) Frontend"
    echo "4) PostgreSQL"
    echo "5) Redis"
    read -p "Enter choice [1-5]: " log_choice
    
    case $log_choice in
        1) docker compose -f docker-compose.dev.yml logs -f ;;
        2) docker compose -f docker-compose.dev.yml logs -f api ;;
        3) docker compose -f docker-compose.dev.yml logs -f frontend ;;
        4) docker compose -f docker-compose.dev.yml logs -f postgres ;;
        5) docker compose -f docker-compose.dev.yml logs -f redis ;;
        *) echo "Invalid choice" ;;
    esac
}

# Function to clean and restart
clean_restart() {
    read -p "⚠️  This will delete all data. Continue? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        echo "🧹 Cleaning everything..."
        docker compose -f docker-compose.dev.yml down -v
        echo "✅ Cleanup complete"
        echo ""
        start_services
    else
        echo "Cancelled"
    fi
}

# Function to check status
check_status() {
    echo "📊 Service Status:"
    echo ""
    docker compose -f docker-compose.dev.yml ps
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    docker compose -f docker-compose.dev.yml exec api npx prisma migrate deploy
    echo "✅ Migrations complete"
}

# Function to access database
access_db() {
    echo "🗄️  Connecting to database..."
    docker exec -it radionetwork_db_dev psql -U radionetwork -d radionetwork_dev
}

# Main loop
while true; do
    echo ""
    show_menu
    
    case $choice in
        1) start_services ;;
        2) stop_services ;;
        3) view_logs ;;
        4) clean_restart ;;
        5) check_status ;;
        6) run_migrations ;;
        7) access_db ;;
        8) 
            echo "👋 Goodbye!"
            exit 0
            ;;
        *) 
            echo "❌ Invalid choice. Please try again."
            ;;
    esac
done
