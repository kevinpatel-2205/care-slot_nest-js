import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MarkFailedDto } from './dto/mark-failed.dto';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Payment')
@ApiCookieAuth('token')
@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('create-order')
  @ApiOperation({ summary: 'Create a Razorpay order for an appointment' })
  @ApiResponse({ status: 201, description: 'Razorpay order created' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentService.createOrder(dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature and confirm appointment' })
  @ApiResponse({ status: 200, description: 'Payment verified and appointment confirmed' })
  @ApiResponse({ status: 400, description: 'Invalid payment signature' })
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(dto);
  }

  @Post('mark-failed')
  @ApiOperation({ summary: 'Mark a payment as failed' })
  @ApiResponse({ status: 200, description: 'Payment marked as failed' })
  markFailed(@Body() dto: MarkFailedDto) {
    return this.paymentService.markFailed(dto);
  }
}
