import app from './app';
import prisma from './config/database';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  await prisma.$connect();

  app.listen(PORT, () => {
    console.log(`LearnSphere LMS server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
