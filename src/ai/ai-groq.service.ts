import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { getGroqInstance } from '../config/groq.config';
import { GUEST_PROMPT } from './prompts/guest.prompt';
import { REVIEW_MODERATION_PROMPT } from './prompts/review-moderation.prompt';

// re-export all prompts cleanly
export { GUEST_PROMPT } from './prompts/guest.prompt';
export { PATIENT_PROMPT } from './prompts/patient.prompt';
export { DOCTOR_PROMPT } from './prompts/doctor.prompt';
export { ADMIN_PROMPT } from './prompts/admin.prompt';

export interface AiChatResponse {
  type: string;
  message: string;
}

export interface AiReviewResult {
  approved: boolean;
  reason: string;
}

@Injectable()
export class AiGroqService {
  private readonly logger = new Logger(AiGroqService.name);
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.model =
      this.configService.get<string>('groq.model') ?? 'llama3-8b-8192';
  }

  private parseJsonResponse<T>(raw: string): T {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  }

  async chat(
    systemPrompt: string,
    userContent: string,
    temperature = 0.3,
  ): Promise<AiChatResponse> {
    try {
      const groq = getGroqInstance();
      const completion = await groq.chat.completions.create({
        model: this.model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      });

      const raw = completion.choices[0].message.content ?? '';
      const parsed = this.parseJsonResponse<AiChatResponse>(raw);

      if (!parsed.type || !parsed.message) {
        return { type: 'TEXT', message: raw };
      }

      return parsed;
    } catch (error) {
      this.logger.error('AI chat failed', error);
      return {
        type: 'TEXT',
        message:
          'Sorry, too many requests at the moment. Please try again later.',
      };
    }
  }

  async moderateReview(comment: string): Promise<AiReviewResult> {
    if (!comment || comment.trim().length === 0) {
      return { approved: true, reason: '' };
    }

    try {
      const groq = getGroqInstance();
      const completion = await groq.chat.completions.create({
        model: this.model,
        temperature: 0,
        messages: [
          { role: 'system', content: REVIEW_MODERATION_PROMPT },
          { role: 'user', content: comment },
        ],
      });

      const raw = completion.choices[0].message.content ?? '';
      return this.parseJsonResponse<AiReviewResult>(raw);
    } catch (error) {
      this.logger.error('Review moderation failed — auto approving', error);
      return { approved: true, reason: '' };
    }
  }

  async findFunction(
    message: string,
    functionNames: string[],
  ): Promise<string | null> {
    try {
      const groq = getGroqInstance();
      const completion = await groq.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `
You are a function selection AI. Select the correct function name based on the user message.
Only choose from: ${functionNames.join(', ')}.
Return ONLY JSON: { "functionName": "name_here" }
No explanation. No extra text.
            `.trim(),
          },
          { role: 'user', content: message },
        ],
      });

      const raw = completion.choices[0].message.content ?? '';
      const parsed = this.parseJsonResponse<{ functionName: string }>(raw);
      return parsed.functionName ?? null;
    } catch (error) {
      this.logger.error('Function finder failed', error);
      return null;
    }
  }
}
