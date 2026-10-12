const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const { expireStaleHolds } = require('./services/bookingService');

(async () => {
  try {
    await connectDB();
  } catch (e) {
    console.error('\n[db] Could not connect to MongoDB:', e.message);
    console.error('[db] Is MongoDB running? Is MONGO_URI in server/.env correct?\n');
    process.exit(1);
  }
  if (!env.razorpay.keyId || env.razorpay.keyId.includes('xxxx')) {
    console.warn('[payments] Razorpay test keys are not set - browsing works, but payments will return an error until you add them to server/.env');
  }
  // Release abandoned payment holds every minute.
  setInterval(() => expireStaleHolds().catch((e) => console.error('[expiry]', e.message)), 60 * 1000);
  app.listen(env.port, () => console.log(`[server] ParkWise API running on http://localhost:${env.port}`));
})();
