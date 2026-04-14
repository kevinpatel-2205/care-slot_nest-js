import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRazorpayInstance } from '../config/razorpay.config';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MarkFailedDto } from './dto/mark-failed.dto';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const { appointmentId } = dto;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, isDeleted: false },
    });

    if (!appointment || appointment.status === 'CANCELLED') {
      throw new NotFoundException('Appointment cancelled or not found');
    }

    if (appointment.paymentStatus === 'PAID') {
      throw new BadRequestException('Payment already paid');
    }

    const razorpay = getRazorpayInstance(this.configService);

    const order = await razorpay.orders.create({
      amount: appointment.consultationFee * 100,
      currency: this.configService.get<string>('currency') ?? 'INR',
      receipt: appointmentId,
    });

    await this.prisma.payment.upsert({
      where: { appointmentId },
      update: {
        paymentMethod: 'RAZORPAY',
        razorpayOrderId: order.id,
        status: 'PENDING',
      },
      create: {
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        amount: appointment.consultationFee,
        paymentMethod: 'RAZORPAY',
        razorpayOrderId: order.id,
        status: 'PENDING',
      },
    });

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PENDING',
        status: 'PENDING',
      },
    });

    return {
      message: 'Order created successfully',
      data: { order },
    };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    const generatedSignature = crypto
      .createHmac(
        'sha256',
        this.configService.get<string>('razorpay.keySecret')!,
      )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: razorpay_order_id },
      });

      if (payment && payment.status !== 'PAID') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        await this.prisma.appointment.update({
          where: { id: payment.appointmentId },
          data: { paymentStatus: 'FAILED', status: 'PENDING' },
        });
      }

      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        status: 'PAID',
      },
    });

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: payment.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: appointment.doctorId },
      select: { commission: true },
    });

    const fee = appointment.consultationFee;
    const commissionPercent = doctor?.commission ?? 0;
    const adminCommission = (fee * commissionPercent) / 100;

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        adminCommission,
      },
    });

    return {
      message: 'Payment verified successfully',
    };
  }

  async markFailed(dto: MarkFailedDto) {
    if (!dto.appointmentId && !dto.razorpay_order_id) {
      throw new BadRequestException(
        'appointmentId or razorpay_order_id is required',
      );
    }

    const payment = dto.razorpay_order_id
      ? await this.prisma.payment.findFirst({
          where: { razorpayOrderId: dto.razorpay_order_id },
        })
      : await this.prisma.payment.findFirst({
          where: { appointmentId: dto.appointmentId },
        });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status === 'PAID') {
      return {
        message: 'Payment already marked as paid',
      };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });

    await this.prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: {
        paymentStatus: 'FAILED',
        status: 'PENDING',
        paymentMethod: 'RAZORPAY',
      },
    });

    return {
      message: 'Payment marked as failed',
    };
  }
}
