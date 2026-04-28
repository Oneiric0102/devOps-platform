import app from './app';
import env from './config/env';
import { connectRedis } from './db/redis';

async function startServer(): Promise<void> {
  try {
    await connectRedis();

    app.listen(env.port, () => {
      console.log(`Backend server is running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();
