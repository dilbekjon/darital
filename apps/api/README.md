# Darital API

## Auth Testing

Login (valid):

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@darital.local","password":"admin123"}'
# Expected: { "accessToken": "..." }
```

Me (with token):

```bash
TOKEN=PASTE_TOKEN_HERE
curl -s http://localhost:3001/api/me -H "Authorization: Bearer $TOKEN"
# Expected: { "id": "...", "email": "admin@darital.local", "fullName": "Super Admin", "role": "SUPER_ADMIN" }
```

Forbidden case (no role):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3001/api/admin/ping
# Expected: 401 when no token is provided. If using a non-admin token, expect 403.
```

> Note: Adjust the port if your API runs on a different port.
