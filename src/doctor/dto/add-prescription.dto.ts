import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MealTime, Timing } from '@prisma/client';

class MedicineDto {
  @IsString()
  medicineName!: string;

  @IsString()
  dosage!: string;

  @IsArray()
  @IsEnum(Timing, { each: true })
  timing!: Timing[];

  @IsOptional()
  @IsEnum(MealTime)
  mealTime?: MealTime;

  @IsOptional()
  @IsString()
  duration?: string;
}

export class AddPrescriptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicineDto)
  medicines!: MedicineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;
}
