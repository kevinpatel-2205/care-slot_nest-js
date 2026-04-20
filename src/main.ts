import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors';
import { HttpExceptionFilter } from './common/filters';
import { ConfigService } from '@nestjs/config';

import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const clientUrl = configService.get<string>('app.clientUrl');
  const port = configService.get<number>('app.port') ?? 3000;

  app.use(cookieParser());

  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('CareSlot Nest JS API')
    .setDescription('Doctor Appointment Management System - API Documentation')
    .setVersion('1.0')
    .addTag('Auth', 'Authentication & User Management')
    .addTag('Patient', 'Patient Module')
    .addTag('Doctor', 'Doctor Module')
    .addTag('Admin', 'Admin Module')
    .addTag('Payment', 'Payment Module')
    .addTag('AI', 'AI Chat Module')
    .addTag('Report', 'PDF & Excel Reports')
    .addCookieAuth('token')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.resolve(process.cwd(), 'swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');
  console.log(`Swagger JSON saved to: ${outputPath}`);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port, () => {
    console.log(`Server running on port ${port}
      URL: http://localhost:${port}
    `);
    console.log(`Swagger docs available at
       URL: http://localhost:${port}/api/docs
    `);
  });
}

bootstrap();
