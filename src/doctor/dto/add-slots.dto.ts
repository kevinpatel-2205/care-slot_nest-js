import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsString,
  Matches,
} from 'class-validator';

export class AddSlotsDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    each: true,
    message: 'Each time must be in format like 09:10 AM or 10:30 PM',
  })
  times!: string[];
}
