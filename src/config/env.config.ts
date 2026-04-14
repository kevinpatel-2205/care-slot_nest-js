export default () => ({
  port: parseInt(process.env.PORT ?? '3000'),
  app: {
    clientUrl: process.env.CLIENT_URL,
    nodeEnv: process.env.NODE_ENV,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
});
