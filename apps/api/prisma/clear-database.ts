import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function checkDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  try {
    const parsed = new URL(url.replace(/^postgresql:\/\//, 'https://'));
    const host = parsed.hostname;
    if (host === 'host') {
      console.error('DATABASE_URL looks like a placeholder (host is "%s").', host);
      console.error('Use your real Render database URL from Render Dashboard → Database → Connection string (External).');
      process.exit(1);
    }
  } catch {
    // ignore parse errors
  }
}

async function main() {
  checkDatabaseUrl();
  console.log('Clearing all data from database...');

  await prisma.message.deleteMany({});
  await prisma.archivedMessage.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.archivedConversation.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});
  await prisma.archivedAuditLog.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.inAppNotification.deleteMany({});
  await prisma.archivedNotification.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.tenantDevice.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.balance.deleteMany({});
  await prisma.telegramUser.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.emailTemplate.deleteMany({});

  console.log('All data cleared. You can now enter fresh data (e.g. from Render app).');
}

main()
  .catch((e) => {
    const msg = e?.message || String(e);
    if (msg.includes('Authentication failed') || msg.includes('credentials')) {
      console.error('Database authentication failed. Try either:');
      console.error('  1. Run from Render: API service → Shell → cd apps/api && pnpm db:clear (uses Render’s DATABASE_URL)');
      console.error('  2. Use the exact External Database URL from Render Dashboard → Database → Connection (copy again; password may need URL-encoding if it has # @ % etc.).');
    }
    console.error('Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
