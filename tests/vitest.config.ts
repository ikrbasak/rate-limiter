import dotenv from 'dotenv';
import Redis from 'ioredis';
import { beforeAll } from 'vitest';

dotenv.config();

beforeAll(async () => {
  const connection = new Redis(`${process.env.REDIS_URL}`);
  await connection.flushall();
});
