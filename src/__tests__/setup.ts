// Set up test environment variables before modules are loaded
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';
