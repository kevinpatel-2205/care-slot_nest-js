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
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL,
  },
  currency: process.env.CURRENCY ?? 'INR',
  mail: {
    host: process.env.BREVO_HOST ?? 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_PORT ?? '2525'),
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
    from: process.env.MAIL_FROM,
  },
});
