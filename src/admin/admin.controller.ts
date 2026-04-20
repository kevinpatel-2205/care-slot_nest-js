import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Admin')
@ApiCookieAuth('token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get admin dashboard with top doctors and monthly stats',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Post('doctor')
  @ApiOperation({ summary: 'Create a new doctor account' })
  @ApiResponse({ status: 201, description: 'Doctor created successfully' })
  @ApiResponse({ status: 400, description: 'Doctor already exists' })
  createDoctor(@Body() dto: CreateDoctorDto) {
    return this.adminService.createDoctor(dto);
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Get all doctors with pagination' })
  @ApiResponse({ status: 200, description: 'Doctor list returned' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllDoctors(@Query() query: PaginationDto) {
    return this.adminService.getAllDoctors(
      query.page ?? 1,
      query.limit ?? 5,
    );
  }

  @Patch('doctors/:doctorId/status')
  @ApiOperation({
    summary: 'Activate or deactivate a doctor account',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor status updated',
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
  })
  toggleDoctorStatus(
    @Param('doctorId') doctorId: string,
    @Body() dto: ToggleStatusDto,
  ) {
    return this.adminService.toggleDoctorStatus(
      doctorId,
      dto.isActive,
    );
  }

  @Delete('doctors/:doctorId')
  @ApiOperation({
    summary: 'Soft delete a doctor and all related data',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
  })
  deleteDoctor(@Param('doctorId') doctorId: string) {
    return this.adminService.deleteDoctor(doctorId);
  }

  @Get('patients')
  @ApiOperation({
    summary: 'Get all patients with pagination and search',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient list returned',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getPatients(@Query() query: PaginationDto) {
    return this.adminService.getPatients(
      query.page ?? 1,
      query.limit ?? 10,
      query.search,
    );
  }

  @Delete('patients/:patientId')
  @ApiOperation({
    summary: 'Soft delete a patient and all related data',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Patient not found',
  })
  deletePatient(@Param('patientId') patientId: string) {
    return this.adminService.deletePatient(patientId);
  }

  @Get('appointments')
  @ApiOperation({
    summary:
      'Get all appointments with pagination and status filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments returned',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAppointments(@Query() query: AppointmentQueryDto) {
    return this.adminService.getAppointments(
      query.page ?? 1,
      query.limit ?? 10,
      query.status,
    );
  }

  @Get('reviews')
  @ApiOperation({
    summary:
      'Get all pending reviews waiting for approval',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending reviews returned',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPendingReviews(@Query() query: PaginationDto) {
    return this.adminService.getPendingReviews(
      query.page ?? 1,
      query.limit ?? 5,
    );
  }

  @Patch('reviews/:reviewId/approve')
  @ApiOperation({ summary: 'Approve a pending review' })
  @ApiResponse({
    status: 200,
    description: 'Review approved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  approveReview(@Param('reviewId') reviewId: string) {
    return this.adminService.approveReview(reviewId);
  }

  @Delete('reviews/:reviewId')
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  deleteReview(@Param('reviewId') reviewId: string) {
    return this.adminService.deleteReview(reviewId);
  }

  @Patch('doctors/:doctorId/commission')
  @ApiOperation({
    summary: 'Update doctor commission percentage',
  })
  @ApiResponse({
    status: 200,
    description: 'Commission updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
  })
  updateDoctorCommission(
    @Param('doctorId') doctorId: string,
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.adminService.updateDoctorCommission(
      doctorId,
      dto.commission,
    );
  }
}
