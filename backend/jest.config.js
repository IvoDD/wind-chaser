module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js'],
};
