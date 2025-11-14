# Admin RBAC (Role-Based Access Control) System

This document outlines how to add new permissions to the Darital Admin application and API.

## Adding New Permissions

To add a new permission, follow these steps:

1.  **Define in `permissions.catalog.ts` (API)**
    *   Open `apps/api/src/rbac/permissions.catalog.ts`.
    *   Add a new entry to the `PERMISSIONS` object with a unique code (e.g., `'your.new.permission'`) and a descriptive name.
    *   Update relevant `ROLE_PRESETS` to include this new permission for the appropriate roles.

    ```typescript
    // apps/api/src/rbac/permissions.catalog.ts
    export const PERMISSIONS = {
      // ... existing permissions ...
      'your.new.permission': 'Description of your new permission',
    } as const;

    export const ROLE_PRESETS: Record<string, PermissionCode[]> = {
      // ... existing roles ...
      ADMIN: [
        // ... existing admin permissions ...
        'your.new.permission',
      ],
    };
    ```

2.  **Run RBAC Seed (API)**
    *   After modifying `permissions.catalog.ts`, run the RBAC seed script to update the database:

    ```bash
    cd apps/api
    pnpm run rbac:seed
    ```

3.  **Apply to API Endpoints (API)**
    *   In the relevant API controller (`.controller.ts`) files, import the `Permissions` decorator:

    ```typescript
    // apps/api/src/your-module/your-controller.ts
    import { Permissions } from '../../rbac/permissions.decorator';
    // ...
    ```
    *   Apply the `@Permissions('your.new.permission')` decorator to the methods (endpoints) that require this permission.

    ```typescript
    // apps/api/src/your-module/your-controller.ts
    @Get()
    @Permissions('your.new.permission')
    async findSomething() { /* ... */ }
    ```

4.  **Update Frontend UI (Admin Web)**
    *   In the Admin Web application (`apps/admin-web`):
        *   **Sidebar Navigation:** If the new permission should control a sidebar menu item, update `apps/admin-web/src/components/AdminSidebar.tsx` by adding the new permission code to the `permissionCodes` array of the respective menu item.
        *   **Page Access:** For pages that require this permission, use the `useAuth` hook and conditionally render content or the `<NoAccess />` component.

        ```typescript
        // apps/admin-web/src/app/admin/your-page/page.tsx
        'use client';
        import { useAuth } from '../../../contexts/AuthContext';
        import { NoAccess } from '../../../components/common/NoAccess';

        export default function YourAdminPage() {
          const { hasPermission, loading, user } = useAuth();

          if (loading) {
            return <div>Loading...</div>;
          }

          if (!user || !hasPermission('your.new.permission')) {
            return <NoAccess />;
          }

          // ... render your page content ...
          return <div>Content accessible with 'your.new.permission'</div>;
        }
        ```
        *   **Component-level Access:** For elements within a page (e.g., buttons), use `hasPermission` to conditionally render or disable them.

        ```typescript
        // apps/admin-web/src/components/YourComponent.tsx
        import { useAuth } from '../../contexts/AuthContext';

        export function YourComponent() {
          const { hasPermission } = useAuth();

          const canPerformAction = hasPermission('your.new.permission');

          return (
            <div>
              {canPerformAction && (
                <button>Perform Action</button>
              )}
            </div>
          );
        }
        ```

This systematic approach ensures that new permissions are consistently defined, applied, and enforced across both the API and the Admin Web application.
