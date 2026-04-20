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

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Doctor')
@ApiCookieAuth('token')
@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get doctor dashboard with earnings and stats' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.doctorService.getDashboard(user.userId);
  }

  @Get('upcomingAppointments')
  @ApiOperation({ summary: 'Get upcoming appointments for doctor' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming appointments returned',
  })
  getUpcomingAppointments(@CurrentUser() user: JwtPayload) {
    return this.doctorService.getUpcomingAppointments(user.userId);
  }

  @Get('allAppointments')
  @ApiOperation({
    summary:
      'Get all appointments with pagination and status filter',
  })
  @ApiResponse({
    status: 200,
    description: 'All appointments returned',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({ summary: 'Confirm or Complete an appointment' })
  @ApiResponse({
    status: 200,
    description: 'Appointment status updated',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
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
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
  cancelAppointment(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.doctorService.cancelAppointment(
      user.userId,
      appointmentId,
    );
  }

  @Get('patients')
  @ApiOperation({ summary: 'Get all patients of this doctor' })
  @ApiResponse({
    status: 200,
    description: 'Patient list returned',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({
    summary: 'Get specific patient full details',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient details returned',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
  })
  getDoctorPatientDetails(
    @CurrentUser() user: JwtPayload,
    @Param('patientId') patientId: string,
  ) {
    return this.doctorService.getDoctorPatientDetails(
      user.userId,
      patientId,
    );
  }

  @Get('availableSlots')
  @ApiOperation({ summary: 'Get available slots of doctor' })
  @ApiResponse({
    status: 200,
    description: 'Available slots returned',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({
    summary: 'Add new available time slots for a date',
  })
  @ApiResponse({
    status: 201,
    description: 'Slots added successfully',
  })
  addAvailableSlots(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddSlotsDto,
  ) {
    return this.doctorService.addAvailableSlots(
      user.userId,
      dto,
    );
  }

  @Post('addBulkAvailableSlots')
  @ApiOperation({
    summary:
      'Add bulk slots for a date range with interval',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk slots added successfully',
  })
  addBulkAvailableSlots(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkSlotsDto,
  ) {
    return this.doctorService.addBulkAvailableSlots(
      user.userId,
      dto,
    );
  }

  @Delete('slots/:date')
  @ApiOperation({
    summary: 'Delete all slots for a specific date',
  })
  @ApiResponse({
    status: 200,
    description: 'Slots deleted successfully',
  })
  deleteAvailableSlot(
    @CurrentUser() user: JwtPayload,
    @Param('date') date: string,
  ) {
    return this.doctorService.deleteAvailableSlot(
      user.userId,
      date,
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get doctor profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  getDoctorProfile(@CurrentUser() user: JwtPayload) {
    return this.doctorService.getDoctorProfile(user.userId);
  }

  @Put('updateProfile')
  @ApiOperation({
    summary: 'Update doctor profile details',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  updateDoctorProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.updateDoctorProfile(
      user.userId,
      dto,
    );
  }

  @Get('reviews')
  @ApiOperation({
    summary: 'Get all approved reviews for this doctor',
  })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({
    summary:
      'Add prescription for a completed appointment',
  })
  @ApiResponse({
    status: 201,
    description: 'Prescription added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Prescription already exists',
  })
  addPrescription(
    @CurrentUser() user: JwtPayload,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: AddPrescriptionDto,
  ) {
    return this.doctorService.addPrescription(
      user.userId,
      appointmentId,
      dto,
    );
  }
}
