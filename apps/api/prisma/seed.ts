import {
  AdminRole,
  ContractStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  UnitStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const todayPlusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Prisma seed is dev-only. Aborting because NODE_ENV=production.');
  }

  console.log('🌱 Seeding dev data (idempotent)...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const tenantPassword = process.env.SEED_TENANT_PASSWORD || 'tenant123';

  const [hashedAdminPassword, hashedTenantPassword] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(tenantPassword, 10),
  ]);

  // Admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@darital.local' },
    update: {
      password: hashedAdminPassword,
      fullName: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
    create: {
      email: 'admin@darital.local',
      password: hashedAdminPassword,
      fullName: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
  });

  // Tenants
  const tenantOne = await prisma.tenant.upsert({
    where: { email: 'tenant1@darital.local' },
    update: {
      fullName: 'Tenant One',
      phone: '+10000000001',
      password: hashedTenantPassword,
    },
    create: {
      id: 'tenant-seed-1',
      fullName: 'Tenant One',
      phone: '+10000000001',
      email: 'tenant1@darital.local',
      password: hashedTenantPassword,
    },
  });

  const tenantTwo = await prisma.tenant.upsert({
    where: { email: 'tenant2@darital.local' },
    update: {
      fullName: 'Tenant Two',
      phone: '+10000000002',
      password: hashedTenantPassword,
    },
    create: {
      id: 'tenant-seed-2',
      fullName: 'Tenant Two',
      phone: '+10000000002',
      email: 'tenant2@darital.local',
      password: hashedTenantPassword,
    },
  });

  // Units
  const unitOne = await prisma.unit.upsert({
    where: { id: 'unit-seed-101' },
    update: {
      name: 'Unit 101',
      price: new Prisma.Decimal(1000),
      status: UnitStatus.BUSY,
      area: 55,
      floor: 1,
    },
    create: {
      id: 'unit-seed-101',
      name: 'Unit 101',
      price: new Prisma.Decimal(1000),
      status: UnitStatus.BUSY,
      area: 55,
      floor: 1,
    },
  });

  const unitTwo = await prisma.unit.upsert({
    where: { id: 'unit-seed-102' },
    update: {
      name: 'Unit 102',
      price: new Prisma.Decimal(1200),
      status: UnitStatus.BUSY,
      area: 60,
      floor: 1,
    },
    create: {
      id: 'unit-seed-102',
      name: 'Unit 102',
      price: new Prisma.Decimal(1200),
      status: UnitStatus.BUSY,
      area: 60,
      floor: 1,
    },
  });

  // Contracts
  const contractOne = await prisma.contract.upsert({
    where: { id: 'contract-seed-1' },
    update: {
      tenantId: tenantOne.id,
      unitId: unitOne.id,
      startDate: todayPlusDays(-60),
      endDate: todayPlusDays(305),
      amount: new Prisma.Decimal(1000),
      status: ContractStatus.ACTIVE,
      pdfUrl: 'https://example.com/contracts/contract-seed-1.pdf',
    },
    create: {
      id: 'contract-seed-1',
      tenantId: tenantOne.id,
      unitId: unitOne.id,
      startDate: todayPlusDays(-60),
      endDate: todayPlusDays(305),
      amount: new Prisma.Decimal(1000),
      status: ContractStatus.ACTIVE,
      pdfUrl: 'https://example.com/contracts/contract-seed-1.pdf',
    },
  });

  const contractTwo = await prisma.contract.upsert({
    where: { id: 'contract-seed-2' },
    update: {
      tenantId: tenantTwo.id,
      unitId: unitTwo.id,
      startDate: todayPlusDays(-30),
      endDate: todayPlusDays(335),
      amount: new Prisma.Decimal(1200),
      status: ContractStatus.ACTIVE,
      pdfUrl: 'https://example.com/contracts/contract-seed-2.pdf',
    },
    create: {
      id: 'contract-seed-2',
      tenantId: tenantTwo.id,
      unitId: unitTwo.id,
      startDate: todayPlusDays(-30),
      endDate: todayPlusDays(335),
      amount: new Prisma.Decimal(1200),
      status: ContractStatus.ACTIVE,
      pdfUrl: 'https://example.com/contracts/contract-seed-2.pdf',
    },
  });

  // Invoices for contract one (past due + upcoming)
  const invoiceOnePast = await prisma.invoice.upsert({
    where: { id: 'invoice-seed-1a' },
    update: {
      contractId: contractOne.id,
      dueDate: todayPlusDays(-15),
      amount: new Prisma.Decimal(1000),
      status: InvoiceStatus.OVERDUE,
    },
    create: {
      id: 'invoice-seed-1a',
      contractId: contractOne.id,
      dueDate: todayPlusDays(-15),
      amount: new Prisma.Decimal(1000),
      status: InvoiceStatus.OVERDUE,
    },
  });

  const invoiceOneFuture = await prisma.invoice.upsert({
    where: { id: 'invoice-seed-1b' },
    update: {
      contractId: contractOne.id,
      dueDate: todayPlusDays(15),
      amount: new Prisma.Decimal(1000),
      status: InvoiceStatus.PENDING,
    },
    create: {
      id: 'invoice-seed-1b',
      contractId: contractOne.id,
      dueDate: todayPlusDays(15),
      amount: new Prisma.Decimal(1000),
      status: InvoiceStatus.PENDING,
    },
  });

  // Invoices for contract two (past due + upcoming)
  const invoiceTwoPast = await prisma.invoice.upsert({
    where: { id: 'invoice-seed-2a' },
    update: {
      contractId: contractTwo.id,
      dueDate: todayPlusDays(-10),
      amount: new Prisma.Decimal(1200),
      status: InvoiceStatus.OVERDUE,
    },
    create: {
      id: 'invoice-seed-2a',
      contractId: contractTwo.id,
      dueDate: todayPlusDays(-10),
      amount: new Prisma.Decimal(1200),
      status: InvoiceStatus.OVERDUE,
    },
  });

  const invoiceTwoFuture = await prisma.invoice.upsert({
    where: { id: 'invoice-seed-2b' },
    update: {
      contractId: contractTwo.id,
      dueDate: todayPlusDays(20),
      amount: new Prisma.Decimal(1200),
      status: InvoiceStatus.PENDING,
    },
    create: {
      id: 'invoice-seed-2b',
      contractId: contractTwo.id,
      dueDate: todayPlusDays(20),
      amount: new Prisma.Decimal(1200),
      status: InvoiceStatus.PENDING,
    },
  });

  // Payment against one overdue invoice
  await prisma.payment.upsert({
    where: { id: 'payment-seed-1' },
    update: {
      invoiceId: invoiceOnePast.id,
      method: PaymentMethod.OFFLINE,
      amount: new Prisma.Decimal(500),
      status: PaymentStatus.CONFIRMED,
      paidAt: todayPlusDays(-5),
    },
    create: {
      id: 'payment-seed-1',
      invoiceId: invoiceOnePast.id,
      method: PaymentMethod.OFFLINE,
      amount: new Prisma.Decimal(500),
      status: PaymentStatus.CONFIRMED,
      paidAt: todayPlusDays(-5),
    },
  });

  // Balances per tenant
  await prisma.balance.upsert({
    where: { tenantId: tenantOne.id },
    update: {
      current: new Prisma.Decimal(500), // 1000 overdue - 500 paid
    },
    create: {
      tenantId: tenantOne.id,
      current: new Prisma.Decimal(500),
    },
  });

  await prisma.balance.upsert({
    where: { tenantId: tenantTwo.id },
    update: {
      current: new Prisma.Decimal(1200), // full overdue amount
    },
    create: {
      tenantId: tenantTwo.id,
      current: new Prisma.Decimal(1200),
    },
  });

  const [tenantCount, contractCount, invoiceCount, paymentCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.contract.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
  ]);

  // Seed sample audit logs for testing activity logs feature
  console.log('📋 Seeding sample audit logs...');
  const sampleLogs = [
    {
      actorId: superAdmin.id,
      action: 'post.tenants',
      subject: tenantOne.id,
      meta: {
        method: 'POST',
        resource: 'tenants',
        action: 'create',
        description: 'Created tenant account'
      },
    },
    {
      actorId: superAdmin.id,
      action: 'patch.contracts.update',
      subject: contractOne.id,
      meta: {
        method: 'PATCH',
        resource: 'contracts',
        action: 'update',
        description: 'Updated contract details'
      },
    },
    {
      actorId: superAdmin.id,
      action: 'post.invoices',
      subject: invoiceOnePast.id,
      meta: {
        method: 'POST',
        resource: 'invoices',
        action: 'create',
        description: 'Generated monthly invoice'
      },
    },
    {
      actorId: superAdmin.id,
      action: 'patch.payments.update',
      subject: 'payment-seed-1',
      meta: {
        method: 'PATCH',
        resource: 'payments',
        action: 'confirm',
        description: 'Confirmed payment receipt'
      },
    },
  ];

  for (const log of sampleLogs) {
    await prisma.adminAuditLog.create({ data: log });
  }
  console.log('✅ Sample audit logs created');

  console.log('✅ Seed complete');
  console.log('Totals -> tenants:', tenantCount, 'contracts:', contractCount, 'invoices:', invoiceCount, 'payments:', paymentCount);
  console.log('👤 Admin login -> email: admin@darital.local password:', adminPassword);
  console.log('🧑‍💼 Tenant logins -> tenant1@darital.local / tenant2@darital.local password:', tenantPassword);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

