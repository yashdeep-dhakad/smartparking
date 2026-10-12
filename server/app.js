const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const routes = require('./routes');
const { webhook } = require('./controllers/paymentController');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl.split(',').map((s) => s.trim()) }));

// Razorpay webhook needs the RAW body for signature verification -> mounted BEFORE express.json().
app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), webhook);

app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
