module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/server.js'],
  testTimeout: 30000,
  collectCoverageFrom: [
    '<rootDir>/models/**/*.js',
    '<rootDir>/routes/**/*.js',
    '<rootDir>/src/validators/**/*.js',
    '!<rootDir>/tests/**',
    '!<rootDir>/config/db.js',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 60,
      lines: 70,
    },
  },
};
