import { SmsService } from './sms.service';

describe('SmsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    (global as any).fetch = undefined;
  });

  it('does not double-prefix DevSMS bearer token', async () => {
    process.env.SMS_PROVIDER = 'devsms';
    process.env.DEVSMS_TOKEN = 'Bearer abc123';

    const fetchMock = jest.fn(async (_url: string, init?: any) => {
      const auth = init?.headers?.Authorization ?? init?.headers?.authorization;
      if (auth !== 'Bearer abc123') {
        return {
          ok: false,
          async json() {
            return { message: 'unauthorized' };
          },
        } as any;
      }
      return {
        ok: true,
        async json() {
          return { success: true, id: 'msg-1' };
        },
      } as any;
    });

    (global as any).fetch = fetchMock;

    const service = new SmsService();
    const result = await service.sendSms('+998 90 123 45 67', 'hello');

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats Eskiz status=error as failure even when HTTP 200', async () => {
    process.env.SMS_PROVIDER = 'eskiz';
    process.env.ESKIZ_EMAIL = 'test@example.com';
    process.env.ESKIZ_PASSWORD = 'pass';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        async json() {
          return { data: { token: 'eskiz-token' } };
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        async json() {
          return { status: 'error', message: 'bad request' };
        },
      });

    (global as any).fetch = fetchMock;

    const service = new SmsService();
    const result = await service.sendSms('901234567', 'hello');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses reset template when SMS_TENANT_RESET_TEMPLATE is set', async () => {
    process.env.SMS_PROVIDER = 'devsms';
    process.env.DEVSMS_TOKEN = 'abc123';
    process.env.SMS_TENANT_RESET_TEMPLATE =
      'Sizning Darital Arenda tizimiga kirish parolingiz: {{CODE}}\\n\\nIltimos, tizimga kirgandan so‘ng parolingizni o‘zgartiring.';

    const fetchMock = jest.fn(async (_url: string, init?: any) => {
      const body = JSON.parse(init?.body || '{}');
      expect(body.message).toContain('12345678');
      expect(body.message).toContain('parolingiz');
      expect(body.message).toContain('\n\n');
      return {
        ok: true,
        async json() {
          return { success: true, id: 'msg-2' };
        },
      } as any;
    });

    (global as any).fetch = fetchMock;

    const service = new SmsService();
    const result = await service.sendTenantPasswordResetCode('998901234567', 'Test User', '12345678');
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
