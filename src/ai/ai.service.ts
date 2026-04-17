import { Injectable } from '@nestjs/common';
import { AiGroqService, AiChatResponse } from './ai-groq.service';
import { AiFunctionFinderService } from './ai-function-finder.service';
import { GUEST_PROMPT } from './prompts/guest.prompt';
import { PATIENT_PROMPT } from './prompts/patient.prompt';
import { DOCTOR_PROMPT } from './prompts/doctor.prompt';
import { ADMIN_PROMPT } from './prompts/admin.prompt';
import { AiDataService } from './data/ai-data.service';

const FALLBACK: AiChatResponse = {
  type: 'TEXT',
  message: 'Give a proper message so I can assist you better.',
};

@Injectable()
export class AiService {

  constructor(
    private readonly aiGroqService: AiGroqService,
    private readonly aiDataService: AiDataService,
    private readonly functionFinder: AiFunctionFinderService,
  ) { }

  // Public entry point for handling AI chat requests
  async chat(
    message: string,
    role: string,
    userId?: string,
  ): Promise<AiChatResponse> {
    switch (role) {
      case 'guest':
        return this.handleGuest(message);
      case 'PATIENT':
        return this.handlePatient(message, userId!);
      case 'DOCTOR':
        return this.handleDoctor(message, userId!);
      case 'ADMIN':
        return this.handleAdmin(message);
      default:
        return { type: 'TEXT', message: 'Invalid user role.' };
    }
  }

  // Guest handler
  private async handleGuest(message: string): Promise<AiChatResponse> {
    const data = await this.aiDataService.getGuestData();

    return this.aiGroqService.chat(
      GUEST_PROMPT,
      `User Message:\n${message}\n\nData:\n${JSON.stringify(data)}`,
    );
  }

  // Patient handler
  private async handlePatient(
    message: string,
    userId: string,
  ): Promise<AiChatResponse> {
    const fnName = await this.functionFinder.findPatientFunction(message);

    if (!fnName) return FALLBACK;

    let data: unknown;

    switch (fnName) {
      case 'getPatientData':
        data = await this.aiDataService.getPatientData(userId);
        break;

      case 'getPatientAllDoctors':
        data = await this.aiDataService.getPatientAllDoctors();
        break;

      case 'getPatientAppointments':
        data = await this.aiDataService.getPatientAppointments(userId);
        break;

      case 'getPatientNearDoctors':
        data = await this.aiDataService.getPatientNearDoctors(userId);
        break;

      default:
        return FALLBACK;
    }

    return this.aiGroqService.chat(
      PATIENT_PROMPT,
      `User Message:\n${message}\n\nData:\n${JSON.stringify(data)}`,
    );
  }

  // Doctor handler
  private async handleDoctor(
    message: string,
    userId: string,
  ): Promise<AiChatResponse> {
    const fnName = await this.functionFinder.findDoctorFunction(message);
    if (!fnName) return FALLBACK;

    let data: unknown;

    switch (fnName) {
      case 'getDoctorAppointments':
        data = await this.aiDataService.getDoctorAppointments(userId);
        break;

      case 'getDoctorProfile':
        data = await this.aiDataService.getDoctorProfile(userId);
        break;

      case 'getDoctorReviews':
        data = await this.aiDataService.getDoctorReviews(userId);
        break;

      default:
        return FALLBACK;
    }

    return this.aiGroqService.chat(
      DOCTOR_PROMPT,
      `User Message:\n${message}\n\nData:\n${JSON.stringify(data)}`,
    );
  }

  // Admin handler
  private async handleAdmin(message: string): Promise<AiChatResponse> {
    const fnName = await this.functionFinder.findAdminFunction(message);

    if (!fnName) return FALLBACK;

    let data: unknown;

    switch (fnName) {
      case 'getAdminDoctorData':
        data = await this.aiDataService.getAdminDoctorData();
        break;

      case 'getAdminPatientData':
        data = await this.aiDataService.getAdminPatientData();
        break;

      case 'getAdminAppointmentData':
        data = await this.aiDataService.getAdminAppointmentData();
        break;

      case 'getAdminReviewData':
        data = await this.aiDataService.getAdminReviewData();
        break;

      default:
        return FALLBACK;
    }

    return this.aiGroqService.chat(
      ADMIN_PROMPT,
      `User Message:\n${message}\n\nData:\n${JSON.stringify(data)}`,
    );
  }
}