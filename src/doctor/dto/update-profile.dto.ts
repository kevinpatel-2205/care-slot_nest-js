import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsObject, Matches, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
  @ApiPropertyOptional({ example: 'Dr. John', description: 'Name 2-20 characters' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Exactly 10 digit phone' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Cardiologist', description: 'Doctor specialization' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  specialization?: string;

  @ApiPropertyOptional({ example: 5, description: 'Years of experience 1-50' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  experience?: number;

  @ApiPropertyOptional({ example: 'Expert in heart diseases with 5 years experience', description: 'Doctor bio' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  about?: string;

  @ApiPropertyOptional({ example: 500, description: 'Consultation fee between 101-1999' })
  @IsOptional()
  @IsNumber()
  @Min(101)
  @Max(1999)
  consultationFee?: number;

  @ApiPropertyOptional({ example: true, description: 'Activate or deactivate account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: { latitude: 23.0225, longitude: 72.5714, address: 'Ahmedabad, Gujarat' },
    description: 'Doctor clinic location',
  })
  @IsOptional()
  @IsObject()
  @Type(() => GeolocationDto)
  geolocation?: GeolocationDto;
}
