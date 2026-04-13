import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import envConfig from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    PrismaModule,
    AuthModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
