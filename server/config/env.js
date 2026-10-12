require('dotenv').config();

const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n[config] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[config] Copy server/.env.example to server/.env and fill it in.\n');
  process.exit(1);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  // Transactional email (booking confirmations). Optional: when unset, emails are logged instead of sent.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'ParkWise <no-reply@parkwise.local>',
  holdMinutes: Number(process.env.HOLD_MINUTES) || 10,
  cancelBeforeHours: Number(process.env.CANCEL_BEFORE_HOURS) || 2,
  checkInEarlyMinutes: 15,
};
