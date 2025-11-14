import { PrismaClient, AdminRole } from '@prisma/client';
import { PERMISSIONS, ROLE_PRESETS, PermissionCode } from './permissions.catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RBAC permissions and roles...');

  // Upsert Permissions
  const permissionCodes = Object.keys(PERMISSIONS) as PermissionCode[];
  for (const code of permissionCodes) {
    await prisma.permission.upsert({
      where: { code },
      update: { name: PERMISSIONS[code] },
      create: {
        code,
        name: PERMISSIONS[code],
        description: PERMISSIONS[code], // Using name as description for simplicity
      },
    });
    console.log(`  Upserted permission: ${code}`);
  }

  // Clear existing RolePermissions to prevent duplicates on re-seed
  await prisma.rolePermission.deleteMany({});
  console.log('  Cleared existing role permissions.');

  // Assign Permissions to Roles based on ROLE_PRESETS
  for (const roleString in ROLE_PRESETS) {
    const role = roleString as AdminRole;
    const permissionsForRole = ROLE_PRESETS[roleString];

    for (const permissionCode of permissionsForRole) {
      const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
      });

      if (permission) {
        await prisma.rolePermission.create({
          data: {
            role,
            permissionId: permission.id,
          },
        });
        console.log(`    Assigned ${permissionCode} to role ${role}`);
      }
    }
  }

  console.log('✅ RBAC seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
