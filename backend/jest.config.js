/**
 * Jest configuration for the LearnSphere backend.
 * Uses experimental VM modules to support ES module (import/export) syntax.
 */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
};
