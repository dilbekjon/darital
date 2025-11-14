# Darital Deployment Guide

## Architecture

The Darital application is split into separate domains for security and better organization:

### Development URLs:
- **API Backend**: `http://localhost:3001/api`
- **Admin Panel**: `http://localhost:3000`
- **Tenant Portal**: `http://localhost:3002`
- **Mobile App**: Expo (port 8081)

### Production Deployment

For production, deploy to separate domains:

```
# Example production setup
API Backend:      https://api.yourdomain.com
Admin Panel:      https://admin.yourdomain.com
Tenant Portal:    https://portal.yourdomain.com (or https://yourdomain.com)
```

## Environment Variables

### API (`apps/api/.env`)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/darital

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# CORS - Update with your production domains
CORS_ORIGINS=https://admin.yourdomain.com,https://portal.yourdomain.com
```

### Admin Panel (`apps/admin-web/.env.local`)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Tenant Portal (`apps/tenant-web/.env.local`)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## Starting Services

### Development:
```bash
# Start all services (API + Admin + Tenant Portal + Mobile)
./start-all.sh

# Or start individually:
./start-tenant.sh  # Tenant portal only
```

### Production:

1. **API Backend** (NestJS):
```bash
cd apps/api
pnpm run build
pnpm run start:prod
```

2. **Admin Panel** (Next.js):
```bash
cd apps/admin-web
pnpm run build
pnpm run start
```

3. **Tenant Portal** (Next.js):
```bash
cd apps/tenant-web
pnpm run build
pnpm run start
```

## Nginx Configuration Example

```nginx
# API Backend
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Admin Panel
server {
    listen 443 ssl;
    server_name admin.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Tenant Portal
server {
    listen 443 ssl;
    server_name portal.yourdomain.com;  # or yourdomain.com
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## CORS Configuration

Update `apps/api/src/main.ts` with your production domains:

```typescript
app.enableCors({
  origin: [
    'https://admin.yourdomain.com',
    'https://portal.yourdomain.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

## Security Checklist

- [ ] Update JWT_SECRET to a strong random value
- [ ] Set secure CORS origins for production
- [ ] Enable HTTPS/SSL certificates
- [ ] Update database credentials
- [ ] Configure proper firewall rules
- [ ] Set up environment-specific configs
- [ ] Enable rate limiting
- [ ] Configure proper logging
- [ ] Set up monitoring/alerts

## User Access

- **Admin users** → Login at `https://admin.yourdomain.com`
- **Tenant users** → Login at `https://portal.yourdomain.com`

The login logic automatically redirects users based on their role:
- Admin roles → Admin Panel
- Tenant role → Tenant Portal

