# Admin Module - Temporary Admin Creation

## ⚠️ TEMPORARY MODULE - REMOVE AFTER USE

This module provides a temporary endpoint to create an admin user. **Remove this entire module after creating your initial admin user.**

## Usage

### Endpoint
- **Method**: `POST`
- **Path**: `/admin/create`
- **Authentication**: Public (no auth required - for initial setup only)

### Request Body
```json
{
  "username": "admin",
  "password": "SecurePassword123!",
  "email": "admin@example.com"
}
```

### Response
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "username": "admin",
  "email": "admin@example.com"
}
```

### Example with cURL
```bash
curl -X POST http://localhost:3000/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePassword123!",
    "email": "admin@example.com"
  }'
```

## How It Works

1. **Password Hashing**: Password is automatically hashed using bcrypt (10 rounds)
2. **Upsert Logic**: Uses Prisma `upsert` to:
   - Create the admin user if it doesn't exist
   - Skip (do nothing) if the user already exists (based on email)
3. **Role Assignment**: Automatically sets role to `AdminRole.ADMIN`
4. **Username Storage**: The `username` field is stored in the `fullName` field of the User model

## Registration in AppModule

The `AdminModule` is already registered in `apps/api/src/app.module.ts`:

```typescript
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // ... other modules
    AdminModule, // Temporary admin creation module - can be removed after use
  ],
})
```

## Removal Instructions

After creating your admin user:

1. Delete the entire `apps/api/src/admin/` directory
2. Remove `AdminModule` import and registration from `apps/api/src/app.module.ts`:
   - Remove: `import { AdminModule } from './admin/admin.module';`
   - Remove: `AdminModule,` from the imports array

## Security Note

⚠️ **This endpoint is PUBLIC and has no authentication.** Only use it during initial setup and remove it immediately after creating your admin user.
