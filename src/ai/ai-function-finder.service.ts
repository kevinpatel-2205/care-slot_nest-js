import { Injectable } from '@nestjs/common';
import { AiGroqService } from './ai-groq.service';

export const PATIENT_FUNCTIONS = [
  'getPatientData',
  'getPatientAllDoctors',
  'getPatientAppointments',
  'getPatientNearDoctors',
] as const;

export const ADMIN_FUNCTIONS = [
  'getAdminDoctorData',
  'getAdminPatientData',
  'getAdminAppointmentData',
  'getAdminReviewData',
] as const;

export type PatientFunction = (typeof PATIENT_FUNCTIONS)[number];
export type AdminFunction = (typeof ADMIN_FUNCTIONS)[number];

@Injectable()
export class AiFunctionFinderService {
  constructor(private readonly aiGroqService: AiGroqService) {}

  async findPatientFunction(message: string): Promise<PatientFunction | null> {
    const result = await this.aiGroqService.findFunction(message, [
      ...PATIENT_FUNCTIONS,
    ]);
    return (result as PatientFunction) ?? null;
  }

  async findAdminFunction(message: string): Promise<AdminFunction | null> {
    const result = await this.aiGroqService.findFunction(message, [
      ...ADMIN_FUNCTIONS,
    ]);
    return (result as AdminFunction) ?? null;
  }
}
