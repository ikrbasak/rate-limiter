/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import Redis from 'ioredis';
import { describe, expect, it } from 'vitest';

import RateLimiter from '@/index';

describe('rate limiter core implementation', () => {
  const connection = new Redis(`${process.env.REDIS_URL}`);

  describe('when configuration not provided - pick up default configurations', () => {
    const limiter = new RateLimiter(connection);

    describe('rate limiter', () => {
      describe('fixed window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                max: 1,
                key: () => 'fixed_window_01',
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
          });

          expect(
            limiter.create({
              algo: 'fixed_window',
              window: 1000 * 60,
              max: 1,
              key: () => 'fixed_window_01',
            }).redisKey
          ).toBe('rl:fixed_window:fixed_window_01');
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                max: 1,
                key: 'fixed_window_01',
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: false,
          });
        });
      });

      describe('token bucket', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'token_bucket',
                window: 1000 * 60,
                key: 'token_bucket_01',
                capacity: 1,
                refill: 0,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
          });

          expect(
            limiter.create({
              algo: 'token_bucket',
              window: 1000 * 60,
              key: 'token_bucket_01',
              capacity: 1,
              refill: 0,
            }).redisKey
          ).toBe('rl:token_bucket:token_bucket_01');
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'token_bucket',
                window: 1000 * 60,
                key: 'token_bucket_01',
                capacity: 10,
                refill: 0,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: false,
          });
        });
      });

      describe('sliding window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'sliding_window',
                window: 1000 * 60,
                key: 'sliding_window_01',
                max: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: true });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'sliding_window',
                window: 1000 * 60,
                key: 'sliding_window_01',
                max: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: false });

          expect(
            limiter.create({
              algo: 'sliding_window',
              window: 1000 * 60,
              key: 'sliding_window_01',
              max: 1,
            }).redisKey
          ).toBe('rl:sliding_window:sliding_window_01');
        });
      });
    });
  });

  describe('when configuration provided without prefix - pick up default prefix', () => {
    const limiter = new RateLimiter(connection, {});

    describe('rate limiter', () => {
      describe('fixed window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                max: 1,
                key: () => 'fixed_window_02',
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
          });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                max: 1,
                key: 'fixed_window_02',
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: false,
          });
        });
      });

      describe('token bucket', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'token_bucket',
                window: 1000 * 60,
                key: 'token_bucket_02',
                capacity: 1,
                refill: 0,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
          });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'token_bucket',
                window: 1000 * 60,
                key: 'token_bucket_02',
                capacity: 10,
                refill: 0,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: false,
          });
        });
      });

      describe('sliding window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'sliding_window',
                window: 1000 * 60,
                key: 'sliding_window_02',
                max: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: true });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'sliding_window',
                window: 1000 * 60,
                key: 'sliding_window_02',
                max: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: false });

          expect(
            limiter.create({
              algo: 'sliding_window',
              window: 1000 * 60,
              key: 'sliding_window_02',
              max: 1,
            }).redisKey
          ).toBe('rl:sliding_window:sliding_window_02');
        });
      });
    });
  });

  describe('when configuration provided - pick up provided prefix', () => {
    const limiter = new RateLimiter(connection, { prefix: 'rate-limiter' });

    describe('rate limiter', () => {
      describe('fixed window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                max: 1,
                key: () => 'fixed_window_03',
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
          });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                max: 1,
                key: 'fixed_window_03',
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: false,
          });
        });
      });

      describe('token bucket', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'token_bucket',
                window: 1000 * 60,
                key: 'token_bucket_03',
                capacity: 1,
                refill: 0,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
          });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'token_bucket',
                window: 1000 * 60,
                key: 'token_bucket_03',
                capacity: 10,
                refill: 0,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: false,
          });
        });
      });

      describe('sliding window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'sliding_window',
                window: 1000 * 60,
                key: 'sliding_window_03',
                max: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: true });
        });

        it('should limit if rate limiting count exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'sliding_window',
                window: 1000 * 60,
                key: 'sliding_window_03',
                max: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: false });

          expect(
            limiter.create({
              algo: 'sliding_window',
              window: 1000 * 60,
              key: 'sliding_window_03',
              max: 1,
            }).redisKey
          ).toBe('rate-limiter:sliding_window:sliding_window_03');
        });
      });
    });
  });
});
