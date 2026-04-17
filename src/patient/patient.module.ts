import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { AiModule } from '../ai/ai.module';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports: [AiModule, MailModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
