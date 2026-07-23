import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import * as path from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const logger = new Logger('Bootstrap');

// Prevent process from crashing on unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception — keeping process alive', error.stack || error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — keeping process alive', reason);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Serve uploaded files statically
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: false, // handled per-route
  }));
  app.use(compression());

  // CORS
  const rawCorsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:8081');
  app.enableCors({
    origin: rawCorsOrigin === '*' ? true : rawCorsOrigin.split(','),
    credentials: true,
  });

  // OG banner route for invite link previews (outside api prefix)
  const expressApp = app.getHttpAdapter().getInstance();
  const prisma = app.get(PrismaService);

  expressApp.get('/join/:token', async (req: any, res: any) => {
    try {
      const invite = await prisma.circleInvite.findUnique({
        where: { token: req.params.token },
        include: {
          circle: { select: { name: true, emoji: true } },
        },
      });

      const circleName = escapeHtml(invite?.circle?.name || 'a circle');
      const emoji = escapeHtml(invite?.circle?.emoji || '');
      const title = escapeHtml(`${emoji} Join ${circleName} on Sivena`.trim());
      const description = escapeHtml(invite
        ? `You've been invited to join ${circleName}. Tap to accept and start coordinating together!`
        : 'This invite link is no longer valid.');
      const apiBase = process.env.APP_URL || 'https://sivena.app';
      const url = `${apiBase}/join/${req.params.token}`;
      const deepLink = `sivena://join/${req.params.token}`;

      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src https:; frame-ancestors 'none'");
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sivena">
  <meta property="og:image" content="https://sivena.app/api/og">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://sivena.app/api/og">
  ${invite ? `<script>
    function tryOpen() {
      var ua = navigator.userAgent || '';
      var isAndroid = /android/i.test(ua);
      if (isAndroid) {
        window.location.href = 'intent://join/${req.params.token}#Intent;scheme=sivena;package=com.sivena.app;end';
      } else {
        window.location.href = '${deepLink}';
      }
    }
    setTimeout(tryOpen, 300);
  </script>` : ''}
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#F8F9FA;color:#1a1a2e;">
  <div style="text-align:center;padding:48px 32px;max-width:400px;">
    <div style="font-size:48px;margin-bottom:16px;">${emoji || '\u{1F49C}'}</div>
    <h1 style="font-size:24px;margin:0 0 8px;">${invite ? `Join ${circleName}` : 'Invite Not Found'}</h1>
    <p style="color:#6b7280;font-size:16px;line-height:1.5;margin:0 0 24px;">${description}</p>
    ${invite ? `<a href="${deepLink}" onclick="tryOpen();return false;" style="display:inline-block;background:#6C63FF;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:16px;">Open in Sivena</a>` : ''}
  </div>
</body>
</html>`);
    } catch {
      res.status(500).send('Something went wrong');
    }
  });

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Global exception filter — catches all unhandled errors so they never crash the server
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sivena API')
    .setDescription('The Life Coordination Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Health check endpoint (outside global prefix for container health probes)
  app.getHttpAdapter().get('/api/v1/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Sivena API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received — shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
