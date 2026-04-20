import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Valid email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Minimum 8 characters',
  })
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Exactly 10 digit phone number',
  })
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone!: string;
}