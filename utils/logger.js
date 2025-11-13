const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(format.colorize(), format.simple()),
  }));
}

module.exports = logger;
