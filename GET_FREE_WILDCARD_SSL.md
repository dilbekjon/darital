# Get FREE Wildcard SSL Certificate - DNS Challenge

## This method works 100% - No firewall issues!

---

## STEP 1: Run DNS Challenge on VPS

```bash
# On your VPS
sudo certbot certonly --manual --preferred-challenges dns \
  -d darital-arenda.uz \
  -d *.darital-arenda.uz
```

---

## STEP 2: Add TXT Record to DNS

Certbot will show you something like this:

```
Please deploy a DNS TXT record under the name:
_acme-challenge.darital-arenda.uz

with the following value:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Before continuing, verify the TXT record has been deployed.
```

**Go to your domain DNS settings and add:**
- **Name:** `_acme-challenge`
- **Type:** `TXT`
- **Value:** (the value certbot gives you)
- **TTL:** 14400 or Auto

---

## STEP 3: Wait and Verify

```bash
# Wait 2-3 minutes for DNS to propagate

# Verify the TXT record exists (on your Mac or VPS)
nslookup -type=TXT _acme-challenge.darital-arenda.uz

# Should show the value you added
```

---

## STEP 4: Continue in Certbot

Press **Enter** in the certbot terminal.

Certbot will verify the TXT record and issue your certificate!

You should see:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem
Key is saved at: /etc/letsencrypt/live/darital-arenda.uz/privkey.pem
```

---

## STEP 5: Upload and Run the Setup Script

### On your Mac:

```bash
# Upload the script to VPS
scp ~/Desktop/darital/FINAL_SSL_SETUP.sh darital@46.8.176.171:~/
```

### On your VPS:

```bash
# Run the script
sudo bash ~/FINAL_SSL_SETUP.sh
```

This script will:
- ✅ Detect your Let's Encrypt certificate
- ✅ Configure nginx for HTTPS
- ✅ Enable HTTPS for all domains
- ✅ Test everything

---

## ✅ DONE!

After running the script, your sites will be on HTTPS:
- https://darital-arenda.uz 🔒
- https://admin.darital-arenda.uz 🔒
- https://api.darital-arenda.uz 🔒

All subdomains covered by the wildcard certificate!

---

## Summary:

1. Run certbot DNS challenge
2. Add TXT record to DNS
3. Wait 2 minutes
4. Press Enter in certbot
5. Upload and run FINAL_SSL_SETUP.sh
6. Done! 🎉
