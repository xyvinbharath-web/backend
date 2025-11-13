require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const platform = require('./middlewares/platformMiddleware');
const logger = require('./utils/logger');
const sanitize = require('./middlewares/sanitizeMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const eventRoutes = require('./routes/eventRoutes');
const communityRoutes = require('./routes/communityRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// DB
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Middlewares
// CORS
const allowed = (process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === 'test') {
  app.use(cors());
} else {
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
}
if (process.env.NODE_ENV !== 'test') {
  app.use(helmet());
  // Note: Do not use express-mongo-sanitize as a global middleware because it mutates req.query.
  // Sanitization is handled in ./middlewares/sanitizeMiddleware (body, params, and safeQuery clone).
}
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitize);
if (process.env.NODE_ENV !== 'test') {
  app.use(platform);
}

// Rate limiting
const noop = (req, res, next) => next();
const apiLimiter = process.env.NODE_ENV === 'test' ? noop : rateLimit({ windowMs: 60 * 1000, max: 200 });
const authLimiter = process.env.NODE_ENV === 'test' ? noop : rateLimit({ windowMs: 60 * 1000, max: 60 });

// Health
app.get('/health', (req, res) => {
  let dbState = 'unknown';
  try {
    const rs = mongoose.connection && typeof mongoose.connection.readyState === 'number' ? mongoose.connection.readyState : 0;
    dbState = rs === 1 ? 'connected' : 'disconnected';
  } catch (_) { dbState = 'disconnected'; }
  res.json({ status: 'ok', db: dbState });
});
app.get('/api/v1/health', (req, res) => {
  let dbState = 'unknown';
  try {
    const rs = mongoose.connection && typeof mongoose.connection.readyState === 'number' ? mongoose.connection.readyState : 0;
    dbState = rs === 1 ? 'connected' : 'disconnected';
  } catch (_) { dbState = 'disconnected'; }
  res.status(200).json({ success: true, message: 'Health', data: { status: 'ok', db: dbState } });
});

// API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);

// Versioned mounts (aliasing to same routers for backward compatibility)
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/v1/admin', adminRoutes);

// Swagger docs
if (process.env.NODE_ENV !== 'test' && (process.env.SWAGGER_ENABLED || 'true').toLowerCase() === 'true') {
  try {
    const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'swagger.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (e) {
    logger.warn('Swagger docs not loaded: ' + e.message);
  }
}

// 404 and Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = app;
