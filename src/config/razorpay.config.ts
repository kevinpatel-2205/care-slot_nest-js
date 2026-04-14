import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';

let razorpayInstance: Razorpay;

export const getRazorpayInstance = (configService: ConfigService): Razorpay => {
  if (!razorpayInstance) {
    const keyId = configService.get<string>('razorpay.keyId');
    const keySecret = configService.get<string>('razorpay.keySecret');

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys missing in env');
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
};
