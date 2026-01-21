import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type Language = 'uz' | 'ru' | 'en';

export interface TemplateVariable {
  key: string;
  description: string;
  example: string;
}

const DEFAULT_TEMPLATES = [
  {
    code: 'PAYMENT_REMINDER',
    name: 'Payment Reminder',
    description: 'Sent before payment due date',
    subjectUz: "To'lov eslatmasi - {amount} so'm",
    subjectRu: 'Напоминание об оплате - {amount} сум',
    subjectEn: 'Payment Reminder - {amount} UZS',
    bodyUz: `Hurmatli {tenant_name},

{due_date} sanasida {amount} so'm miqdorida to'lov amalga oshirilishi kerak.

To'lovni o'z vaqtida amalga oshirishingizni so'raymiz.

Hurmat bilan,
Darital jamoasi`,
    bodyRu: `Уважаемый(ая) {tenant_name},

Напоминаем, что {due_date} должна быть произведена оплата в размере {amount} сум.

Просим произвести оплату вовремя.

С уважением,
Команда Darital`,
    bodyEn: `Dear {tenant_name},

This is a reminder that a payment of {amount} UZS is due on {due_date}.

Please make sure to complete the payment on time.

Best regards,
Darital Team`,
    variables: [
      { key: 'tenant_name', description: 'Tenant full name', example: 'John Doe' },
      { key: 'amount', description: 'Payment amount', example: '1,500,000' },
      { key: 'due_date', description: 'Payment due date', example: '2024-01-15' },
      { key: 'unit_name', description: 'Unit name', example: 'Unit 101' },
    ],
  },
  {
    code: 'PAYMENT_CONFIRMED',
    name: 'Payment Confirmed',
    description: 'Sent when payment is confirmed',
    subjectUz: "To'lov tasdiqlandi - {amount} so'm",
    subjectRu: 'Оплата подтверждена - {amount} сум',
    subjectEn: 'Payment Confirmed - {amount} UZS',
    bodyUz: `Hurmatli {tenant_name},

{amount} so'm miqdoridagi to'lovingiz muvaffaqiyatli qabul qilindi.

To'lov sanasi: {payment_date}
To'lov usuli: {payment_method}

Rahmat!

Hurmat bilan,
Darital jamoasi`,
    bodyRu: `Уважаемый(ая) {tenant_name},

Ваш платеж в размере {amount} сум успешно получен.

Дата оплаты: {payment_date}
Способ оплаты: {payment_method}

Спасибо!

С уважением,
Команда Darital`,
    bodyEn: `Dear {tenant_name},

Your payment of {amount} UZS has been successfully received.

Payment date: {payment_date}
Payment method: {payment_method}

Thank you!

Best regards,
Darital Team`,
    variables: [
      { key: 'tenant_name', description: 'Tenant full name', example: 'John Doe' },
      { key: 'amount', description: 'Payment amount', example: '1,500,000' },
      { key: 'payment_date', description: 'Date of payment', example: '2024-01-10' },
      { key: 'payment_method', description: 'Payment method', example: 'Online' },
    ],
  },
  {
    code: 'CONTRACT_EXPIRING',
    name: 'Contract Expiring',
    description: 'Sent before contract expiration',
    subjectUz: 'Shartnoma muddati tugayapti',
    subjectRu: 'Срок действия договора истекает',
    subjectEn: 'Contract Expiring Soon',
    bodyUz: `Hurmatli {tenant_name},

{unit_name} uchun shartnomangiz {end_date} sanasida tugaydi.

Shartnomani yangilash uchun biz bilan bog'laning.

Hurmat bilan,
Darital jamoasi`,
    bodyRu: `Уважаемый(ая) {tenant_name},

Ваш договор на {unit_name} истекает {end_date}.

Пожалуйста, свяжитесь с нами для продления договора.

С уважением,
Команда Darital`,
    bodyEn: `Dear {tenant_name},

Your contract for {unit_name} will expire on {end_date}.

Please contact us to renew your contract.

Best regards,
Darital Team`,
    variables: [
      { key: 'tenant_name', description: 'Tenant full name', example: 'John Doe' },
      { key: 'unit_name', description: 'Unit name', example: 'Unit 101' },
      { key: 'end_date', description: 'Contract end date', example: '2024-12-31' },
    ],
  },
  {
    code: 'WELCOME',
    name: 'Welcome Email',
    description: 'Sent to new tenants',
    subjectUz: 'Darital ga xush kelibsiz!',
    subjectRu: 'Добро пожаловать в Darital!',
    subjectEn: 'Welcome to Darital!',
    bodyUz: `Hurmatli {tenant_name},

Darital ga xush kelibsiz! Sizning hisobingiz muvaffaqiyatli yaratildi.

Kirish ma'lumotlari:
Email: {email}

Shaxsiy kabinetingizga kirish uchun quyidagi havoladan foydalaning:
{portal_url}

Hurmat bilan,
Darital jamoasi`,
    bodyRu: `Уважаемый(ая) {tenant_name},

Добро пожаловать в Darital! Ваш аккаунт успешно создан.

Данные для входа:
Email: {email}

Для входа в личный кабинет перейдите по ссылке:
{portal_url}

С уважением,
Команда Darital`,
    bodyEn: `Dear {tenant_name},

Welcome to Darital! Your account has been successfully created.

Login details:
Email: {email}

Access your portal here:
{portal_url}

Best regards,
Darital Team`,
    variables: [
      { key: 'tenant_name', description: 'Tenant full name', example: 'John Doe' },
      { key: 'email', description: 'Tenant email', example: 'john@example.com' },
      { key: 'portal_url', description: 'Tenant portal URL', example: 'https://tenant.darital.uz' },
    ],
  },
  {
    code: 'PAYMENT_OVERDUE',
    name: 'Payment Overdue',
    description: 'Sent when payment is overdue',
    subjectUz: "To'lov muddati o'tdi - {amount} so'm",
    subjectRu: 'Просроченный платеж - {amount} сум',
    subjectEn: 'Payment Overdue - {amount} UZS',
    bodyUz: `Hurmatli {tenant_name},

{due_date} sanasida to'lanishi kerak bo'lgan {amount} so'm miqdoridagi to'lov hali amalga oshirilmagan.

Iltimos, to'lovni imkon qadar tezroq amalga oshiring.

Hurmat bilan,
Darital jamoasi`,
    bodyRu: `Уважаемый(ая) {tenant_name},

Платеж в размере {amount} сум, который должен был быть произведен {due_date}, до сих пор не оплачен.

Пожалуйста, произведите оплату как можно скорее.

С уважением,
Команда Darital`,
    bodyEn: `Dear {tenant_name},

The payment of {amount} UZS that was due on {due_date} has not been received.

Please make the payment as soon as possible.

Best regards,
Darital Team`,
    variables: [
      { key: 'tenant_name', description: 'Tenant full name', example: 'John Doe' },
      { key: 'amount', description: 'Payment amount', example: '1,500,000' },
      { key: 'due_date', description: 'Original due date', example: '2024-01-15' },
      { key: 'days_overdue', description: 'Days overdue', example: '5' },
    ],
  },
];

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findByCode(code: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { code },
    });
    if (!template) {
      throw new NotFoundException(`Template with code ${code} not found`);
    }
    return template;
  }

  async findOne(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Template not found`);
    }
    return template;
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    subjectUz?: string;
    subjectRu?: string;
    subjectEn?: string;
    bodyUz?: string;
    bodyRu?: string;
    bodyEn?: string;
    isActive?: boolean;
  }) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  async preview(id: string, language: Language, sampleData?: Record<string, string>) {
    const template = await this.findOne(id);
    
    const subjectKey = `subject${language.charAt(0).toUpperCase() + language.slice(1)}` as keyof typeof template;
    const bodyKey = `body${language.charAt(0).toUpperCase() + language.slice(1)}` as keyof typeof template;
    
    let subject = template[subjectKey] as string;
    let body = template[bodyKey] as string;

    // Replace variables with sample data
    const variables = (template.variables as unknown as TemplateVariable[]) || [];
    const data = sampleData || {};
    
    variables.forEach((v) => {
      const value = data[v.key] || v.example;
      const regex = new RegExp(`\\{${v.key}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return {
      subject,
      body,
      variables,
    };
  }

  async render(code: string, language: Language, data: Record<string, string>) {
    const template = await this.findByCode(code);
    
    if (!template.isActive) {
      throw new BadRequestException(`Template ${code} is not active`);
    }
    
    const subjectKey = `subject${language.charAt(0).toUpperCase() + language.slice(1)}` as keyof typeof template;
    const bodyKey = `body${language.charAt(0).toUpperCase() + language.slice(1)}` as keyof typeof template;
    
    let subject = template[subjectKey] as string;
    let body = template[bodyKey] as string;

    // Replace variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
  }

  async seedDefaults() {
    let seeded = 0;
    for (const template of DEFAULT_TEMPLATES) {
      try {
        // Use upsert to handle race conditions - if it exists, update it; if not, create it
        await this.prisma.emailTemplate.upsert({
          where: { code: template.code },
          update: template, // Update with default values if it exists
          create: template,
        });
        seeded++;
      } catch (error: any) {
        // If it's a unique constraint error, the template already exists (race condition)
        // This is fine, just continue to the next template
        if (error?.code === 'P2002' && error?.meta?.target?.includes('code')) {
          // Template already exists, skip it
          continue;
        }
        // For other errors, log and rethrow
        throw error;
      }
    }
    return { seeded };
  }

  async resetToDefault(code: string) {
    const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.code === code);
    if (!defaultTemplate) {
      throw new NotFoundException(`No default template for code ${code}`);
    }

    return this.prisma.emailTemplate.upsert({
      where: { code },
      update: defaultTemplate,
      create: defaultTemplate,
    });
  }
}
