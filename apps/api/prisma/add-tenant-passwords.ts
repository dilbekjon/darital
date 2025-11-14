import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
  console.log('🔐 Adding password field to Tenant table...');
  
  // First, add the column with a default value
  await prisma.$executeRaw`
    ALTER TABLE "Tenant" 
    ADD COLUMN IF NOT EXISTS "password" TEXT DEFAULT ${hashedPassword}
  `;
  
  console.log('✅ Password column added');
  
  // Update all existing tenants to have the hashed password
  const result = await prisma.$executeRaw`
    UPDATE "Tenant" 
    SET "password" = ${hashedPassword}
    WHERE "password" IS NULL OR "password" = ''
  `;
  
  console.log(`✅ Updated ${result} tenant(s) with default password: admin123`);
  
  // Now make the column NOT NULL
  await prisma.$executeRaw`
    ALTER TABLE "Tenant" 
    ALTER COLUMN "password" SET NOT NULL
  `;
  
  console.log('✅ Password column is now required');
  
  // List all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, fullName: true, email: true }
  });
  
  console.log('\n📋 Tenants with passwords set:');
  tenants.forEach((tenant, index) => {
    console.log(`   ${index + 1}. ${tenant.fullName} (${tenant.email || 'no email'})`);
  });
  
  console.log('\n✅ All done! Default password for all tenants: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

