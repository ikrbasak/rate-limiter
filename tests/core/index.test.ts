/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { getRandomKey, getRandomLimit } from '@tests/vitest.utils';
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
                limit: 1,
                key: () => 'fixed_window_with_default_config',
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
                limit: 1,
                key: 'fixed_window_with_default_config',
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
                key: 'token_bucket_with_default_config',
                limit: 1,
                refill: 1,
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
                key: 'token_bucket_with_default_config',
                limit: 10,
                refill: 1,
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
                key: 'sliding_window_with_default_config',
                limit: 1,
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
                key: 'sliding_window_with_default_config',
                limit: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: false });
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
                limit: 1,
                key: () => 'fixed_window_with_default_prefix',
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
                limit: 1,
                key: 'fixed_window_with_default_prefix',
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
                key: 'token_bucket_with_default_prefix',
                limit: 1,
                refill: 1,
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
                key: 'token_bucket_with_default_prefix',
                limit: 10,
                refill: 1,
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
                key: 'sliding_window_with_default_prefix',
                limit: 1,
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
                key: 'sliding_window_with_default_prefix',
                limit: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: false });
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
                limit: 1,
                key: () => 'fixed_window_with_custom_prefix',
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
                limit: 1,
                key: 'fixed_window_with_custom_prefix',
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
                key: 'token_bucket_with_custom_prefix',
                limit: 1,
                refill: 1,
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
                key: 'token_bucket_with_custom_prefix',
                limit: 10,
                refill: 1,
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
                key: 'sliding_window_with_custom_prefix',
                limit: 1,
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
                key: 'sliding_window_with_custom_prefix',
                limit: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: false });
        });
      });
    });
  });

  describe('when async key generation enabled', () => {
    const limiter = new RateLimiter(connection, { prefix: 'rate-limiter' });

    describe('rate limiter', () => {
      describe('fixed window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                limit: 1,
                key: getRandomKey,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
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
                key: getRandomKey,
                limit: 1,
                refill: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
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
                key: getRandomKey,
                limit: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: true });
        });
      });
    });
  });

  describe('when async limit generation enabled', () => {
    const limiter = new RateLimiter(connection, { prefix: 'rate-limiter' });

    describe('rate limiter', () => {
      describe('fixed window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                limit: getRandomLimit,
                key: getRandomKey,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
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
                key: getRandomKey,
                limit: getRandomLimit,
                refill: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
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
                key: getRandomKey,
                limit: getRandomLimit,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: true });
        });
      });
    });
  });

  describe('when sync limit generation enabled', () => {
    const limiter = new RateLimiter(connection, { prefix: 'rate-limiter' });

    describe('rate limiter', () => {
      describe('fixed window', () => {
        it('should allow if rate limiting count not exceeded', async () => {
          await expect(
            limiter
              .create({
                algo: 'fixed_window',
                window: 1000 * 60,
                limit: () => 10,
                key: getRandomKey,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
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
                key: getRandomKey,
                limit: () => 10,
                refill: 1,
              })
              .evaluate()
          ).resolves.toMatchObject({
            allowed: true,
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
                key: getRandomKey,
                limit: () => 10,
              })
              .evaluate()
          ).resolves.toMatchObject({ allowed: true });
        });
      });
    });
  });
});
