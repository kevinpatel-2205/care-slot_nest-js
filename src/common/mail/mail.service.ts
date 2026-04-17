import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { doctorWelcomeTemplate } from './templates/doctorWelcome.template';
import { appointmentBookedTemplate } from './templates/appointmentBooked.template';

export interface SendDoctorWelcomeDto {
  doctorName: string;
  email: string;
  password: string;
}

export interface SendAppointmentBookedDto {
  doctorName: string;
  doctorEmail: string;
  patientName: string;
  patientEmail: string;
  patientAge?: string | number;
  dateOfBirth?: string;
  appointmentDate: string;
  timeSlot: string;
  reason?: string;
  medicalHistory?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });

    // Verify connection on startup
    this.transporter.verify((err) => {
      if (err) {
        this.logger.error('❌ SMTP ERROR:', err);
      } else {
        this.logger.log('✅ SMTP READY');
      }
    });
  }

  async sendDoctorWelcomeEmail(dto: SendDoctorWelcomeDto): Promise<void> {
    const { doctorName, email, password } = dto;

    const html = doctorWelcomeTemplate({
      doctorName,
      email,
      password,
      dashboardLink: this.configService.get<string>('app.clientUrl') ?? '',
      year: new Date().getFullYear(),
    });

    try {
      const info = await this.transporter.sendMail({
        from: `"CareSlot" <${this.configService.get<string>('mail.from')}>`,
        to: email,
        subject: 'Welcome to CareSlot - Doctor Account Created',
        html,
      });
      this.logger.log(`✅ Welcome email sent: ${info.response}`);
    } catch (err) {
      this.logger.error('❌ Welcome email failed:', err);
      throw new Error('Failed to send welcome email to doctor');
    }
  }

  async sendAppointmentBookedEmailToDoctor(
    dto: SendAppointmentBookedDto,
  ): Promise<void> {
    const {
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      patientAge,
      dateOfBirth,
      appointmentDate,
      timeSlot,
      reason,
      medicalHistory,
    } = dto;

    const html = appointmentBookedTemplate({
      doctorName,
      patientName,
      patientEmail,
      patientAge: patientAge ?? 'N/A',
      dateOfBirth: dateOfBirth ?? 'N/A',
      appointmentDate,
      timeSlot,
      reason: reason ?? 'N/A',
      medicalHistory: medicalHistory ?? 'N/A',
      dashboardLink: this.configService.get<string>('app.clientUrl') ?? '',
      year: new Date().getFullYear(),
    });

    try {
      const info = await this.transporter.sendMail({
        from: `"CareSlot" <${this.configService.get<string>('mail.from')}>`,
        to: doctorEmail,
        subject: 'New Appointment Booked - CareSlot',
        html,
      });
      this.logger.log(`✅ Appointment email sent: ${info.response}`);
    } catch (err) {
      this.logger.error('❌ Appointment email failed:', err);
      throw new Error('Failed to send appointment booked email to doctor');
    }
  }
}