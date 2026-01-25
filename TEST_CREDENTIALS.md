# Test Credentials for Darital Application

## Admin Web Login
**URL**: `/login` (Admin Web Application)

### Admin Account
- **Email**: `admin@darital.local`
- **Password**: `admin123`

### Tenant Account
- **Email**: `almurotov.dilbek@gmail.com`
- **Password**: `admin123`

---

## Tenant Web Login
**URL**: `/login` (Tenant Web Application)

### Admin Account
- **Email**: `admin@darital.local`
- **Password**: `admin123`

### Tenant Account
- **Email**: `almurotov.dilbek@gmail.com`
- **Password**: `admin123`

---

## Additional Test Accounts (from seed data)

### Admin Users
- **Email**: `admin@darital.local`
- **Password**: `admin123`
- **Role**: `SUPER_ADMIN`

### Tenant Users
- **Email**: `tenant1@darital.local`
- **Password**: `tenant123`

- **Email**: `tenant2@darital.local`
- **Password**: `tenant123`

- **Email**: `almurotov.dilbek@gmail.com`
- **Password**: `admin123`

---

## Notes
- These credentials are displayed on the login pages for testing purposes
- Default passwords can be changed after login
- For production, ensure these test accounts are removed or passwords are changed
- Seed data accounts are created when running `pnpm seed` in the API directory

---

**Generated**: $(date)
**Source**: Login pages from tenant-web and admin-web applications
