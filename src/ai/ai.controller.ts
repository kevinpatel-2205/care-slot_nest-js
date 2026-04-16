import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../common/decorators';
import type { JwtPayload } from '../auth/strategy/jwt.strategy';
import { OptionalJwtAuthGuard } from '../common/guards/Optional jwt auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('chat')
  @UseGuards(OptionalJwtAuthGuard)
  chat(@CurrentUser() user: JwtPayload | null, @Body() dto: ChatDto) {
    const role = user?.role ?? 'guest';
    const userId = user?.userId;
    return this.aiService.chat(dto.message, role, userId);
  }
}