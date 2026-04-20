import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkFailedDto {
  @ApiPropertyOptional({ example: 'clx1234abcd', description: 'Appointment ID' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'order_xyz123', description: 'Razorpay order ID' })
  @IsOptional()
  @IsString()
  razorpay_order_id?: string;
}
