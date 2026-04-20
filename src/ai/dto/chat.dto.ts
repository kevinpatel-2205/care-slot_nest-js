import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatDto {
  @ApiProperty({
    example: 'Show me available cardiologists',
    description: 'Message to send to AI assistant',
  })
  @IsNotEmpty()
  @IsString()
  message!: string;
}
