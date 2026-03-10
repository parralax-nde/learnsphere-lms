// Set environment variables for tests before any modules are loaded
process.env.DATABASE_URL = 'file:./tests/test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.EMAIL_ENABLED = 'false';
process.env.FRONTEND_URL = 'http://localhost:5173';
