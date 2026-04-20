import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class BulkSlotsDto {
  @ApiProperty({ example: '2025-06-01', description: 'Start date YYYY-MM-DD' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-06-30', description: 'End date YYYY-MM-DD' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: '09:00 AM', description: 'Start time in 09:00 AM format' })
  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'startTime must be in format like 09:00 AM',
  })
  startTime?: string;

  @ApiPropertyOptional({ example: '05:00 PM', description: 'End time in 05:00 PM format' })
  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'endTime must be in format like 05:00 PM',
  })
  endTime?: string;

  @ApiProperty({ example: 30, description: 'Interval in minutes between slots' })
  @IsInt()
  @Min(1)
  interval!: number;
}
