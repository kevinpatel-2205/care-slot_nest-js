import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class BookAppointmentDto {
  @IsNotEmpty()
  @IsString()
  doctorId!: string;

  @IsNotEmpty()
  @IsString()
  appointmentDate!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
    message: 'Time must be in format like 09:10 AM or 10:30 PM',
  })
  timeSlot!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}