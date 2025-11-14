# 🚀 Darital Final

A modern, production-ready monorepo built with **pnpm** + **Turborepo** featuring:
- 🔥 **NestJS API** (TypeScript)
- ⚡ **Next.js Admin Web** (App Router + Tailwind CSS + TypeScript)
- 📱 **Expo Mobile** (React Native + TypeScript)

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Infrastructure](#docker-infrastructure)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Application Ports](#application-ports)
- [Development Workflow](#development-workflow)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 10.19.0 (Install: `corepack enable && corepack install -g pnpm@latest`)
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/get-started))
- **Expo CLI** (Install: `npm install -g expo-cli`) - For mobile development
- **iOS Simulator** (macOS only) or **Android Studio** (for mobile testing)

---

## 🐳 Docker Infrastructure

The project includes a complete Docker setup for local development with PostgreSQL, Redis, MinIO, and MailHog.

### Services

| Service | Version | Ports | Description |
|---------|---------|-------|-------------|
| **PostgreSQL** | 16-alpine | 5432 | Primary database with healthcheck |
| **Redis** | 7-alpine | 6379 | Cache & session store |
| **MinIO** | latest | 9000 (API), 9001 (Console) | S3-compatible object storage |
| **MailHog** | latest | 1025 (SMTP), 8025 (UI) | Email testing tool |

### Quick Start

**1. Create environment file:**
```bash
cp env.example .env
# Edit .env with your preferred credentials
```

**2. Start all services:**
```bash
pnpm infra:up
# or: docker compose up -d
```

**3. Check services status:**
```bash
pnpm infra:ps
# or: docker compose ps
```

**4. View logs:**
```bash
pnpm infra:logs
# or: docker compose logs -f --tail=100
```

**5. Stop and remove volumes (⚠️ deletes all data):**
```bash
pnpm infra:down
# or: docker compose down -v
```

### Service URLs

- **PostgreSQL**: `localhost:5432`
  - Database: `darital`
  - User: `postgres` (configurable in `.env`)
  - Connection string: `postgresql://postgres:postgres@localhost:5432/darital`

- **Redis**: `localhost:6379`
  - Connection string: `redis://localhost:6379`

- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin` (configurable in `.env`)
  - Password: `minioadmin` (configurable in `.env`)
  - API Endpoint: `localhost:9000`

- **MailHog UI**: http://localhost:8025
  - SMTP Server: `localhost:1025`
  - All emails sent to port 1025 appear in the web UI

### MinIO Bucket Setup

To create a bucket for file storage (e.g., contracts):

1. **Open MinIO Console**: Navigate to http://localhost:9001
2. **Login**: Use credentials from your `.env` file (default: `minioadmin` / `minioadmin`)
3. **Create Bucket**:
   - Click **"Buckets"** in the left sidebar
   - Click **"Create Bucket"** button
   - Enter bucket name: `contracts`
   - Click **"Create Bucket"**
4. **Configure Access**:
   - Click on the newly created `contracts` bucket
   - Go to **"Access"** or **"Summary"** tab
   - Set **Access Policy** to **"Private"** (default)
   - Private buckets require presigned URLs for temporary access
   - Your application will generate presigned URLs programmatically for secure file access

> **Note**: Private buckets are recommended for production. Presigned URLs allow temporary, secure access to specific objects without making the entire bucket public.

### Health Checks

Check service health:
```bash
# All services
docker compose ps

# PostgreSQL health
docker compose exec postgres pg_isready -U postgres -d darital

# Redis health
docker compose exec redis redis-cli ping
```

### NPM Scripts

The project includes convenient npm scripts for managing infrastructure:

```bash
# Start all services in detached mode
pnpm infra:up

# Stop all services and remove volumes (⚠️ deletes data)
pnpm infra:down

# View logs from all services (last 100 lines, follows)
pnpm infra:logs

# Check status of all services
pnpm infra:ps
```

### Useful Commands

```bash
# View logs for specific service
docker compose logs -f postgres

# Restart a service
docker compose restart postgres

# Stop services without removing volumes (preserves data)
docker compose down

# Access PostgreSQL CLI
docker compose exec postgres psql -U postgres -d darital

# Access Redis CLI
docker compose exec redis redis-cli

# Create a database backup
docker compose exec postgres pg_dump -U postgres darital > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U postgres darital < backup.sql
```

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=darital

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

---

## 📁 Project Structure

```
Darital Final/
├── apps/
│   ├── api/                    # NestJS Backend API
│   │   ├── src/
│   │   │   ├── main.ts         # Entry point
│   │   │   ├── app.module.ts   # Root module
│   │   │   ├── app.controller.ts
│   │   │   └── app.service.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   │
│   ├── admin-web/              # Next.js Admin Dashboard
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── layout.tsx  # Root layout
│   │   │       ├── page.tsx    # Home page
│   │   │       └── globals.css
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   └── mobile/                 # Expo React Native App
│       ├── App.tsx             # Main app component
│       ├── assets/             # Images, fonts, etc.
│       ├── package.json
│       ├── app.json            # Expo configuration
│       ├── babel.config.js
│       └── tsconfig.json
│
├── package.json                # Root package.json with workspace config
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── turbo.json                  # Turborepo pipeline configuration
└── README.md                   # This file
```

---

## 🚀 Quick Start

### 1. Install pnpm (if not already installed)

   ```bash
   npm install -g pnpm
   ```

### 2. Clone and navigate to the project

```bash
cd "Darital Final"
```

### 3. Install all dependencies

   ```bash
   pnpm install
   ```

This will install dependencies for all apps in the monorepo.

### 4. Run all applications in development mode

```bash
pnpm dev
```

This single command will start all three applications simultaneously:
- ✅ API running on `http://localhost:3001`
- ✅ Admin Web running on `http://localhost:3000`
- ✅ Mobile app on Expo (scan QR code with Expo Go app)

