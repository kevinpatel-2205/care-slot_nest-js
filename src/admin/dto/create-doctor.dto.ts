import {
  IsString,
  IsEmail,
  IsNumber,
  IsArray,
  IsNotEmpty,
  Min,
  Max,
  Matches,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SlotDto {
  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  times!: string[];
}

export class CreateDoctorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name!: string;

  @IsEmail()
  email!: string;

  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  experience!: number;

  @IsString()
  @IsNotEmpty()
  about!: string;

  @IsNumber()
  @Min(101)
  @Max(1999)
  consultationFee!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  availableSlots!: SlotDto[];

  @IsNumber()
  @Min(5)
  @Max(35)
  commission!: number;
}
