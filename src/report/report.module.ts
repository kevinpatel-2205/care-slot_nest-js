import { Module } from '@nestjs/common';
import { PrescriptionController } from './prescription/prescription.controller';
import { PrescriptionService } from './prescription/prescription.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PdfService } from './pdf.service';
import { ExcelService } from './excel.service';

@Module({
  controllers: [PrescriptionController, ReportController],
  providers: [PrescriptionService, ReportService, PdfService, ExcelService],
})
export class ReportModule { }