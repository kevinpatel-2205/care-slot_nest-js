import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class BookAppointmentDto {
  @ApiProperty({
    example: 'clx1234abcd',
    description: 'Doctor ID to book appointment with',
  })
  @IsNotEmpty()
  @IsString()
  doctorId!: string;

  @ApiProperty({
    example: '2025-06-15',
    description: 'Appointment date in YYYY-MM-DD format',
  })
  @IsNotEmpty()
  @IsString()
  appointmentDate!: string;

  @ApiProperty({
    example: '10:30 AM',
    description: 'Time slot in format like 09:10 AM or 10:30 PM',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'Time must be in format like 09:10 AM or 10:30 PM',
  })
  timeSlot!: string;

  @ApiPropertyOptional({
    example: 'Having fever and headache for 3 days',
    description: 'Optional notes for the doctor',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}