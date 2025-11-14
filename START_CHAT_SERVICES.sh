#!/bin/bash

echo "🚀 Starting Darital Chat Services..."
echo ""

# Kill existing processes
echo "1️⃣ Killing existing processes..."
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
pkill -f "nest.js start" 2>/dev/null
sleep 2

# Start backend
echo ""
echo "2️⃣ Starting Backend API (port 3001)..."
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/api"
pnpm run dev > /tmp/darital-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend
echo "   Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api >/dev/null 2>&1; then
        echo "   ✅ Backend running on http://localhost:3001"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "   ⚠️ Backend taking longer than expected"
        echo "   Check logs: tail -f /tmp/darital-backend.log"
    fi
done

# Start frontend
echo ""
echo "3️⃣ Starting Admin Web (port 3000)..."
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/admin-web"
rm -rf .next/cache .next/dev/lock 2>/dev/null
pnpm run dev > /tmp/darital-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend
echo "   Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "   ✅ Frontend running on http://localhost:3000"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "   ⚠️ Frontend taking longer than expected"
        echo "   Check logs: tail -f /tmp/darital-frontend.log"
    fi
done

echo ""
echo "🎉 Services Started!"
echo ""
echo "📍 URLs:"
echo "   Admin Login:  http://localhost:3000/login"
echo "   Admin Chat:   http://localhost:3000/admin/chat"
echo "   Backend API:  http://localhost:3001/api"
echo "   Swagger Docs: http://localhost:3001/docs"
echo ""
echo "👤 Test Credentials:"
echo "   Email:    admin@darital.local"
echo "   Password: admin123"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/darital-backend.log"
echo "   Frontend: tail -f /tmp/darital-frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

