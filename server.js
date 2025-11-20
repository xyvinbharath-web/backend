require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
const requestLogger = require('./middlewares/request.logger');
const logger = require('./utils/logger');
const sanitize = require('./middlewares/sanitizeMiddleware');
const { setIo } = require('./src/lib/io');
const { verifyToken } = require('./src/utils/jwt');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const eventRoutes = require('./routes/eventRoutes');
const communityRoutes = require('./routes/communityRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const referralRoutes = require('./routes/referralRoutes');
const chatRoutes = require('./routes/chatRoutes');

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
app.use(requestLogger);
if (process.env.NODE_ENV !== 'test') {
  app.use(sanitize);
  app.use(platform);
}

// Rate limiting
const noop = (req, res, next) => next();
const rateLimitDisabled = process.env.NODE_ENV === 'test' || process.env.LOADTEST_DISABLE_RATE_LIMIT === 'true';
const apiLimiter = rateLimitDisabled ? noop : rateLimit({ windowMs: 60 * 1000, max: 200 });
const authLimiter = rateLimitDisabled ? noop : rateLimit({ windowMs: 60 * 1000, max: 60 });

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/chat', chatRoutes);

// Versioned mounts (aliasing to same routers for backward compatibility)
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/partner', partnerRoutes);
app.use('/api/v1/referral', referralRoutes);
app.use('/api/v1/chat', chatRoutes);

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

// HTTP server & Socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setIo(io);

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    return next(new Error('No auth token'));
  }
  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.id;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // User joins their own private room for direct messages
  if (socket.userId) {
    socket.join(String(socket.userId));
  }

  socket.on('disconnect', () => {
    // Optional: logging or cleanup
  });
});

module.exports = server;