---

## 📜 Available Scripts

Run these commands from the **root directory**:

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies across the monorepo |
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Lint all apps |
| `pnpm test` | Run tests across all apps |
| `pnpm clean` | Clean all build artifacts and node_modules |

### Individual App Scripts

Navigate to specific app directories to run individual commands:

**API (`apps/api`):**
```bash
cd apps/api
pnpm dev          # Start API in watch mode
pnpm build        # Build API
pnpm start        # Start production build
pnpm test         # Run tests
```

**Admin Web (`apps/admin-web`):**
```bash
cd apps/admin-web
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

**Mobile (`apps/mobile`):**
```bash
cd apps/mobile
pnpm dev          # Start Expo dev server
pnpm android      # Open on Android emulator
pnpm ios          # Open on iOS simulator (macOS only)
pnpm web          # Open in web browser
```

---

## 🌐 Application Ports

| Application | Port | URL |
|-------------|------|-----|
| **NestJS API** | 3001 | http://localhost:3001 |
| **Next.js Admin** | 3000 | http://localhost:3000 |
| **Expo Mobile** | 8081 | Expo Dev Server |

### API Endpoints

- `GET http://localhost:3001/` - Hello message
- `GET http://localhost:3001/health` - Health check endpoint

---

## 💻 Development Workflow

### Starting Development

1. **Start all apps at once:**
   ```bash
   pnpm dev
   ```

2. **Or start individual apps:**
   ```bash
   # Terminal 1 - API
   cd apps/api && pnpm dev
   
   # Terminal 2 - Admin Web
   cd apps/admin-web && pnpm dev
   
   # Terminal 3 - Mobile
   cd apps/mobile && pnpm dev
   ```

### Testing Mobile App

1. **iOS (macOS only):**
   ```bash
   cd apps/mobile
   pnpm ios
   ```

2. **Android:**
   ```bash
   cd apps/mobile
   pnpm android
   ```

3. **Physical Device:**
   - Install **Expo Go** app from App Store / Play Store
   - Scan the QR code displayed in terminal
   - Ensure your device is on the same network

---

## 🏗️ Building for Production

### Build All Apps

```bash
pnpm build
```

### Build Individual Apps

**API:**
```bash
cd apps/api
pnpm build
pnpm start:prod  # Run production build
```

**Admin Web:**
```bash
cd apps/admin-web
pnpm build
pnpm start       # Serve production build
```

**Mobile:**
```bash
cd apps/mobile
pnpm build       # Export static assets
```

For native mobile builds, use EAS Build:
```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
```

---

## 🧪 Testing

Run tests across all apps:

```bash
pnpm test
```

Or test individual apps:

```bash
# API tests
cd apps/api && pnpm test

# Admin Web tests
cd apps/admin-web && pnpm test

# Mobile tests
cd apps/mobile && pnpm test
```

---

## 🐛 Troubleshooting

### Port Already in Use

If you see port conflicts:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### pnpm Install Fails

1. Clear pnpm cache:
   ```bash
   pnpm store prune
   ```

2. Remove lock file and reinstall:
   ```bash
   rm pnpm-lock.yaml
   pnpm install
   ```

### Turbo Cache Issues

Clear Turbo cache:
```bash
pnpm turbo clean
rm -rf .turbo
```

### Expo Metro Bundler Issues

Reset Metro cache:
```bash
cd apps/mobile
expo start -c  # Clear cache
```

### TypeScript Errors

Rebuild TypeScript:
```bash
pnpm build
```

---

## 📦 Technologies Used

### Backend (API)
- **NestJS** ^10.4.15 - Progressive Node.js framework
- **TypeScript** ^5.7.2 - Type safety
- **Express** ^5.0.0 - HTTP server
- **RxJS** ^7.8.1 - Reactive programming

### Frontend (Admin Web)
- **Next.js** ^15.0.3 - React framework with App Router
- **React** ^19.0.0 - UI library
- **Tailwind CSS** ^3.4.15 - Utility-first CSS
- **TypeScript** ^5.7.2 - Type safety

### Mobile
- **Expo** ^52.0.11 - React Native framework
- **React Native** 0.76.5 - Cross-platform mobile
- **TypeScript** ^5.7.2 - Type safety

### DevOps
- **Turborepo** ^2.5.8 - Monorepo build system
- **pnpm** ^10.19.0 - Fast, disk space efficient package manager

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Build: `pnpm build`
6. Submit a pull request

---

## 📄 License

ISC

---

## 👨‍💻 Support

For issues and questions, please create an issue in the repository.

---

**Happy Coding! 🎉**
