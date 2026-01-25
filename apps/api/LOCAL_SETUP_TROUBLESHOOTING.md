# Local Backend Setup & Troubleshooting Guide

## Quick Start Checklist

### 1. ✅ Check Docker is Running
```bash
docker --version
docker ps
```

If Docker is not running:
- **macOS**: Open Docker Desktop
- **Linux**: `sudo systemctl start docker`
- **Windows**: Start Docker Desktop

### 2. ✅ Start Database
```bash
# From project root
docker compose up -d postgres
```

Wait 10-15 seconds for database to be ready, then verify:
```bash
docker compose ps
# Should show postgres as "healthy"
```

### 3. ✅ Create .env File
Create `apps/api/.env` file with these minimum required variables:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/darital

# JWT Secret (REQUIRED)
JWT_SECRET=your-secret-key-change-this-in-production

# Port (optional, defaults to 3000)
PORT=3001

# MinIO (optional for local dev - uses defaults)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=contracts
```

### 4. ✅ Install Dependencies
```bash
cd apps/api
pnpm install
```

### 5. ✅ Generate Prisma Client
```bash
cd apps/api
pnpm prisma:generate
```

### 6. ✅ Run Migrations
```bash
cd apps/api
pnpm prisma:migrate
```

### 7. ✅ Seed Database (Optional)
```bash
cd apps/api
pnpm seed
```

### 8. ✅ Start Backend
```bash
cd apps/api
pnpm dev
```

## Common Errors & Solutions

### Error: "DATABASE_URL environment variable is not set"

**Solution**: Create `apps/api/.env` file with `DATABASE_URL`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/darital
```

### Error: "Database connection timeout" or "Cannot connect to database"

**Solution**:
1. Check Docker is running: `docker ps`
2. Start database: `docker compose up -d postgres`
3. Wait 10-15 seconds
4. Verify database is healthy: `docker compose ps`
5. Check DATABASE_URL matches docker-compose.yml

### Error: "Port 3001 is already in use"

**Solution**:
1. Find process using port:
   ```bash
   # macOS/Linux
   lsof -i :3001
   # or
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3001
   ```
2. Kill the process or use different port:
   ```bash
   PORT=3002 pnpm dev
   ```

### Error: "Prisma Client not generated"

**Solution**:
```bash
cd apps/api
pnpm prisma:generate
```

### Error: "Table does not exist"

**Solution**: Run migrations:
```bash
cd apps/api
pnpm prisma:migrate
```

### Error: "Cannot find module '@prisma/client'"

**Solution**: Install dependencies:
```bash
cd apps/api
pnpm install
```

## Step-by-Step Setup (First Time)

### 1. Start Docker Services
```bash
# From project root
docker compose up -d
```

This starts:
- PostgreSQL database (port 5432)
- MinIO (port 9000)
- Redis (port 6379)
- MailHog (port 8025 for UI, 1025 for SMTP)

### 2. Create Environment File
```bash
cd apps/api
cp ../env.example .env
```

Edit `.env` and set at minimum:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/darital`
- `JWT_SECRET=your-secret-key-here`

### 3. Setup Database
```bash
cd apps/api

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed database (optional)
pnpm seed
```

### 4. Start Backend
```bash
cd apps/api
pnpm dev
```

You should see:
```
🚀 API SERVER STARTED SUCCESSFULLY
📍 API URL: http://0.0.0.0:3001
📚 Swagger docs: http://0.0.0.0:3001/docs
```

## Verify Everything Works

### 1. Check API Health
```bash
curl http://localhost:3001/api/health
```

Should return: `{"ok":true,"ts":"..."}`

### 2. Check Swagger Docs
Open in browser: `http://localhost:3001/docs`

### 3. Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@darital.local","password":"admin123"}'
```

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens

### Optional (with defaults)
- `PORT` - API port (default: 3000)
- `NODE_ENV` - Environment (default: development)
- `MINIO_ENDPOINT` - MinIO endpoint (default: localhost)
- `MINIO_PORT` - MinIO port (default: 9000)
- `MINIO_ACCESS_KEY` - MinIO access key (default: minioadmin)
- `MINIO_SECRET_KEY` - MinIO secret key (default: minioadmin)
- `MINIO_BUCKET` - MinIO bucket (default: contracts)
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `CORS_ORIGINS` - Allowed CORS origins (default: localhost:3000,3001,3002)

### Optional (features)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_ENABLE` - Enable Telegram (true/false)
- `MAIL_HOST` - SMTP host
- `MAIL_PORT` - SMTP port
- `MAIL_USER` - SMTP username
- `MAIL_PASS` - SMTP password
- `FCM_KEY` - Firebase Cloud Messaging key
- `SENTRY_DSN` - Sentry DSN for error tracking

## Still Not Working?

### Check Logs
The backend provides detailed error messages. Look for:
- Database connection errors
- Port conflicts
- Missing environment variables
- Prisma errors

### Common Issues

1. **Database not ready**: Wait longer after `docker compose up -d postgres`
2. **Wrong DATABASE_URL**: Must match docker-compose.yml settings
3. **Port conflict**: Change PORT in .env or kill existing process
4. **Missing .env**: Create it in `apps/api/.env`
5. **Dependencies not installed**: Run `pnpm install` in `apps/api`

### Get Help

Check the error message - it usually tells you exactly what's wrong:
- "DATABASE_URL is not set" → Create .env file
- "Database connection timeout" → Start Docker and database
- "Port already in use" → Change PORT or kill process
- "Table does not exist" → Run migrations
