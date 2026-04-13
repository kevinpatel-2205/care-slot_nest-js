import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

class GeolocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Phone must be exactly 10 digits',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  specialization?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  experience?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  about?: string;

  @IsOptional()
  @IsNumber()
  @Min(101)
  @Max(1999)
  consultationFee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  @Type(() => GeolocationDto)
  geolocation?: GeolocationDto;
}
