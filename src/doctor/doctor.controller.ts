import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategy/jwt.strategy';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { PaginationDto } from './dto/pagination.dto';
import { BulkSlotsDto } from './dto/bulk-slots.dto';
import { AddSlotsDto } from './dto/add-slots.dto';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';
import { AddPrescriptionDto } from './dto/add-prescription.dto';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.doctorService.getDashboard(user.userId);
  }

  @Get('upcomingAppointments')
  getUpcomingAppointments(@CurrentUser() user: JwtPayload) {
    return this.doctorService.getUpcomingAppointments(user.userId);
  }

  @Get('allAppointments')
  getAllAppointments(
    @CurrentUser() user: JwtPayload,
    @Query() query: AppointmentQueryDto,
  ) {
    return this.doctorService.getAllAppointments(
      user.userId,
      query.page ?? 1,
      query.limit ?? 5,
      query.status,
    );
  }

  @Put('changeStatus/:appointmentId')
  changeAppointmentStatus(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.doctorService.changeAppointmentStatus(
      user.userId,
      appointmentId,
    );
  }

  @Put('cancel/:appointmentId')
  cancelAppointment(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.doctorService.cancelAppointment(user.userId, appointmentId);
  }

  @Get('patients')
  getDoctorPatients(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationDto,
  ) {
    return this.doctorService.getDoctorPatients(
      user.userId,
      query.page ?? 1,
      query.limit ?? 5,
    );
  }

  @Get('patients/:patientId')
  getDoctorPatientDetails(
    @CurrentUser() user: JwtPayload,
    @Param('patientId') patientId: string,
  ) {
    return this.doctorService.getDoctorPatientDetails(user.userId, patientId);
  }

  @Get('availableSlots')
  getAvailableSlots(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationDto,
  ) {
    return this.doctorService.getAvailableSlots(
      user.userId,
      query.page ?? 1,
      query.limit ?? 5,
    );
  }

  @Post('addAvailableSlots')
  addAvailableSlots(@CurrentUser() user: JwtPayload, @Body() dto: AddSlotsDto) {
    return this.doctorService.addAvailableSlots(user.userId, dto);
  }

  @Post('addBulkAvailableSlots')
  addBulkAvailableSlots(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkSlotsDto,
  ) {
    return this.doctorService.addBulkAvailableSlots(user.userId, dto);
  }

  @Delete('slots/:date')
  deleteAvailableSlot(
    @CurrentUser() user: JwtPayload,
    @Param('date') date: string,
  ) {
    return this.doctorService.deleteAvailableSlot(user.userId, date);
  }

  @Get('profile')
  getDoctorProfile(@CurrentUser() user: JwtPayload) {
    return this.doctorService.getDoctorProfile(user.userId);
  }

  @Put('updateProfile')
  updateDoctorProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.updateDoctorProfile(user.userId, dto);
  }

  @Get('reviews')
  getDoctorReviews(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationDto,
  ) {
    return this.doctorService.getDoctorReviews(
      user.userId,
      query.page ?? 1,
      query.limit ?? 5,
    );
  }

  @Post('prescription/:appointmentId')
  addPrescription(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: AddPrescriptionDto,
  ) {
    return this.doctorService.addPrescription(user.userId, appointmentId, dto);
  }
}
