/**
 * Global Jest setup: in-memory Mongo, external service mocks, and app bootstrap.
 */

process.env.NODE_ENV = 'test';

const { connectInMemory, disconnectInMemory, clearDatabase } = require('./db');

// Mock external services BEFORE requiring the app
jest.mock('../../services/storageService', () => ({
  uploadBuffer: jest.fn(async () => ({
    url: 'https://mock-s3.local/test-object',
    key: 'test-object',
  })),
}));

jest.mock('../../services/notificationService', () => ({
  sendPush: jest.fn(async () => {
    return { success: true };
  }),
}));

beforeAll(async () => {
  await connectInMemory();
});

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectInMemory();
});

// Export test helpers
module.exports = {};
