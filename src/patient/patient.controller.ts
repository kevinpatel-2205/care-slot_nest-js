import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategy/jwt.strategy';
import { GetDoctorsQueryDto } from './dto/get-doctors-query.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateReviewDto } from './dto/create-review.dto';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Patient')
@ApiCookieAuth('token')
@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.patientService.getDashboard(user.userId);
  }

  @Get('doctors')
  @ApiOperation({
    summary: 'Get all approved doctors with search & filter',
  })
  @ApiResponse({ status: 200, description: 'Doctor list returned' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'specialization', required: false, type: String })
  getAllDoctors(@Query() query: GetDoctorsQueryDto) {
    return this.patientService.getAllDoctors(
      query.search,
      query.specialization,
    );
  }

  @Get('doctors/:doctorId')
  @ApiOperation({
    summary: 'Get single doctor details with available slots',
  })
  @ApiResponse({ status: 200, description: 'Doctor details returned' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  getDoctorDetails(@Param('doctorId') doctorId: string) {
    return this.patientService.getDoctorDetails(doctorId);
  }

  @Post('book-appointment')
  @ApiOperation({ summary: 'Book an appointment with a doctor' })
  @ApiResponse({
    status: 201,
    description: 'Appointment booked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Slot not available or already booked',
  })
  bookAppointment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BookAppointmentDto,
  ) {
    return this.patientService.bookAppointment(user.userId, dto);
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'Get all appointments of logged in patient',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment list returned',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAppointments(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetAppointmentsQueryDto,
  ) {
    const result = await this.patientService.getAppointments(
      user.userId,
      query.status,
      query.page ?? 1,
      query.limit ?? 5,
    );

    return {
      message: 'Success',
      data: {
        data: result.data,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
      },
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get patient profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.patientService.getProfile(user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update patient profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.patientService.updateProfile(user.userId, dto);
  }

  @Post('reviews')
  @ApiOperation({
    summary:
      'Submit a review for a doctor after completed appointment',
  })
  @ApiResponse({
    status: 201,
    description: 'Review submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Already reviewed or appointment not completed',
  })
  createReview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.patientService.createReview(user.userId, dto);
  }
}
