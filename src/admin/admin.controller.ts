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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Post('doctor')
  createDoctor(@Body() dto: CreateDoctorDto) {
    return this.adminService.createDoctor(dto);
  }

  @Get('doctors')
  getAllDoctors(@Query() query: PaginationDto) {
    return this.adminService.getAllDoctors(query.page ?? 1, query.limit ?? 5);
  }

  @Patch('doctors/:doctorId/status')
  toggleDoctorStatus(
    @Param('doctorId') doctorId: string,
    @Body() dto: ToggleStatusDto,
  ) {
    return this.adminService.toggleDoctorStatus(doctorId, dto.isActive);
  }

  @Delete('doctors/:doctorId')
  deleteDoctor(@Param('doctorId') doctorId: string) {
    return this.adminService.deleteDoctor(doctorId);
  }

  @Get('patients')
  getPatients(@Query() query: PaginationDto) {
    return this.adminService.getPatients(
      query.page ?? 1,
      query.limit ?? 10,
      query.search,
    );
  }

  @Delete('patients/:patientId')
  deletePatient(@Param('patientId') patientId: string) {
    return this.adminService.deletePatient(patientId);
  }

  @Get('appointments')
  getAppointments(@Query() query: AppointmentQueryDto) {
    return this.adminService.getAppointments(
      query.page ?? 1,
      query.limit ?? 10,
      query.status,
    );
  }

  @Get('reviews')
  getPendingReviews(@Query() query: PaginationDto) {
    return this.adminService.getPendingReviews(
      query.page ?? 1,
      query.limit ?? 5,
    );
  }

  @Patch('reviews/:reviewId/approve')
  approveReview(@Param('reviewId') reviewId: string) {
    return this.adminService.approveReview(reviewId);
  }

  @Delete('reviews/:reviewId')
  deleteReview(@Param('reviewId') reviewId: string) {
    return this.adminService.deleteReview(reviewId);
  }

  @Patch('doctors/:doctorId/commission')
  updateDoctorCommission(
    @Param('doctorId') doctorId: string,
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.adminService.updateDoctorCommission(doctorId, dto.commission);
  }
}
