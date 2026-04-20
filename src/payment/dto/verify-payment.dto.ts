import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_xyz123', description: 'Razorpay order ID' })
  @IsNotEmpty()
  @IsString()
  razorpay_order_id!: string;

  @ApiProperty({ example: 'pay_abc456', description: 'Razorpay payment ID' })
  @IsNotEmpty()
  @IsString()
  razorpay_payment_id!: string;

  @ApiProperty({ example: 'signature_xyz', description: 'Razorpay payment signature' })
  @IsNotEmpty()
  @IsString()
  razorpay_signature!: string;

  @ApiProperty({ example: 'clx1234abcd', description: 'Appointment ID' })
  @IsString()
  appointmentId!: string;
}
