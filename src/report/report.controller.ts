import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { PdfService } from './pdf.service';
import { ExcelService } from './excel.service';
import { AppointmentStatus } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common';
import type { JwtPayload } from '../auth/strategy/jwt.strategy';
import { ApiTags, ApiCookieAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

// ── Column header constants ────────────────────────────────────────────────

const PATIENT_APPOINTMENT_HEADERS = [
  'No',
  'Doctor Name',
  'Doctor Email',
  'Specialization',
  'Date',
  'Time',
  'Status',
  'Payment',
  'Fee (₹)',
];

const DOCTOR_APPOINTMENT_HEADERS = [
  'No',
  'Patient Name',
  'Patient Email',
  'Date',
  'Time',
  'Status',
  'Payment',
  'Fee (₹)',
];

const ADMIN_DOCTOR_HEADERS = [
  'No',
  'Name',
  'Email',
  'Phone',
  'Specialization',
  'Experience (yrs)',
  'Fee (₹)',
  'Commission (%)',
  'Rating',
  'Reviews',
  'Status',
];

const ADMIN_PATIENT_HEADERS = [
  'No',
  'Name',
  'Email',
  'Phone',
  'Gender',
  'Date of Birth',
  'Address',
];

const ADMIN_APPOINTMENT_HEADERS = [
  'No',
  'Patient',
  'Doctor',
  'Specialization',
  'Date',
  'Time',
  'Status',
  'Payment',
  'Fee (₹)',
  'Commission (₹)',
];

const ADMIN_REVIEW_HEADERS = [
  'No',
  'Patient',
  'Doctor',
  'Rating',
  'Comment',
  'Status',
  'Date',
];

// ── Controller ─────────────────────────────────────────────────────────────

@ApiTags('Report')
@ApiCookieAuth('token')
@Controller('report')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly pdfService: PdfService,
    private readonly excelService: ExcelService,
  ) { }


  // ── Patient exports ───────────────────────────────────────────────────────


  @Get('patient/appointments/pdf')
  @ApiOperation({ summary: 'Download patient appointments as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] })
  @Roles('PATIENT')
  async patientAppointmentsPdf(
    @CurrentUser() user: JwtPayload,
    @Query('status') status: AppointmentStatus,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getPatientAppointmentRows(
      user.userId,
      status,
    );
    this.pdfService.generate(res, 'My Appointments', PATIENT_APPOINTMENT_HEADERS, rows);
  }
  @Get('patient/appointments/excel')
  @ApiOperation({ summary: 'Download patient appointments as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('PATIENT')
  async patientAppointmentsExcel(
    @CurrentUser() user: JwtPayload,
    @Query('status') status: AppointmentStatus,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getPatientAppointmentRows(
      user.userId,
      status,
    );
    await this.excelService.generate(
      res,
      'My Appointments',
      PATIENT_APPOINTMENT_HEADERS,
      rows,
    );
  }

  // ── Doctor exports ───────────────────────────────────────────────────────

  @Get('doctor/dashboard/pdf')
  @ApiOperation({ summary: 'Download full doctor dashboard report as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('DOCTOR')
  async doctorDashboardPdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    console.log("User ID:", user.userId);
    const appointmentRows = await this.reportService.getDoctorAppointmentRows(user.userId);
    const patientRows = await this.reportService.getDoctorPatientRows(user.userId);
    const commissionRows = await this.reportService.getDoctorCommissionRows(user.userId);
    const reviewRows = await this.reportService.getDoctorReviewRows(user.userId);

    this.pdfService.generateMultiSection(res, 'Doctor Report', [
      {
        title: 'Appointments',
        headers: ['No', 'Patient Name', 'Patient Email', 'Date', 'Time', 'Status', 'Payment', 'Fee (₹)'],
        rows: appointmentRows,
      },
      {
        title: 'Patients',
        headers: ['No', 'Name', 'Email', 'Phone', 'Gender', 'DOB', 'Total Appointments'],
        rows: patientRows,
      },
      {
        title: 'Commission History',
        headers: ['No', 'Commission%', 'Start Date', 'End Date', 'Appointments', 'Total Fee', 'Total Commission'],
        rows: commissionRows,
      },
      {
        title: 'Reviews',
        headers: ['No', 'Patient Name', 'Email', 'Rating', 'Comment', 'Date'],
        rows: reviewRows,
      },
    ]);
  }

  @Get('doctor/dashboard/excel')
  @ApiOperation({ summary: 'Download full doctor dashboard report as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('DOCTOR')
  async doctorDashboardExcel(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const appointmentRows = await this.reportService.getDoctorAppointmentRows(user.userId);
    const patientRows = await this.reportService.getDoctorPatientRows(user.userId);
    const commissionRows = await this.reportService.getDoctorCommissionRows(user.userId);
    const reviewRows = await this.reportService.getDoctorReviewRows(user.userId);

    await this.excelService.generateMultiSheet(res, 'Doctor Report', [
      {
        sheetName: 'Appointments',
        headers: ['No', 'Patient Name', 'Patient Email', 'Date', 'Time', 'Status', 'Payment', 'Fee (₹)'],
        rows: appointmentRows,
      },
      {
        sheetName: 'Patients',
        headers: ['No', 'Name', 'Email', 'Phone', 'Gender', 'DOB', 'Total Appointments'],
        rows: patientRows,
      },
      {
        sheetName: 'Commission History',
        headers: ['No', 'Commission%', 'Start Date', 'End Date', 'Appointments', 'Total Fee', 'Total Commission'],
        rows: commissionRows,
      },
      {
        sheetName: 'Reviews',
        headers: ['No', 'Patient Name', 'Email', 'Rating', 'Comment', 'Date'],
        rows: reviewRows,
      },
    ]);
  }

  @Get('doctor/appointments/pdf')
  @ApiOperation({ summary: 'Download doctor appointments as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('DOCTOR')
  async doctorAppointmentsPdf(
    @CurrentUser() user: JwtPayload,
    @Query('status') status: AppointmentStatus,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getDoctorAppointmentRows(
      user.userId,
      status,
    );
    this.pdfService.generate(res, 'My Appointments', DOCTOR_APPOINTMENT_HEADERS, rows);
  }

  @Get('doctor/appointments/excel')
  @ApiOperation({ summary: 'Download doctor appointments as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('DOCTOR')
  async doctorAppointmentsExcel(
    @CurrentUser() user: JwtPayload,
    @Query('status') status: AppointmentStatus,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getDoctorAppointmentRows(
      user.userId,
      status,
    );
    await this.excelService.generate(
      res,
      'My Appointments',
      DOCTOR_APPOINTMENT_HEADERS,
      rows,
    );
  }

  @Get('doctor/patients/pdf')
  @ApiOperation({ summary: 'Download doctor patients as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('DOCTOR')
  async doctorPatientsPdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getDoctorPatientRows(user.userId);
    this.pdfService.generate(res, 'Patients Report', ['No', 'Name', 'Email', 'Phone', 'Gender', 'DOB', 'Total Appointments'], rows);
  }

  @Get('doctor/patients/excel')
  @ApiOperation({ summary: 'Download doctor patients as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('DOCTOR')
  async doctorPatientsExcel(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getDoctorPatientRows(user.userId);
    await this.excelService.generate(res, 'Patients Report', ['No', 'Name', 'Email', 'Phone', 'Gender', 'DOB', 'Total Appointments'], rows);
  }

  @Get('doctor/reviews/pdf')
  @ApiOperation({ summary: 'Download doctor reviews as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('DOCTOR')
  async doctorReviewsPdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getDoctorReviewRows(user.userId);
    this.pdfService.generate(res, 'Reviews Report', ['No', 'Patient Name', 'Email', 'Rating', 'Comment', 'Date'], rows);
  }

  @Get('doctor/reviews/excel')
  @ApiOperation({ summary: 'Download doctor reviews as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('DOCTOR')
  async doctorReviewsExcel(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getDoctorReviewRows(user.userId);
    await this.excelService.generate(res, 'Reviews Report', ['No', 'Patient Name', 'Email', 'Rating', 'Comment', 'Date'], rows);
  }

  // ── Admin exports ─────────────────────────────────────────────────────────


  @Get('admin/dashboard/pdf')
  @ApiOperation({ summary: 'Download full admin dashboard report as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('ADMIN')
  async adminDashboardPdf(@Res() res: Response): Promise<void> {
    const summary = await this.reportService.getAdminDashboardData();
    const doctorRows = await this.reportService.getAdminDashboardDoctorRows();
    const patientRows = await this.reportService.getAdminDashboardPatientRows();
    const appointmentRows = await this.reportService.getAdminDashboardAppointmentRows();
    const paymentRows = await this.reportService.getAdminDashboardPaymentRows();

    this.pdfService.generateMultiSection(res, 'Admin Dashboard Report', [
      {
        title: 'Summary',
        headers: ['Total Doctors', 'Total Patients', 'Total Appointments', 'Total Commission (₹)'],
        rows: [[summary.totalDoctors, summary.totalPatients, summary.totalAppointments, summary.totalCommission]],
      },
      {
        title: 'Doctors',
        headers: ['No', 'Name', 'Email', 'Phone', 'Specialization', 'Exp', 'Fee', 'Comm%', 'Appts', 'Patients', 'Admin Comm', 'Earning', 'Net', 'Status', 'Created'],
        rows: doctorRows,
      },
      {
        title: 'Patients',
        headers: ['No', 'Name', 'Email', 'Phone', 'Gender', 'DOB', 'Appts', 'Total Paid', 'Created'],
        rows: patientRows,
      },
      {
        title: 'Appointments',
        headers: ['No', 'Doctor', 'Doctor Email', 'Patient', 'Patient Email', 'Date', 'Time', 'Status', 'Notes', 'Fee', 'Comm%', 'Commission'],
        rows: appointmentRows,
      },
      {
        title: 'Payments',
        headers: ['No', 'Appointment ID', 'Doctor', 'Doctor Email', 'Patient', 'Patient Email', 'Amount', 'Method', 'Status', 'Created'],
        rows: paymentRows,
      },
    ]);
  }

  @Get('admin/dashboard/excel')
  @ApiOperation({ summary: 'Download full admin dashboard report as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('ADMIN')
  async adminDashboardExcel(@Res() res: Response): Promise<void> {
    const summary = await this.reportService.getAdminDashboardData();
    const doctorRows = await this.reportService.getAdminDashboardDoctorRows();
    const patientRows = await this.reportService.getAdminDashboardPatientRows();
    const appointmentRows = await this.reportService.getAdminDashboardAppointmentRows();
    const paymentRows = await this.reportService.getAdminDashboardPaymentRows();

    await this.excelService.generateMultiSheet(res, 'Admin Dashboard', [
      {
        sheetName: 'Summary',
        headers: ['Total Doctors', 'Total Patients', 'Total Appointments', 'Total Commission (₹)'],
        rows: [[summary.totalDoctors, summary.totalPatients, summary.totalAppointments, summary.totalCommission]],
      },
      {
        sheetName: 'Doctors',
        headers: ['No', 'Name', 'Email', 'Phone', 'Specialization', 'Experience', 'Fee', 'Commission%', 'Appointments', 'Unique Patients', 'Admin Commission', 'Total Earning', 'Net Earning', 'Status', 'Created At'],
        rows: doctorRows,
      },
      {
        sheetName: 'Patients',
        headers: ['No', 'Name', 'Email', 'Phone', 'Gender', 'Date of Birth', 'Appointments', 'Total Paid', 'Created At'],
        rows: patientRows,
      },
      {
        sheetName: 'Appointments',
        headers: ['No', 'Doctor Name', 'Doctor Email', 'Patient Name', 'Patient Email', 'Date', 'Time', 'Status', 'Notes', 'Fee', 'Commission%', 'Admin Commission'],
        rows: appointmentRows,
      },
      {
        sheetName: 'Payments',
        headers: ['No', 'Appointment ID', 'Doctor Name', 'Doctor Email', 'Patient Name', 'Patient Email', 'Amount', 'Method', 'Status', 'Created At'],
        rows: paymentRows,
      },
    ]);
  }


  @Get('admin/doctors/pdf')
  @ApiOperation({ summary: 'Download admin doctors list as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('ADMIN')
  async adminDoctorsPdf(@Res() res: Response): Promise<void> {
    const rows = await this.reportService.getAdminDoctorRows();
    this.pdfService.generate(res, 'Doctors Report', ADMIN_DOCTOR_HEADERS, rows);
  }

  @Get('admin/doctors/excel')
  @ApiOperation({ summary: 'Download admin doctors list as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('ADMIN')
  async adminDoctorsExcel(@Res() res: Response): Promise<void> {
    const rows = await this.reportService.getAdminDoctorRows();
    await this.excelService.generate(
      res,
      'Doctors Report',
      ADMIN_DOCTOR_HEADERS,
      rows,
    );
  }

  @Get('admin/patients/pdf')
  @ApiOperation({ summary: 'Download admin patients list as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('ADMIN')
  async adminPatientsPdf(@Res() res: Response): Promise<void> {
    const rows = await this.reportService.getAdminPatientRows();
    this.pdfService.generate(res, 'Patients Report', ADMIN_PATIENT_HEADERS, rows);
  }

  @Get('admin/patients/excel')
  @ApiOperation({ summary: 'Download admin patients list as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('ADMIN')
  async adminPatientsExcel(@Res() res: Response): Promise<void> {
    const rows = await this.reportService.getAdminPatientRows();
    await this.excelService.generate(
      res,
      'Patients Report',
      ADMIN_PATIENT_HEADERS,
      rows,
    );
  }

  @Get('admin/appointments/pdf')
  @ApiOperation({ summary: 'Download admin appointments as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('ADMIN')
  async adminAppointmentsPdf(
    @Query('status') status: AppointmentStatus,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getAdminAppointmentRows(status);
    this.pdfService.generate(
      res,
      'Appointments Report',
      ADMIN_APPOINTMENT_HEADERS,
      rows,
    );
  }

  @Get('admin/appointments/excel')
  @ApiOperation({ summary: 'Download admin appointments as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('ADMIN')
  async adminAppointmentsExcel(
    @Query('status') status: AppointmentStatus,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportService.getAdminAppointmentRows(status);
    await this.excelService.generate(
      res,
      'Appointments Report',
      ADMIN_APPOINTMENT_HEADERS,
      rows,
    );
  }

  @Get('admin/reviews/pdf')
  @ApiOperation({ summary: 'Download admin reviews as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  @Roles('ADMIN')
  async adminReviewsPdf(@Res() res: Response): Promise<void> {
    const rows = await this.reportService.getAdminReviewRows();
    this.pdfService.generate(res, 'Reviews Report', ADMIN_REVIEW_HEADERS, rows);
  }

  @Get('admin/reviews/excel')
  @ApiOperation({ summary: 'Download admin reviews as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @Roles('ADMIN')
  async adminReviewsExcel(@Res() res: Response): Promise<void> {
    const rows = await this.reportService.getAdminReviewRows();
    await this.excelService.generate(
      res,
      'Reviews Report',
      ADMIN_REVIEW_HEADERS,
      rows,
    );
  }
}