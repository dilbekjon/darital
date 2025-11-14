# Admin Panel Architecture & Implementation Summary

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Architecture](#core-architecture)
5. [Layout System](#layout-system)
6. [Authentication & Authorization](#authentication--authorization)
7. [Routing & Navigation](#routing--navigation)
8. [State Management](#state-management)
9. [API Integration](#api-integration)
10. [Key Features & Pages](#key-features--pages)
11. [Styling & Theming](#styling--theming)
12. [Internationalization](#internationalization)
13. [Security Features](#security-features)

---

## Overview

The Darital Admin Panel is a comprehensive Next.js-based web application designed for managing property rental operations. It provides administrators with tools to manage tenants, contracts, units, payments, invoices, reports, and communications.

**Key Characteristics:**
- **Framework**: Next.js 16.0.0 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom dark mode support
- **State Management**: React Context API
- **API Communication**: RESTful API with JWT authentication
- **Permission System**: Role-Based Access Control (RBAC)

---

## Technology Stack

### Frontend Technologies
- **Next.js 16.0.0**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Context API**: State management
- **React Hooks**: useState, useEffect, useContext, useRouter

### Backend Integration
- **RESTful API**: NestJS backend running on port 3001
- **JWT Authentication**: Bearer token-based auth
- **Permission System**: Backend-enforced RBAC

---

## Project Structure

```
apps/admin-web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Home/redirect page
│   │   ├── login/               # Login page
│   │   ├── dashboard/          # Main dashboard
│   │   └── admin/              # Admin section pages
│   │       ├── contracts/      # Contract management
│   │       ├── tenants/         # Tenant management
│   │       ├── units/          # Unit management
│   │       ├── payments/       # Payment tracking
│   │       ├── reports/        # Financial reports
│   │       ├── chat/          # Support chat
│   │       ├── notifications/  # Notification system
│   │       └── users/         # Admin user management
│   ├── components/             # Reusable components
│   │   ├── AdminSidebar.tsx   # Navigation sidebar
│   │   ├── GlobalHeader.tsx   # Top header bar
│   │   └── common/            # Common UI components
│   ├── contexts/              # React Context providers
│   │   ├── AuthContext.tsx    # Authentication state
│   │   ├── LanguageContext.tsx # i18n support
│   │   └── ThemeContext.tsx   # Dark/light theme
│   ├── lib/                   # Utility libraries
│   │   ├── api.ts            # API client functions
│   │   └── i18n.ts          # Translation system
│   └── globals.css           # Global styles
```

---

## Core Architecture

### 1. Application Entry Point

**`app/layout.tsx`**
- Root layout component that wraps the entire application
- Sets up HTML structure with metadata
- Wraps children with `Providers` component
- Default language set to Uzbek (`lang="uz"`)

### 2. Provider System

**`app/providers.tsx`**
- **AuthProvider**: Manages authentication state and user permissions
- **ThemeProvider**: Handles dark/light mode switching
- **LanguageProvider**: Manages internationalization (UZ/RU/EN)
- **Conditional Layout**: Shows AdminSidebar only for authenticated admin users

**Layout Logic:**
```typescript
// Sidebar is shown when:
- User is authenticated
- User is not a TENANT_USER
- Not on login page
```

---

## Layout System

### 1. Global Header (`components/GlobalHeader.tsx`)

**Features:**
- Language selector (UZ/RU/EN)
- Theme toggle (Dark/Light)
- User menu with logout
- Responsive design
- Conditional navigation based on user role

**Position**: Fixed at top, always visible

### 2. Admin Sidebar (`components/AdminSidebar.tsx`)

**Features:**
- **Permission-Based Menu**: Only shows items user has access to
- **Active Route Highlighting**: Highlights current page
- **Icon Support**: SVG icons for each menu item
- **Sticky Positioning**: Remains visible on scroll

**Menu Items:**
1. Dashboard - No permission required
2. Contracts - `contracts.read`
3. Tenants - `tenants.read`
4. Units - `contracts.read`
5. Payments - `payments.read`
6. Reports - `reports.view`
7. Chat - `chat.read`
8. Notifications - `notifications.manage`
9. Admin Users - `admin.users.read`

**Filtering Logic:**
```typescript
const visibleMenuItems = menuItems.filter(item => 
  item.permissionCodes.every(perm => hasPermission(perm))
);
```

### 3. Main Content Area

- Flexible layout that adapts to sidebar presence
- Full-width on login/tenant pages
- Constrained width with sidebar on admin pages

---

## Authentication & Authorization

### 1. Authentication Flow

**Login Process:**
1. User enters email/password on `/login`
2. Frontend sends credentials to `/api/auth/login`
3. Backend validates and returns JWT token
4. Token stored in `localStorage` as `accessToken`
5. User redirected based on role:
   - `TENANT_USER` → Tenant portal (`localhost:3002`)
   - Admin roles → Dashboard (`/dashboard`)

**Token Management:**
- Stored in `localStorage` for persistence
- Automatically included in API requests via `Authorization: Bearer <token>`
- Cleared on logout or 401 errors

### 2. Authorization System

**AuthContext (`contexts/AuthContext.tsx`)**

**Key Functions:**
- `fetchUser()`: Fetches current user data from `/api/auth/me`
- `hasPermission(permissionCode)`: Checks if user has specific permission
- `refetchUser()`: Manually refresh user data

**Permission Checking Logic:**
```typescript
hasPermission(permissionCode: string): boolean {
  // SUPER_ADMIN bypasses all checks
  if (user.role === 'SUPER_ADMIN') return true;
  
  // TENANT_USER has no admin permissions
  if (user.role === 'TENANT_USER') return false;
  
  // Check if permission exists in user's permissions array
  return user.permissions.includes(permissionCode);
}
```

**Role Hierarchy:**
1. **SUPER_ADMIN**: Full access, bypasses all permission checks
2. **ADMIN**: Standard admin with assigned permissions
3. **CASHIER**: Payment-related permissions
4. **SUPPORT**: Chat and tenant support permissions
5. **ANALYST**: Read-only access to reports
6. **TENANT_USER**: No admin access (redirected to tenant portal)

### 3. Protected Routes

**Implementation:**
- Each admin page checks permissions before rendering
- `NoAccess` component shown if user lacks required permission
- Automatic redirect to login if not authenticated

**Example:**
```typescript
if (!user || !hasPermission('contracts.read')) {
  return <NoAccess />;
}
```

---

## Routing & Navigation

### 1. Next.js App Router Structure

**Route Hierarchy:**
```
/                    → Redirects to dashboard
/login               → Login page (public)
/dashboard           → Main dashboard (protected)
/admin/contracts     → Contract management
/admin/tenants       → Tenant management
/admin/units         → Unit management
/admin/payments      → Payment tracking
/admin/reports       → Financial reports
/admin/chat          → Support chat interface
/admin/notifications → Notification management
/admin/users         → Admin user management
```

### 2. Navigation Components

**Sidebar Navigation:**
- Uses Next.js `Link` component for client-side navigation
- Active route highlighting based on `usePathname()`
- Smooth transitions and hover effects

**Programmatic Navigation:**
- Uses `useRouter()` from `next/navigation`
- Used for redirects after actions (create, update, delete)

---

## State Management

### 1. Context API Pattern

**Three Main Contexts:**

#### AuthContext
- **State**: `user`, `loading`
- **Functions**: `hasPermission()`, `refetchUser()`
- **Scope**: Global authentication state

#### LanguageContext
- **State**: `language` (uz/ru/en), `t` (translation function)
- **Functions**: `setLanguage()`
- **Scope**: Global i18n state

#### ThemeContext
- **State**: `darkMode`
- **Functions**: `toggleTheme()`
- **Scope**: Global theme state

### 2. Local Component State

**Pattern Used:**
- `useState` for component-specific state
- `useEffect` for side effects (API calls, subscriptions)
- Form state managed locally per component

**Example Pattern:**
```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData();
}, []);
```

---

## API Integration

### 1. API Client (`lib/api.ts`)

**Core Function: `fetchApi<T>()`**

**Features:**
- Automatic JWT token injection
- Error handling with custom `ApiError` class
- JSON parsing with fallback
- 401 handling (auto-logout)
- Type-safe responses with TypeScript generics

**Usage Pattern:**
```typescript
const data = await fetchApi<User[]>('/tenants');
```

**Error Handling:**
```typescript
try {
  const data = await fetchApi<DataType>('/endpoint');
} catch (err) {
  if (err instanceof ApiError) {
    setError(err.message);
  }
}
```

### 2. API Endpoints Used

**Authentication:**
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

**Tenants:**
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create tenant
- `PATCH /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

**Contracts:**
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Create contract (with PDF upload)
- `PATCH /api/contracts/:id` - Update contract
- `PATCH /api/contracts/:id/status` - Change contract status

**Units:**
- `GET /api/units` - List units
- `POST /api/units` - Create unit
- `PATCH /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Delete unit

**Payments:**
- `GET /api/payments` - List payments
- `PATCH /api/payments/:id/confirm` - Confirm payment

**Reports:**
- `GET /api/reports?startDate=&endDate=` - Generate reports

**Chat:**
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages

**Notifications:**
- `POST /api/notifications/test` - Send test notification
- `POST /api/notifications/telegram/test` - Send Telegram test

**Users:**
- `GET /api/admin/users` - List admin users
- `POST /api/admin/users` - Create admin user
- `PATCH /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user

---

## Key Features & Pages

### 1. Dashboard (`/dashboard`)

**Purpose**: Overview of system statistics

**Features:**
- Real-time statistics from API
- Clickable stat cards for navigation
- Quick action buttons
- Welcome message with user info

**Statistics Displayed:**
- Total Tenants count
- Total Contracts (with Active count)
- Total Revenue (UZS formatted)
- Total Invoices (with Pending count)

**Quick Actions:**
- Support Chat
- Notifications
- Reports

### 2. Contracts Management (`/admin/contracts`)

**Purpose**: Manage rental contracts

**Features:**
- List all contracts with status
- Create new contracts with:
  - Tenant selection
  - Unit selection
  - Date range (start/end)
  - Amount
  - PDF upload
  - Notes
- Edit existing contracts
- Change contract status (DRAFT → ACTIVE → COMPLETED/CANCELLED)
- View contract details
- Auto-mark units as BUSY when contract created

**Status Flow:**
- DRAFT → ACTIVE (marks unit as BUSY)
- ACTIVE → COMPLETED/CANCELLED (marks unit as FREE)

### 3. Tenants Management (`/admin/tenants`)

**Purpose**: Manage tenant accounts

**Features:**
- List all tenants
- Create new tenants with:
  - Full name
  - Email
  - Phone
  - Password
- Edit tenant information
- Change tenant password (optional on edit)
- Delete tenants
- View tenant details

**Password Management:**
- Required on creation
- Optional on edit (leave empty to keep current)

### 4. Units Management (`/admin/units`)

**Purpose**: Manage property units

**Features:**
- List all units with status
- Create new units with:
  - Name
  - Price
  - Area (optional)
  - Floor (optional)
- Edit unit information
- View unit status (FREE/BUSY/MAINTENANCE)
- See connected tenants and contracts
- Delete units

**Status Management:**
- Automatically updated when contracts are created/cancelled
- FREE: Available for rent
- BUSY: Currently occupied
- MAINTENANCE: Under maintenance

### 5. Payments Tracking (`/admin/payments`)

**Purpose**: Track and manage payments

**Features:**
- List all payments
- Filter by status (PENDING/CONFIRMED/CANCELLED)
- View payment details:
  - Invoice ID
  - Amount
  - Payment method
  - Status
  - Date
- Confirm pending payments
- View payment history

### 6. Reports (`/admin/reports`)

**Purpose**: Financial and operational reports

**Features:**
- Date range selection
- Generate reports for selected period
- Display statistics:
  - Total Revenue
  - Total Invoiced
  - Pending Payments
  - Outstanding Amount
  - Contract statistics
  - Payment statistics
  - Invoice statistics
- Formatted currency display (UZS)
- Color-coded metrics

### 7. Chat System (`/admin/chat`)

**Purpose**: Support communication with tenants

**Features:**
- List all conversations
- Filter by status (OPEN/PENDING/CLOSED)
- View conversation messages
- Reply to tenant messages
- Assign conversations to admins
- Close conversations
- File upload support
- Real-time updates (WebSocket)

### 8. Notifications (`/admin/notifications`)

**Purpose**: Send notifications to tenants

**Features:**
- Send test notifications
- Select tenant
- Choose notification type:
  - Payment Reminder
  - Overdue Notice
  - Custom Message
- Send via:
  - Email
  - Telegram
  - Both
- Image attachment support
- Character counter for Telegram
- Success/error feedback

### 9. Admin Users (`/admin/users`)

**Purpose**: Manage admin user accounts

**Features:**
- List all admin users
- Create new admin users with:
  - Full name
  - Email
  - Password
  - Role selection
- Edit user roles
- Delete users
- View user permissions

**Role Management:**
- Cannot assign TENANT_USER role
- SUPER_ADMIN cannot be downgraded
- Users cannot delete themselves

---

## Styling & Theming

### 1. Tailwind CSS

**Configuration:**
- Utility-first approach
- Custom color palette
- Responsive breakpoints
- Dark mode support

### 2. Dark Mode Implementation

**ThemeContext:**
- Toggles between light and dark themes
- Persists preference in localStorage
- Applies theme classes globally

**Color Scheme:**
- **Light Mode**: White backgrounds, gray text, blue accents
- **Dark Mode**: Dark gray/black backgrounds, yellow accents, white text

**Implementation:**
```typescript
className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
```

### 3. Component Styling Patterns

**Card Components:**
- Rounded corners (`rounded-2xl`)
- Shadow effects (`shadow-xl`)
- Hover animations (`hover:-translate-y-2`)
- Border highlights on hover

**Form Elements:**
- Consistent input styling
- Dark mode support
- Focus states
- Error states

**Buttons:**
- Primary: Blue background
- Secondary: Gray background
- Danger: Red for delete actions
- Disabled states

---

## Internationalization

### 1. Language System (`lib/i18n.ts`)

**Supported Languages:**
- Uzbek (uz) - Default
- Russian (ru)
- English (en)

**Implementation:**
- Translation object with nested structure
- Type-safe translation keys
- Fallback to English if translation missing

**Usage:**
```typescript
const { t } = useLanguage();
<h1>{t.dashboard}</h1>
```

### 2. Translation Structure

**Categories:**
- Navigation & Common
- Dashboard
- Contracts
- Tenants
- Units
- Payments
- Reports
- Chat
- Notifications
- Forms & Actions

**Example:**
```typescript
{
  uz: {
    dashboard: 'Bosh sahifa',
    contracts: 'Shartnomalar',
    // ...
  },
  ru: {
    dashboard: 'Главная',
    contracts: 'Контракты',
    // ...
  },
  en: {
    dashboard: 'Dashboard',
    contracts: 'Contracts',
    // ...
  }
}
```

### 3. Language Switcher

**Location**: GlobalHeader
**Functionality:**
- Dropdown selector
- Instant language change
- Persists preference
- Updates all text immediately

---

## Security Features

### 1. Authentication Security

**JWT Tokens:**
- Stored in localStorage
- Automatically included in API requests
- Cleared on logout or 401 errors

**Token Validation:**
- Backend validates token on every request
- Frontend checks token presence before API calls
- Automatic redirect to login if token missing

### 2. Authorization Security

**Permission Checks:**
- Frontend: UI elements hidden based on permissions
- Backend: All endpoints protected by permission guards
- Double-layer security (UI + API)

**Role-Based Access:**
- SUPER_ADMIN: Full access
- Other roles: Permission-based access
- TENANT_USER: No admin access

### 3. Input Validation

**Frontend:**
- Required field validation
- Email format validation
- Password length validation
- Date range validation

**Backend:**
- DTO validation with class-validator
- Type checking
- Sanitization

### 4. Error Handling

**API Errors:**
- Custom ApiError class
- Status code handling
- User-friendly error messages
- Error logging

**Network Errors:**
- Graceful degradation
- Retry mechanisms
- Offline detection

---

## Data Flow

### 1. Page Load Flow

```
1. User navigates to page
2. AuthContext checks for token
3. If token exists, fetch user data
4. Check user permissions
5. Render page with appropriate access
6. Load page-specific data from API
7. Display data in UI
```

### 2. Action Flow (Create/Update/Delete)

```
1. User fills form
2. Client-side validation
3. Submit to API
4. Show loading state
5. API processes request
6. Success: Update UI, show success message
7. Error: Show error message, keep form data
```

### 3. Permission Flow

```
1. User attempts to access page
2. AuthContext checks hasPermission()
3. If no permission: Show NoAccess component
4. If has permission: Load and display page
5. Backend also validates permission
6. If backend denies: Show error message
```

---

## Responsive Design

### 1. Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### 2. Responsive Patterns

**Grid Layouts:**
```typescript
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
```

**Sidebar:**
- Hidden on mobile (can be toggled)
- Always visible on desktop

**Tables:**
- Horizontal scroll on mobile
- Full table on desktop

---

## Performance Optimizations

### 1. Code Splitting

- Next.js automatic code splitting
- Route-based splitting
- Component lazy loading

### 2. API Optimization

- Parallel API calls with `Promise.all()`
- Error handling per endpoint
- Caching strategies

### 3. State Management

- Minimal re-renders
- Context optimization
- Local state for component-specific data

---

## Future Enhancements

### Potential Improvements

1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Filtering**: Multi-criteria filters on list pages
3. **Export Functionality**: PDF/Excel export for reports
4. **Bulk Operations**: Multi-select and bulk actions
5. **Search Functionality**: Global search across entities
6. **Activity Logs**: User activity tracking
7. **Dashboard Widgets**: Customizable dashboard
8. **Mobile App**: React Native mobile app
9. **Offline Support**: Service workers for offline access
10. **Advanced Analytics**: Charts and graphs

---

## Conclusion

The Darital Admin Panel is a comprehensive, well-structured application built with modern web technologies. It follows best practices for:

- **Architecture**: Clean separation of concerns
- **Security**: Multi-layer authentication and authorization
- **User Experience**: Intuitive interface with dark mode and i18n
- **Maintainability**: Type-safe code with clear structure
- **Scalability**: Modular design allowing easy feature additions

The system successfully manages complex property rental operations while maintaining security, usability, and performance.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Author**: Darital Development Team

