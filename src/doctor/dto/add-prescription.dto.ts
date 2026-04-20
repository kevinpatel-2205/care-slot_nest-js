import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString, IsEnum, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MealTime, Timing } from '@prisma/client';

class MedicineDto {
  @ApiProperty({ example: 'Paracetamol', description: 'Medicine name' })
  @IsString()
  medicineName!: string;

  @ApiProperty({ example: '500mg', description: 'Dosage amount' })
  @IsString()
  dosage!: string;

  @ApiProperty({ example: ['morning', 'night'], enum: Timing, isArray: true })
  @IsArray()
  @IsEnum(Timing, { each: true })
  timing!: Timing[];

  @ApiPropertyOptional({ example: 'after_meal', enum: MealTime })
  @IsOptional()
  @IsEnum(MealTime)
  mealTime?: MealTime;

  @ApiPropertyOptional({ example: '5 days', description: 'Duration of medicine' })
  @IsOptional()
  @IsString()
  duration?: string;
}

export class AddPrescriptionDto {
  @ApiProperty({ type: [MedicineDto], description: 'List of medicines' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicineDto)
  medicines!: MedicineDto[];

  @ApiPropertyOptional({ example: 'Take rest and drink plenty of water', description: 'Extra notes max 1000 chars' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;
}
