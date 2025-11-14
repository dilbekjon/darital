# 🧪 NOTIFICATION SYSTEM - QUICK TEST GUIDE

## ✅ PREREQUISITE

Barcha xizmatlar ishlab turishi kerak:
- ✅ PostgreSQL (Docker)
- ✅ Redis (Docker)
- ✅ Backend API (`pnpm dev`)
- ✅ Worker (`pnpm start:worker`)

---

## 🚀 QUICK START

### 1. Start all services

```bash
# Terminal 1: Start Docker services
cd /Users/dilbekalmurotov/Desktop/Darital\ Final
docker-compose up -d postgres redis

# Terminal 2: Start API
cd apps/api
pnpm dev

# Terminal 3: Start Worker
cd apps/api
pnpm start:worker
```

---

## 📱 TEST 1: DEVICE REGISTRATION

### Get Tenant JWT Token

First, login as tenant to get JWT token:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@example.com",
    "password": "password123"
  }'
```

**Save the token from response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Export it for easier use:
```bash
export TENANT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Register Device

```bash
curl -X POST http://localhost:3001/api/tenant/devices/register \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test-fcm-token-android-12345",
    "platform": "android"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "deviceId": "clx123456",
  "message": "Device registered successfully for push notifications"
}
```

**Backend Console:**
```
📱 Device registered for tenant John Doe: android, token: test-fcm-token-android...
```

---

### Register Second Device (iOS)

```bash
curl -X POST http://localhost:3001/api/tenant/devices/register \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test-fcm-token-ios-67890",
    "platform": "ios"
  }'
```

---

### List All Devices

```bash
curl http://localhost:3001/api/tenant/devices \
  -H "Authorization: Bearer $TENANT_TOKEN"
```

**Expected Response:**
```json
{
  "devices": [
    {
      "id": "clx123456",
      "fcmToken": "test-fcm-token-ios-67890",
      "platform": "ios",
      "createdAt": "2025-10-28T11:00:00Z"
    },
    {
      "id": "clx123455",
      "fcmToken": "test-fcm-token-android-12345",
      "platform": "android",
      "createdAt": "2025-10-28T10:30:00Z"
    }
  ]
}
```

✅ **Test 1 PASSED** if you see both devices in the list!

---

## ⚙️ TEST 2: NOTIFICATION PREFERENCES

### Get Current Preferences

```bash
curl http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TENANT_TOKEN"
```

**Expected Response (default - all enabled):**
```json
{
  "preferences": [
    { "channel": "EMAIL", "enabled": true },
    { "channel": "TELEGRAM", "enabled": true },
    { "channel": "PUSH", "enabled": true },
    { "channel": "SMS", "enabled": true }
  ]
}
```

---

### Update Preferences (Disable SMS)

```bash
curl -X PATCH http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": [
      { "channel": "PUSH", "enabled": true },
      { "channel": "SMS", "enabled": false },
      { "channel": "TELEGRAM", "enabled": true },
      { "channel": "EMAIL", "enabled": true }
    ]
  }'
```

**Expected Response:**
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

**Backend Console:**
```
Updated notification preferences for tenant John Doe
```

---

### Verify Preferences Updated

```bash
curl http://localhost:3001/api/tenant/notifications/preferences \
  -H "Authorization: Bearer $TENANT_TOKEN"
```

**Expected:** SMS should now show `"enabled": false`

✅ **Test 2 PASSED** if SMS is disabled!

---

## 🔔 TEST 3: MANUAL REMINDER (Admin Only)

### Get Admin JWT Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@darital.uz",
    "password": "admin123"
  }'
```

Export admin token:
```bash
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Find Tenant ID

```bash
# List all tenants (admin only)
curl http://localhost:3001/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Pick a tenantId from the response (e.g., "cm1234567890")**

---

### Send Test Reminder

```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cm1234567890",
    "template": "reminder"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Payment reminder sent via Email and Telegram"
}
```

**Backend Console (NotificationService):**
```
🔔 [Payment Reminder] Sending reminder to Tenant John Doe <john@example.com> (tenantId=cm1234567890)
📲 Queued 2 push notification(s)
💬 Queued Telegram message
📧 Email notification sent
✅ Sent 3 notification(s) to tenant cm1234567890
```

**Note:** SMS should NOT be sent because we disabled it in Test 2!

✅ **Test 3 PASSED** if you see "Sent 3 notifications" (not 4, because SMS is disabled)!

---

## 🕒 TEST 4: CRON JOB (ReminderScheduler)

### Create Test Invoice Due in 3 Days

```bash
# First, create a contract
curl -X POST http://localhost:3001/api/contracts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cm1234567890",
    "unitId": "unit123",
    "amount": 1200000,
    "startDate": "2025-10-28",
    "endDate": "2026-10-28"
  }'
```

**Response:** Note the `contractId`

---

```bash
# Create invoice due in 3 days
curl -X POST http://localhost:3001/api/invoices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "contract123",
    "amount": 1200000,
    "dueDate": "2025-10-31",
    "status": "PENDING"
  }'
