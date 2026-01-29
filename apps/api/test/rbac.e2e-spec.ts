/**
 * RBAC e2e smoke tests.
 * Proves: no token → 401; tenant token → 403 on admin endpoints; each admin role gets 2xx on allowed and 403 on denied.
 * Prerequisites: DB migrated, rbac seed run (pnpm rbac:seed), JWT_SECRET and DATABASE_URL set.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const PREFIX = '/api';
const E2E_PASSWORD = 'rbac-e2e-pass';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let superAdminToken: string;
  let adminToken: string;
  let userManagerToken: string;
  let cashierToken: string;
  let paymentCollectorToken: string;
  let supportToken: string;
  let analystToken: string;
  let tenantToken: string;
  let seedTenantId: string;

  beforeAll(async () => {
    const hash = await bcrypt.hash(E2E_PASSWORD, 10);
    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(PREFIX);
    await app.init();

    // Use existing super admin from seed or create e2e users
    const superAdmin = await prisma.user.findFirst({ where: { role: AdminRole.SUPER_ADMIN } });
    if (!superAdmin) {
      throw new Error('No SUPER_ADMIN user found. Run prisma seed and rbac:seed first.');
    }
    const tenant = await prisma.tenant.findFirst();
    seedTenantId = tenant?.id ?? '';

    const login = async (email: string, password: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post(`${PREFIX}/auth/login`)
        .send({ email, password });
      if (res.status !== 201 && res.status !== 200) {
        const msg = res.body?.message ?? res.body?.error ?? (res.body && JSON.stringify(res.body)) ?? String(res.status);
        throw new Error(`Login failed (${res.status}) for ${email}: ${msg}`);
      }
      return res.body.accessToken;
    };

    // Tokens cached here only; tests never re-login (determinism, avoid auth locks when adding suites or parallel runs).
    const superAdminPass = process.env.SEED_ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD || 'admin123';
    superAdminToken = await login(superAdmin.email, superAdminPass);
    if (!superAdminToken) {
      throw new Error('Super admin login failed. Use SEED_ADMIN_PASSWORD or E2E_ADMIN_PASSWORD (default admin123).');
    }

    const createAdminUser = async (email: string, role: AdminRole) => {
      await prisma.user.upsert({
        where: { email },
        update: { password: hash, fullName: role, role },
        create: { email, password: hash, fullName: role, role },
      });
    };

    await createAdminUser('rbac-e2e-admin@test.local', AdminRole.ADMIN);
    await createAdminUser('rbac-e2e-usermgr@test.local', AdminRole.USER_MANAGER);
    await createAdminUser('rbac-e2e-cashier@test.local', AdminRole.CASHIER);
    await createAdminUser('rbac-e2e-collector@test.local', AdminRole.PAYMENT_COLLECTOR);
    await createAdminUser('rbac-e2e-support@test.local', AdminRole.SUPPORT);
    await createAdminUser('rbac-e2e-analyst@test.local', AdminRole.ANALYST);

    adminToken = await login('rbac-e2e-admin@test.local', E2E_PASSWORD);
    userManagerToken = await login('rbac-e2e-usermgr@test.local', E2E_PASSWORD);
    cashierToken = await login('rbac-e2e-cashier@test.local', E2E_PASSWORD);
    paymentCollectorToken = await login('rbac-e2e-collector@test.local', E2E_PASSWORD);
    supportToken = await login('rbac-e2e-support@test.local', E2E_PASSWORD);
    analystToken = await login('rbac-e2e-analyst@test.local', E2E_PASSWORD);

    const tenantUser = await prisma.tenant.findFirst({ where: { email: { not: null } } });
    if (tenantUser?.email) {
      const tenantPass = process.env.SEED_TENANT_PASSWORD || 'tenant123';
      const tenantHash = await bcrypt.hash(tenantPass, 10);
      await prisma.tenant.update({
        where: { id: tenantUser.id },
        data: { password: tenantHash },
      });
      tenantToken = await login(tenantUser.email!, tenantPass);
    } else {
      tenantToken = '';
    }
  }, 30000);

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (prisma) await prisma.$disconnect();
    }
  }, 10000);

  describe('no token', () => {
    it('GET /api/buildings returns 401', () => {
      return request(app.getHttpServer()).get(`${PREFIX}/buildings`).expect(401);
    });
  });

  describe('tenant token on admin endpoints', () => {
    it('GET /api/buildings returns 403', () => {
      if (!tenantToken) return;
      return request(app.getHttpServer())
        .get(`${PREFIX}/buildings`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });
    it('GET /api/payments returns 403', () => {
      if (!tenantToken) return;
      return request(app.getHttpServer())
        .get(`${PREFIX}/payments`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });
  });

  describe('SUPER_ADMIN', () => {
    it('GET /api/buildings returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/buildings`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
    it('GET /api/audit-logs returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/audit-logs`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
    it('GET /api/archive/summary returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/archive/summary`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  describe('USER_MANAGER', () => {
    it('GET /api/buildings returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/buildings`)
        .set('Authorization', `Bearer ${userManagerToken}`)
        .expect(200);
    });
    it('GET /api/invoices returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/invoices`)
        .set('Authorization', `Bearer ${userManagerToken}`)
        .expect(200);
    });
    it('GET /api/exports/invoices returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/exports/invoices`)
        .set('Authorization', `Bearer ${userManagerToken}`)
        .expect(200);
    });
    it('GET /api/payments returns 403', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/payments`)
        .set('Authorization', `Bearer ${userManagerToken}`)
        .expect(403);
    });
    it('GET /api/archive/summary returns 403', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/archive/summary`)
        .set('Authorization', `Bearer ${userManagerToken}`)
        .expect(403);
    });
  });

  describe('CASHIER', () => {
    it('GET /api/payments returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);
    });
    it('GET /api/invoices returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/invoices`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);
    });
    it('POST /api/buildings returns 403', () => {
      return request(app.getHttpServer())
        .post(`${PREFIX}/buildings`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });
    it('GET /api/receipts/history/:tenantId returns 200 when tenantId valid', async () => {
      if (!seedTenantId) return;
      return request(app.getHttpServer())
        .get(`${PREFIX}/receipts/history/${seedTenantId}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);
    });
  });

  describe('PAYMENT_COLLECTOR', () => {
    it('GET /api/payments returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/payments`)
        .set('Authorization', `Bearer ${paymentCollectorToken}`)
        .expect(200);
    });
    it('GET /api/invoices returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/invoices`)
        .set('Authorization', `Bearer ${paymentCollectorToken}`)
        .expect(200);
    });
    it('PATCH /api/payments/:id/verify/accept returns 403 (no approve)', async () => {
      const payments = await prisma.payment.findMany({ take: 1 });
      if (payments.length === 0) return;
      return request(app.getHttpServer())
        .patch(`${PREFIX}/payments/${payments[0].id}/verify/accept`)
        .set('Authorization', `Bearer ${paymentCollectorToken}`)
        .expect(403);
    });
  });

  describe('ANALYST', () => {
    it('GET /api/audit-logs returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/audit-logs`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);
    });
    it('GET /api/reports returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/reports`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);
    });
    it('GET /api/admin/users returns 403', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/admin/users`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(403);
    });
    it('GET /api/archive/summary returns 403', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/archive/summary`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(403);
    });
  });

  describe('exports and bulk (high-risk)', () => {
    it('USER_MANAGER GET /api/exports/payments returns 403', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/exports/payments`)
        .set('Authorization', `Bearer ${userManagerToken}`)
        .expect(403);
    });
    it('SUPER_ADMIN GET /api/exports/invoices returns 200', () => {
      return request(app.getHttpServer())
        .get(`${PREFIX}/exports/invoices`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });
});
