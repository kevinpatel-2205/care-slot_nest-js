import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDateString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Name between 2-20 characters' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Exactly 10 digit phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string;

  @ApiPropertyOptional({ example: '1995-08-20', description: 'Date of birth in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @ApiPropertyOptional({ example: 'Diabetic, allergic to penicillin', description: 'Medical history max 2000 chars' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalHistory?: string;

  @ApiPropertyOptional({
    example: { latitude: 23.0225, longitude: 72.5714, address: 'Ahmedabad, Gujarat' },
    description: 'Patient location',
  })
  @IsOptional()
  geolocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}
