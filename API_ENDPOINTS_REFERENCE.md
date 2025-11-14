# 📡 NOTIFICATION SYSTEM - API ENDPOINTS REFERENCE CARD

## 🔐 Authentication

All endpoints require JWT authentication in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📱 Device Management Endpoints

### 1. Register Device

Register a mobile device for push notifications.

```http
POST /api/tenant/devices/register
```

**Auth:** Required (TENANT role)

**Request:**
```json
{
  "fcmToken": "dTQ8xY1234567890abcdef...",
  "platform": "android"
}
```

**Response:**
```json
{
  "success": true,
  "deviceId": "clx123456",
  "message": "Device registered successfully for push notifications"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/tenant/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken": "test-token-123", "platform": "android"}'
```

---

### 2. List Devices

Get all registered devices for the authenticated tenant.

```http
GET /api/tenant/devices
```

**Auth:** Required (TENANT role)

**Response:**
```json
{
  "devices": [
    {
      "id": "clx123456",
      "fcmToken": "dTQ8xY...",
      "platform": "android",
      "createdAt": "2025-10-28T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/tenant/devices \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚙️ Notification Preference Endpoints

### 3. Get Preferences

Get current notification channel preferences.

```http
GET /api/tenant/notifications/preferences
```

**Auth:** Required (TENANT role)

**Response:**
```json
{
  "preferences": [
    { "channel": "EMAIL", "enabled": true },
    { "channel": "TELEGRAM", "enabled": false },
    { "channel": "PUSH", "enabled": true },
    { "channel": "SMS", "enabled": true }
  ]
}
```

**Default Behavior:** If tenant has never set preferences, all channels return as `enabled: true`.

**cURL Example:**
```bash
curl http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Update Preferences

Update which notification channels are enabled.

```http
PATCH /api/tenant/notifications/preferences
```

**Auth:** Required (TENANT role)

**Request:**
```json
{
  "preferences": [
    { "channel": "PUSH", "enabled": true },
    { "channel": "SMS", "enabled": false },
    { "channel": "TELEGRAM", "enabled": true },
    { "channel": "EMAIL", "enabled": true }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "preferences": [
    { "channel": "PUSH", "enabled": true },
    { "channel": "SMS", "enabled": false },
    { "channel": "TELEGRAM", "enabled": true },
    { "channel": "EMAIL", "enabled": true }
  ]
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": [
      {"channel": "PUSH", "enabled": true},
      {"channel": "SMS", "enabled": false}
    ]
  }'
```

---

## 🧪 Admin Testing Endpoint

### 5. Send Test Notification (Admin Only)

Manually trigger a test notification to a specific tenant.

```http
POST /api/notifications/test
```

**Auth:** Required (ADMIN or SUPER_ADMIN role)

**Request:**
```json
{
  "tenantId": "cm1234567890",
  "template": "reminder"
}
```

**Templates:**
- `"reminder"` - Payment reminder (3 days before due)
- `"overdue"` - Overdue payment notice

**Response:**
```json
{
  "ok": true,
  "message": "Payment reminder sent via Email and Telegram"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "cm123", "template": "reminder"}'
```

---

## 📊 ENDPOINT SUMMARY TABLE

| Method | Endpoint                                      | Role         | Description                        |
|--------|-----------------------------------------------|--------------|-----------------------------------|
| POST   | `/api/tenant/devices/register`                | TENANT       | Register FCM token                |
| GET    | `/api/tenant/devices`                         | TENANT       | List registered devices           |
| GET    | `/api/tenant/notifications/preferences`       | TENANT       | Get notification preferences      |
| PATCH  | `/api/tenant/notifications/preferences`       | TENANT       | Update notification preferences   |
| POST   | `/api/notifications/test`                     | ADMIN        | Send test notification            |

---

## 🔍 NOTIFICATION CHANNELS

| Channel   | Key        | Description                                  |
|-----------|-----------|----------------------------------------------|
| 📲 Push    | `PUSH`    | Firebase Cloud Messaging (FCM) to mobile app |
| 💬 Telegram| `TELEGRAM`| Telegram Bot messages                        |
| 📱 SMS     | `SMS`     | SMS via Twilio/Playmobile                    |
| 📧 Email   | `EMAIL`   | SMTP email notifications                     |

---

