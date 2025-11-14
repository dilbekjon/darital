import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { SentryService } from './sentry/sentry.service';
import * as fs from 'fs';

async function bootstrap() {
  // Handle unhandled promise rejections (like Telegram polling conflicts)
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    if (reason?.response?.error_code === 409 && reason?.on?.method === 'getUpdates') {
      console.error('⚠️ Telegram bot polling conflict detected. Another instance may be running.');
      console.error('The bot will continue but polling may not work. To fix: Stop all other bot instances.');
      // Don't crash the app, just log the error
      return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Ensure uploads directory exists
  const uploadsDir = join(__dirname, '..', 'uploads', 'chat');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Get SentryService from the app context
  const sentryService = app.get(SentryService, { strict: false });
  
  // Enable global exception filter with SentryService
  app.useGlobalFilters(new AllExceptionsFilter(sentryService));
  
  // Enable CORS - supports both development and production
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',  // Admin panel (dev)
        'http://localhost:3001',  // API (dev)
        'http://localhost:3002',  // Tenant portal (dev)
      ];
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Darital API')
    .setDescription('Darital Final - API Documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('health', 'Health check endpoints')
    .addTag('auth', 'Authentication endpoints')
    .addTag('units', 'Unit management')
    .addTag('tenants', 'Tenant management')
    .addTag('contracts', 'Contract management')
    .addTag('invoices', 'Invoice management')
    .addTag('payments', 'Payment management')
    .addTag('balances', 'Balance overview and adjustments')
    .addTag('notifications', 'Notifications')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Map root to docs for convenience
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req: any, res: any) => {
    res.redirect(302, '/docs');
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/docs`);
  console.log(`✅ Chat routes registered: /api/conversations`);
}

bootstrap();

