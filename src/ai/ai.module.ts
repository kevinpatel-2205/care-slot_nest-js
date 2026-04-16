import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGroqService } from './ai-groq.service';
import { AiReviewService } from './ai-review.service';
import { AiFunctionFinderService } from './ai-function-finder.service';
import { AiDataService } from './data/ai-data.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiGroqService,
    AiReviewService,
    AiFunctionFinderService,
    AiDataService,
  ],
  exports: [
    AiGroqService,
    AiReviewService,
    AiFunctionFinderService,
    AiDataService,
  ],
})
export class AiModule { }
