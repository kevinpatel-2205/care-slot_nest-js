import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsArray, IsNotEmpty, Min, Max, Matches, MinLength, MaxLength, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SlotDto {
  @ApiProperty({ example: '2025-06-15', description: 'Date in YYYY-MM-DD format' })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ example: ['09:00 AM', '10:00 AM'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  times!: string[];
}

export class CreateDoctorDto {
  @ApiProperty({ example: 'Dr. Sarah Connor', description: 'Doctor full name 2-20 chars' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name!: string;

  @ApiProperty({ example: 'doctor@example.com', description: 'Doctor email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '9876543210', description: 'Exactly 10 digit phone' })
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone!: string;

  @ApiProperty({ example: 'Cardiologist', description: 'Doctor specialization' })
  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @ApiProperty({ example: 5, description: 'Years of experience 1-50' })
  @IsNumber()
  @Min(1)
  @Max(50)
  experience!: number;

  @ApiProperty({ example: 'Expert cardiologist with 5 years of experience', description: 'Doctor bio' })
  @IsString()
  @IsNotEmpty()
  about!: string;

  @ApiProperty({ example: 500, description: 'Consultation fee between 101-1999' })
  @IsNumber()
  @Min(101)
  @Max(1999)
  consultationFee!: number;

  @ApiProperty({ type: [SlotDto], description: 'Initial available slots' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  availableSlots!: SlotDto[];

  @ApiProperty({ example: 10, description: 'Admin commission percentage 5-35' })
  @IsNumber()
  @Min(5)
  @Max(35)
  commission!: number;
}
