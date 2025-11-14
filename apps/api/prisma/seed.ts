import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash the default admin password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Upsert SUPER_ADMIN user (idempotent)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@darital.local' },
    update: {}, // Don't update if exists
    create: {
      email: 'admin@darital.local',
      password: hashedPassword,
      fullName: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
  });

  console.log('✅ SUPER_ADMIN user created/verified:', {
    id: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

