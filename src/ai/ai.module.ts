import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGroqService } from './ai-groq.service';
import { AiReviewService } from './ai-review.service';
import { AiFunctionFinderService } from './ai-function-finder.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiGroqService,
    AiReviewService,
    AiFunctionFinderService,
  ],
  exports: [
    AiGroqService,
    AiReviewService,
    AiFunctionFinderService,
  ],
})
export class AiModule {}
