import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'Appointment ID to create payment order for' })
  @IsNotEmpty()
  @IsString()
  appointmentId!: string;
}
