import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsArray, ArrayMinSize, IsString, Matches } from 'class-validator';

export class AddSlotsDto {
  @ApiProperty({
    example: '2025-06-15',
    description: 'Date in YYYY-MM-DD format',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    example: ['09:00 AM', '10:00 AM', '11:00 AM'],
    description: 'Array of time slots in 09:00 AM format',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    each: true,
    message: 'Each time must be in format like 09:10 AM or 10:30 PM',
  })
  times!: string[];
}
