const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.argv[2] || 'admin@darital.local';
  const newPassword = process.argv[3] || 'admin123';
  
  console.log(`Resetting password for: ${email}`);
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hash }
  });
  
  console.log(`✅ Password reset successfully for ${email}`);
  console.log(`   New password: ${newPassword}`);
  await prisma.$disconnect();
}

resetPassword().catch(console.error);

