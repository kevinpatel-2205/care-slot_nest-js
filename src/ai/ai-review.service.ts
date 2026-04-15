import { Injectable } from '@nestjs/common';
import { AiGroqService, AiReviewResult } from './ai-groq.service';

@Injectable()
export class AiReviewService {
  constructor(private readonly aiGroqService: AiGroqService) {}

  async checkReview(comment: string): Promise<AiReviewResult> {
    return this.aiGroqService.moderateReview(comment);
  }
}
