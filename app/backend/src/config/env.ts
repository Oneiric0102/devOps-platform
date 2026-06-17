import dotenv from 'dotenv';

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getNumberEnv(name: string, fallback?: number): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`Missing required environment variable: ${name}`);
  }

  const value = Number(rawValue);

  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: getNumberEnv('PORT', 3000),

  database: {
    host: getRequiredEnv('DATABASE_HOST'),
    port: getNumberEnv('DATABASE_PORT'),
    name: getRequiredEnv('DATABASE_NAME'),
    user: getRequiredEnv('DATABASE_USER'),
    password: getRequiredEnv('DATABASE_PASSWORD'),
  },

  redis: {
    host: getRequiredEnv('REDIS_HOST'),
    port: getNumberEnv('REDIS_PORT'),
  },

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL ?? 'info',
};

export default env;
