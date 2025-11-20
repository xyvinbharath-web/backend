const mongoose = require('mongoose');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const connectDB = async () => {
  const maxRetries = Number(process.env.MONGO_MAX_RETRIES || 5);
  const retryDelay = Number(process.env.MONGO_RETRY_DELAY_MS || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        dbName: process.env.MONGO_DB_NAME || undefined,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      attempt += 1;
      console.error(
        `MongoDB connection error (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      if (attempt > maxRetries) {
        console.error(
          'Exceeded maximum MongoDB connection retries. Please verify your MONGO_URI, network access (IP whitelist), and cluster status.'
        );
        if (isProd) {
          process.exit(1);
        } else {
          console.warn(
            'Continuing to run without an active DB connection (non-production). Some endpoints will fail until DB connects.'
          );
          break;
        }
      } else {
        await sleep(retryDelay);
      }
    }
  }
};

module.exports = connectDB;
