import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class BulkSlotsDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'startTime must be in format like 09:00 AM',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'endTime must be in format like 05:00 PM',
  })
  endTime?: string;

  @IsInt()
  @Min(1)
  interval!: number;
}
