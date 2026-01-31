import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  // Run Prisma migrations in production before starting the server
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('🔄 Running Prisma migrations...');
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Prisma migrations completed');
    } catch (error: any) {
      console.error('❌ Prisma migration failed:', error?.message || error);
      console.error('   Continuing anyway - migrations may have already been applied');
    }
  }

  // Handle unhandled promise rejections (like Telegram polling conflicts and database connection errors)
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    if (reason?.response?.error_code === 409 && reason?.on?.method === 'getUpdates') {
      console.error('⚠️ Telegram bot polling conflict detected. Another instance may be running.');
      console.error('The bot will continue but polling may not work. To fix: Stop all other bot instances.');
      // Don't crash the app, just log the error
      return;
    }
    
    // Handle Prisma database connection errors
    if (reason?.code === 'P1001' || reason?.name === 'PrismaClientInitializationError') {
      console.error('\n❌ Database Connection Error:');
      console.error(`   ${reason?.message || 'Cannot connect to database'}`);
      console.error('\n📋 To fix this:');
      console.error('   1. Make sure Docker is running');
      console.error('   2. Start the database: docker compose up -d postgres');
      console.error('   3. Wait a few seconds for the database to be ready');
      console.error('   4. Try starting the backend again\n');
      process.exit(1);
    }
    
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  
  // Ensure uploads directory exists
  const uploadsDir = join(__dirname, '..', 'uploads', 'chat');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Serve static files from uploads directory (both /uploads/ and /api/uploads/ for cross-origin chat media)
  const uploadsPath = join(__dirname, '..', 'uploads');
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });
  app.useStaticAssets(uploadsPath, { prefix: '/api/uploads/' });

  // AllExceptionsFilter is now registered via APP_FILTER in AppModule
  // No need to manually register it here
  
  // Enable CORS - supports both development and production
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',  // Admin panel (dev)
        'http://localhost:3001',  // API (dev)
        'http://localhost:3002',  // Tenant portal (dev)
      ];
  
  // Log CORS configuration for debugging
  console.log('🌐 CORS Origins configured:', corsOrigins);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log blocked origins for debugging
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      console.warn(`   Allowed origins: ${corsOrigins.join(', ')}`);
      
      return callback(new Error('Not allowed by CORS'), false);
    },
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
  
  // Use Render-provided port or fallback to 3000
  const port = process.env.PORT || 3000;
  
  try {
    await app.listen(port, '0.0.0.0');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 API SERVER STARTED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📍 API URL: http://0.0.0.0:${port}`);
    console.log(`📚 Swagger docs: http://0.0.0.0:${port}/docs`);
    console.log(`💬 Chat routes: /api/conversations`);
    console.log(`🌐 Listening on port ${port}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ FAILED TO START API SERVER');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`Error: ${error?.message || 'Unknown error'}`);
    if (error?.code === 'EADDRINUSE') {
      console.error('');
      console.error('Port 3001 is already in use. Either:');
      console.error('  1. Stop the existing process using port 3001');
      console.error('  2. Use a different PORT: PORT=3002 pnpm dev');
    }
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }
}

bootstrap();

