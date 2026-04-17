import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrescriptionService } from './prescription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/strategy/jwt.strategy';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) { }

  @Get('patient/prescription/:appointmentId')
  @Roles('PATIENT')
  async downloadForPatient(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    return this.prescriptionService.downloadPrescription(
      appointmentId,
      user.userId,
      'PATIENT',
      res,
    );
  }

  @Get('doctor/prescription/:appointmentId')
  @Roles('DOCTOR')
  async downloadForDoctor(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    return this.prescriptionService.downloadPrescription(
      appointmentId,
      user.userId,
      'DOCTOR',
      res,
    );
  }

  @Get('admin/prescription/:appointmentId')
  @Roles('ADMIN')
  async downloadForAdmin(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    return this.prescriptionService.downloadPrescription(
      appointmentId,
      user.userId,
      'ADMIN',
      res,
    );
  }
}