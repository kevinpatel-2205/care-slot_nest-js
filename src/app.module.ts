import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { PaymentModule } from './payment/payment.module';
import { HomeModule } from './home/home.module';
import { AiModule } from './ai/ai.module';
import envConfig from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    PrismaModule,
    AuthModule,
    AdminModule,
    DoctorModule,
    PatientModule,
    PaymentModule,
    HomeModule,
    AiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
