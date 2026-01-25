#!/bin/bash

echo "🔍 Checking Local Backend Setup..."
echo ""

# Check Docker
echo "1. Checking Docker..."
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo "   ✅ Docker is running"
    else
        echo "   ❌ Docker is not running. Start Docker Desktop."
        exit 1
    fi
else
    echo "   ❌ Docker is not installed"
    exit 1
fi

# Check database
echo ""
echo "2. Checking PostgreSQL database..."
if docker ps | grep -q darital-postgres; then
    echo "   ✅ PostgreSQL container is running"
    if docker exec darital-postgres pg_isready -U postgres &> /dev/null; then
        echo "   ✅ Database is ready"
    else
        echo "   ⚠️  Database container exists but not ready yet"
    fi
else
    echo "   ❌ PostgreSQL container is not running"
    echo "   💡 Run: docker compose up -d postgres"
fi

# Check .env file
echo ""
echo "3. Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    if grep -q "DATABASE_URL=" .env; then
        echo "   ✅ DATABASE_URL is set"
    else
        echo "   ❌ DATABASE_URL is missing in .env"
    fi
    
    if grep -q "JWT_SECRET=" .env; then
        echo "   ✅ JWT_SECRET is set"
    else
        echo "   ❌ JWT_SECRET is missing in .env"
    fi
else
    echo "   ❌ .env file not found"
    echo "   💡 Create .env file from env.example"
fi

# Check node_modules
echo ""
echo "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
else
    echo "   ❌ node_modules not found"
    echo "   💡 Run: pnpm install"
fi

# Check Prisma
echo ""
echo "5. Checking Prisma..."
if [ -d "node_modules/.prisma" ] || [ -d "node_modules/@prisma/client" ]; then
    echo "   ✅ Prisma client is generated"
else
    echo "   ❌ Prisma client not generated"
    echo "   💡 Run: pnpm prisma:generate"
fi

# Check port
echo ""
echo "6. Checking port availability..."
PORT=${PORT:-3001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ⚠️  Port $PORT is already in use"
    echo "   💡 Kill the process or use different PORT"
else
    echo "   ✅ Port $PORT is available"
fi

echo ""
echo "📋 Quick Start Commands:"
echo "   1. Start database: docker compose up -d postgres"
echo "   2. Install deps: pnpm install"
echo "   3. Generate Prisma: pnpm prisma:generate"
echo "   4. Run migrations: pnpm prisma:migrate"
echo "   5. Start backend: pnpm dev"
echo ""
