# Build Failed - Quick Recovery

## The build didn't complete. Let's fix it!

Run these commands on your VPS:

```bash
# 1. Check if build failed
sudo docker-compose -f docker-compose.prod.yml logs

# 2. Clean up any partial builds
sudo docker-compose -f docker-compose.prod.yml down
sudo docker system prune -f

# 3. Check if you have enough disk space
df -h
# You need at least 5GB free

# 4. Check if Docker is running
sudo systemctl status docker

# 5. Start Docker if needed
sudo systemctl start docker

# 6. Try building again WITHOUT --build flag first
sudo docker-compose -f docker-compose.prod.yml up -d

# 7. Check status
sudo docker-compose -f docker-compose.prod.yml ps

# 8. If containers are running, check logs
sudo docker-compose -f docker-compose.prod.yml logs -f
```

---

## If Step 6 Fails

The issue might be that the images need to be built. Try this:

```bash
# Build each service separately to see which one fails
sudo docker-compose -f docker-compose.prod.yml build api
sudo docker-compose -f docker-compose.prod.yml build admin-web
sudo docker-compose -f docker-compose.prod.yml build tenant-web

# Then start all services
sudo docker-compose -f docker-compose.prod.yml up -d
```

---

## Common Issues:

### Issue 1: Out of Disk Space
```bash
# Check disk space
df -h

# Clean up Docker
sudo docker system prune -a -f
sudo docker volume prune -f
```

### Issue 2: Out of Memory
```bash
# Check memory
free -h

# If low memory, build one at a time:
sudo docker-compose -f docker-compose.prod.yml up -d postgres redis minio
sleep 10
sudo docker-compose -f docker-compose.prod.yml up -d api
sleep 30
sudo docker-compose -f docker-compose.prod.yml up -d admin-web tenant-web
```

### Issue 3: Docker Not Running
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Issue 4: Permission Issues
```bash
# Make sure you're using sudo
sudo docker-compose -f docker-compose.prod.yml up -d
```

---

## Alternative: Use Pre-built Images (If Build Keeps Failing)

If building on the VPS keeps failing due to low resources, you can:

1. Build images on your local machine
2. Push to Docker Hub
3. Pull on VPS

But first, try the simpler approach above!

---

## Check What Went Wrong

```bash
# See detailed logs
sudo docker-compose -f docker-compose.prod.yml logs api
sudo docker-compose -f docker-compose.prod.yml logs admin-web
sudo docker-compose -f docker-compose.prod.yml logs tenant-web

# Check Docker daemon logs
sudo journalctl -u docker --no-pager --since "10 minutes ago"
```

---

## Quick Test: Start Just the Database Services

To verify Docker is working:

```bash
# Start only postgres, redis, minio (no build needed)
sudo docker-compose -f docker-compose.prod.yml up -d postgres redis minio

# Check if they're running
sudo docker-compose -f docker-compose.prod.yml ps

# If these work, the issue is with building the app containers
```

---

## After You Get Containers Running

Once `docker-compose ps` shows containers with "Up" status:

```bash
# Wait for services to initialize
sleep 30

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test
curl -I http://46.8.176.171
```
