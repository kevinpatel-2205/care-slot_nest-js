import { Module } from '@nestjs/common';
import { PrescriptionController } from './prescription/prescription.controller';
import { PrescriptionService } from './prescription/prescription.service';

@Module({
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
})
export class ReportModule { }