## 🚨 COMMON ERROR RESPONSES

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Cause:** Missing or invalid JWT token  
**Solution:** Include valid `Authorization: Bearer <token>` header

---

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```
**Cause:** User role doesn't have permission  
**Solution:** Ensure you're using the correct role (TENANT for device/preferences endpoints)

---

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["fcmToken must be a string", "platform must be one of: ios, android"],
  "error": "Bad Request"
}
```
**Cause:** Invalid request body  
**Solution:** Check DTO validation requirements

---

### 404 Not Found
```json
{
  "code": "NOT_FOUND",
  "message": "Tenant profile not found"
}
```
**Cause:** Tenant not found for authenticated user  
**Solution:** Ensure tenant account exists with matching email

---

## 🔧 REQUEST HEADERS

### Required Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Optional Headers

```http
Accept: application/json
```

---

## 📝 VALIDATION RULES

### RegisterDeviceDto

| Field      | Type   | Required | Validation                    |
|-----------|--------|----------|-------------------------------|
| fcmToken  | string | Yes      | Must be a valid string        |
| platform  | string | Yes      | Must be either "ios" or "android" |

---

### UpdateNotificationPreferencesDto

| Field                  | Type    | Required | Validation                                     |
|-----------------------|---------|----------|-----------------------------------------------|
| preferences           | array   | Yes      | Array of NotificationChannelPreference objects |
| preferences[].channel | string  | Yes      | Must be one of: EMAIL, TELEGRAM, PUSH, SMS    |
| preferences[].enabled | boolean | Yes      | Must be true or false                         |

---

## 🧪 TESTING WORKFLOW

### Step 1: Login as Tenant
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tenant@example.com", "password": "password123"}'
```

Save the token:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Step 2: Register Device
```bash
curl -X POST http://localhost:3001/api/tenant/devices/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken": "test-token-123", "platform": "android"}'
```

---

### Step 3: Get Preferences
```bash
curl http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TOKEN"
```

---

### Step 4: Update Preferences (Disable SMS)
```bash
curl -X PATCH http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": [
      {"channel": "PUSH", "enabled": true},
      {"channel": "SMS", "enabled": false},
      {"channel": "TELEGRAM", "enabled": true},
      {"channel": "EMAIL", "enabled": true}
    ]
  }'
```

---

### Step 5: Verify Preferences
```bash
curl http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** SMS should show `"enabled": false`

---

## 🌐 BASE URLs

### Development
```
http://localhost:3001/api
```

### Production (Example)
```
https://api.darital.uz/api
```

---

## 📚 SWAGGER DOCUMENTATION

Interactive API documentation is available at:

```
http://localhost:3001/api-docs
```

Navigate to **"Tenant Portal"** section to see all endpoints with:
- Request/response schemas
- Try-it-out functionality
- Example values
- Authentication requirements

---

## 🎯 QUICK COPY-PASTE COMMANDS

### Register Device (Android)
```bash
curl -X POST http://localhost:3001/api/tenant/devices/register -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"fcmToken": "test-android-token", "platform": "android"}'
```

### Register Device (iOS)
```bash
curl -X POST http://localhost:3001/api/tenant/devices/register -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"fcmToken": "test-ios-token", "platform": "ios"}'
```

### Disable All Notifications
```bash
curl -X PATCH http://localhost:3001/api/tenant/notifications/preferences -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"preferences": [{"channel": "PUSH", "enabled": false}, {"channel": "SMS", "enabled": false}, {"channel": "TELEGRAM", "enabled": false}, {"channel": "EMAIL", "enabled": false}]}'
```

### Enable Only Push Notifications
```bash
curl -X PATCH http://localhost:3001/api/tenant/notifications/preferences -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"preferences": [{"channel": "PUSH", "enabled": true}, {"channel": "SMS", "enabled": false}, {"channel": "TELEGRAM", "enabled": false}, {"channel": "EMAIL", "enabled": false}]}'
```

---

## 📞 SUPPORT

For issues or questions:
- Check logs: `docker logs darital-api`
- View Swagger: http://localhost:3001/api-docs
- Read guide: `NOTIFICATION_SYSTEM_COMPLETE.md`
- Test guide: `TEST_NOTIFICATIONS_QUICK.md`

---

**Version:** 1.0.0  
**Last Updated:** October 28, 2025  
**Status:** ✅ Production Ready

