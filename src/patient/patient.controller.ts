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

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.patientService.getDashboard(user.userId);
  }

  @Get('doctors')
  getAllDoctors(@Query() query: GetDoctorsQueryDto) {
    return this.patientService.getAllDoctors(
      query.search,
      query.specialization,
    );
  }

  @Get('doctors/:doctorId')
  getDoctorDetails(@Param('doctorId') doctorId: string) {
    return this.patientService.getDoctorDetails(doctorId);
  }

  @Post('book-appointment')
  bookAppointment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BookAppointmentDto,
  ) {
    return this.patientService.bookAppointment(user.userId, dto);
  }

  @Get('appointments')
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
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.patientService.getProfile(user.userId);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.patientService.updateProfile(user.userId, dto);
  }

  @Post('reviews')
  createReview(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.patientService.createReview(user.userId, dto);
  }
}
