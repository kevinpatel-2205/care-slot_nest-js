import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors';
import { HttpExceptionFilter } from './common/filters';
import { ConfigService } from '@nestjs/config';

import cookieParser from 'cookie-parser';

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

  await app.listen(port, () => {
    console.log(`Server running on port ${port}
      URL: http://localhost:${port}
    `);
  });
}
bootstrap();
