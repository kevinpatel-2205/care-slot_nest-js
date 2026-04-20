import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleStatusDto {
  @ApiProperty({ example: true, description: 'true to activate, false to deactivate' })
  @IsBoolean()
  isActive!: boolean;
}
