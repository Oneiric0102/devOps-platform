import { createClient } from 'redis';
import env from '../config/env';

export const redisClient = createClient({
  socket: {
    host: env.redis.host,
    port: env.redis.port,
  },
});

redisClient.on('error', (error) => {
  console.error('Redis error:', error);
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function checkRedis(): Promise<boolean> {
  await connectRedis();
  const pong = await redisClient.ping();
  return pong === 'PONG';
}
