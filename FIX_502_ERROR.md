# Fix 502 Bad Gateway Error

## 502 means nginx is working but can't reach your containers

Run these commands to diagnose:

```bash
# 1. Check if containers are actually running
sudo docker-compose -f docker-compose.prod.yml ps
```

**What to look for:**
- All containers should show "Up"
- If any show "Exit" or "Restarting", that's the problem

---

## If containers are NOT running:

```bash
# Check what went wrong
sudo docker-compose -f docker-compose.prod.yml logs tenant-web
sudo docker-compose -f docker-compose.prod.yml logs admin-web
sudo docker-compose -f docker-compose.prod.yml logs api

# Try starting them
sudo docker-compose -f docker-compose.prod.yml up -d
```

---

## If containers ARE running:

```bash
# 2. Check if they're listening on the right ports
sudo ss -tulpn | grep -E ':(3000|3001|3002|9000)'
```

**What to look for:**
- Should see docker-proxy on 127.0.0.1:3000, 3001, 3002, 9000
- If you don't see these, the containers aren't exposing ports correctly

---

## If ports are NOT showing:

Your docker-compose.prod.yml might not have the port mappings. Let's check:

```bash
# Check the file
cat ~/darital/docker-compose.prod.yml | grep -A 2 "ports:"
```

**Should see:**
```
ports:
  - "127.0.0.1:3000:3000"
ports:
  - "127.0.0.1:3001:3001"
ports:
  - "127.0.0.1:3002:3002"
ports:
  - "127.0.0.1:9000:9000"
```

If you DON'T see these, the file wasn't updated. Run:

```bash
cd ~/darital
git pull origin main
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml up -d
```

---

## If ports ARE showing correctly:

```bash
# 3. Test if containers respond directly
curl http://localhost:3002
curl http://localhost:3001/api/health
curl http://localhost:3000
```

**What to look for:**
- Should get HTML or JSON responses
- If you get "Connection refused", containers aren't ready yet

---

## Most Common Fix:

The containers might still be starting up. Wait 60 seconds and try again:

```bash
# Wait for containers to fully start
sleep 60

# Check status
sudo docker-compose -f docker-compose.prod.yml ps

# Check logs for errors
sudo docker-compose -f docker-compose.prod.yml logs --tail=50

# Try accessing again
curl -I http://46.8.176.171
```

---

## Quick Diagnostic Script:

Run this all at once:

```bash
echo "=== Container Status ==="
sudo docker-compose -f docker-compose.prod.yml ps

echo -e "\n=== Port Bindings ==="
sudo ss -tulpn | grep -E ':(3000|3001|3002|9000)'

echo -e "\n=== Test Localhost Connections ==="
curl -s -o /dev/null -w "Tenant (3002): %{http_code}\n" http://localhost:3002
curl -s -o /dev/null -w "API (3001): %{http_code}\n" http://localhost:3001/api/health
curl -s -o /dev/null -w "Admin (3000): %{http_code}\n" http://localhost:3000

echo -e "\n=== Nginx Status ==="
sudo systemctl status nginx --no-pager | grep Active

echo -e "\n=== Recent Container Logs ==="
sudo docker-compose -f docker-compose.prod.yml logs --tail=20 tenant-web
```

---

## After Running Diagnostic:

**Tell me:**
1. What does `docker-compose ps` show? (Are all containers "Up"?)
2. What does the port check show? (Are ports 3000, 3001, 3002 listening?)
3. What do the localhost curl tests return? (200, 000, or connection refused?)
4. What do the container logs show? (Any errors?)

Based on your answers, I'll tell you exactly what to fix.