```

---

### Trigger Cron Manually (for testing)

In your NestJS backend code, temporarily change the cron schedule to run every minute:

**Edit `apps/api/src/queues/reminder.scheduler.ts`:**
```typescript
// Change this:
@Cron('0 9 * * *') // Runs every day at 09:00

// To this (for testing only):
@Cron('* * * * *') // Runs every minute
```

**Restart API:**
```bash
# In terminal 2 (API terminal)
# Press Ctrl+C to stop
pnpm dev
```

**Wait 1 minute and check Worker console (Terminal 3):**

**Expected Worker Output:**
```
[ReminderScheduler] running daily reminders
Found 1 invoices due in 3 days
Enqueued 1 reminder job(s)

🎯 Job cmh123456 processing...
🔔 [BEFORE_3_DAYS] Sending reminder to Tenant John Doe
📲 Queued 2 push notification(s)
💬 Queued Telegram message
📧 Email notification sent
✅ Sent 3 notification(s)
🎯 Job cmh123456 completed
```

✅ **Test 4 PASSED** if you see the worker process the job automatically!

---

## 🎯 TEST 5: MULTIPLE TENANTS, MULTIPLE DEVICES

### Register Multiple Tenants

Login as different tenants and register devices for each:

**Tenant 1:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tenant1@example.com", "password": "password123"}'

export T1_TOKEN="..."

# Register device
curl -X POST http://localhost:3001/api/tenant/devices/register \
  -H "Authorization: Bearer $T1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken": "tenant1-device-1", "platform": "android"}'
```

**Tenant 2:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tenant2@example.com", "password": "password123"}'

export T2_TOKEN="..."

# Register device
curl -X POST http://localhost:3001/api/tenant/devices/register \
  -H "Authorization: Bearer $T2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken": "tenant2-device-1", "platform": "ios"}'
```

---

### Send Reminders to Both

```bash
# Tenant 1 reminder
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant1_id", "template": "reminder"}'

# Tenant 2 reminder
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant2_id", "template": "reminder"}'
```

**Backend should show:**
```
✅ Sent X notification(s) to tenant tenant1_id
✅ Sent Y notification(s) to tenant tenant2_id
```

✅ **Test 5 PASSED** if both tenants receive notifications!

---

## 📊 VERIFY IN DATABASE

### Check TenantDevices Table

```bash
# Inside Docker PostgreSQL
docker exec -it darital-postgres psql -U postgres -d darital_db

# Run query
SELECT * FROM tenant_devices ORDER BY "createdAt" DESC;
```

**Expected:**
```
    id    |  tenantId  |       fcmToken          | platform |      createdAt
----------|------------|-------------------------|----------|--------------------
 clx12345 | cm123456   | tenant2-device-1        | ios      | 2025-10-28 11:30:00
 clx12344 | cm123455   | tenant1-device-1        | android  | 2025-10-28 11:20:00
 clx12343 | cm123456   | test-fcm-token-ios-...  | ios      | 2025-10-28 11:00:00
 clx12342 | cm123456   | test-fcm-token-andr...  | android  | 2025-10-28 10:30:00
```

---

### Check NotificationPreferences Table

```sql
SELECT * FROM notification_preferences ORDER BY "createdAt" DESC;
```

**Expected:**
```
    id    |  tenantId  | channel  | enabled |      createdAt
----------|------------|----------|---------|--------------------
 clx12345 | cm123456   | SMS      | false   | 2025-10-28 10:45:00
 clx12344 | cm123456   | PUSH     | true    | 2025-10-28 10:45:00
 clx12343 | cm123456   | TELEGRAM | true    | 2025-10-28 10:45:00
 clx12342 | cm123456   | EMAIL    | true    | 2025-10-28 10:45:00
```

---

## 🎉 ALL TESTS PASSED!

If all 5 tests passed, your notification system is **100% working!** 🚀

---

## 🔄 CLEANUP (Optional)

### Reset Cron Schedule

After testing, reset the cron schedule back to daily:

**Edit `apps/api/src/queues/reminder.scheduler.ts`:**
```typescript
@Cron('0 9 * * *') // Runs every day at 09:00
```

---

### Clear Test Data

```bash
# Delete test devices
DELETE FROM tenant_devices WHERE "fcmToken" LIKE 'test-%';

# Delete test preferences
DELETE FROM notification_preferences WHERE "tenantId" = 'cm1234567890';
```

---

## 🧾 SUMMARY

| Test | Description                     | Status |
|------|---------------------------------|--------|
| 1    | Device Registration             | ✅      |
| 2    | Notification Preferences        | ✅      |
| 3    | Manual Reminder (Admin)         | ✅      |
| 4    | Cron Job (ReminderScheduler)    | ✅      |
| 5    | Multiple Tenants/Devices        | ✅      |

**All systems operational! 🎯**

Next steps:
- Integrate FCM in mobile app
- Add preferences UI in mobile/web
- Deploy to production
- Configure Firebase project
- Set up SMS provider (Twilio)

