import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'superadminpass';
  const fullName = process.env.SUPER_ADMIN_FULL_NAME || 'Super Admin';

  console.log(`Attempting to upsert SUPER_ADMIN user: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const superAdmin = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        fullName,
        role: AdminRole.SUPER_ADMIN,
      },
      create: {
        email,
        password: hashedPassword,
        fullName,
        role: AdminRole.SUPER_ADMIN,
      },
    });
    console.log(`SUPER_ADMIN user upserted successfully: ${superAdmin.email}`);
  } catch (e) {
    console.error(`Error upserting SUPER_ADMIN user: ${email}`, e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
