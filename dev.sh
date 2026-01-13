#!/bin/bash

# Development startup script for Essay Grading Platform

echo "🚀 Starting Essay Grading Platform..."
echo ""

# Check if running from project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env not found"
    echo "   Copy backend/.env.example to backend/.env and configure it"
    echo ""
fi

# Check if database exists
echo "🗄️  Checking database..."
if psql -lqt | cut -d \| -f 1 | grep -qw essay_grading; then
    echo "✅ Database 'essay_grading' exists"
else
    echo "❌ Database 'essay_grading' not found"
    echo "   Creating database..."
    createdb essay_grading 2>/dev/null || {
        echo "   Failed to create database. Please create it manually:"
        echo "   createdb essay_grading"
        exit 1
    }
    echo "✅ Database created"
    
    echo "📊 Running migrations..."
    cd backend && npm run db:migrate && cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Starting servers..."
echo "  Backend:  http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers in parallel
trap 'kill 0' EXIT

cd backend && npm run dev &
cd frontend && npm run dev &

wait
