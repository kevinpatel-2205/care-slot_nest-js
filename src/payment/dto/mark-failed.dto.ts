import { IsOptional, IsString } from 'class-validator';

export class MarkFailedDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  razorpay_order_id?: string;
}
