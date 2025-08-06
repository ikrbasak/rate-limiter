import Redis from 'ioredis';

import {
  FixedWindowRateLimiterOptions,
  RateLimiterConfig,
  RateLimiterEvaluationResult,
  RateLimiterOptions,
  SlidingWindowRateLimiterOptions,
  TokenBucketRateLimiterOptions,
} from '@/shared/types';

class RateLimiter {
  connection: Redis;
  prefix = 'rl:';

  constructor(connection: Redis, config?: RateLimiterConfig) {
    this.connection = connection;
    this.prefix = config?.prefix ?? this.prefix;
  }

  create(options: RateLimiterOptions) {
    return { evaluate: () => this.evaluate(options) };
  }

  private evaluate(
    options: RateLimiterOptions
  ): Promise<RateLimiterEvaluationResult> {
    const { algo, key } = options;
    const redisKey = `${this.prefix}:${algo}:${typeof key === 'string' ? key : key()}`;

    switch (algo) {
      case 'token_bucket': {
        return this.evaluateTokenBucketLimit(redisKey, options);
      }
      case 'sliding_window': {
        return this.evaluateSlidingWindowLimit(redisKey, options);
      }
      case 'fixed_window': {
        return this.evaluateFixedWindowLimit(redisKey, options);
      }
    }
  }

  private async evaluateFixedWindowLimit(
    key: string,
    config: FixedWindowRateLimiterOptions
  ): Promise<RateLimiterEvaluationResult> {
    const count = await this.connection.incr(key);
    if (count === 1) {
      await this.connection.pexpire(key, config.window);
    }

    const ttl = await this.connection.pttl(key);
    const allowed = count <= config.max;

    return {
      allowed,
      remaining: Math.max(0, config.max - count),
      retryAfter: allowed ? 0 : Math.ceil(ttl / 1000),
      limit: config.max,
    };
  }

  private async evaluateTokenBucketLimit(
    key: string,
    config: TokenBucketRateLimiterOptions
  ): Promise<RateLimiterEvaluationResult> {
    const now = Date.now();

    const [tokensStr, lastRefillStr] = await this.connection.hmget(
      key,
      'tokens',
      'last_refill'
    );
    const tokens = Number.parseFloat(tokensStr ?? `${config.capacity}`);
    const lastRefill = Number.parseInt(lastRefillStr ?? `${now}`, 10);

    const elapsed = (now - lastRefill) / 1000;
    const refill = Math.floor(elapsed * config.refill);
    let newTokens = Math.min(config.capacity, tokens + refill);

    let allowed = false;

    if (newTokens >= 1) {
      allowed = true;
      newTokens -= 1;
    }

    const tx = this.connection.multi();
    tx.hset(key, 'tokens', newTokens.toFixed(2), 'last_refill', now);
    tx.pexpire(key, config.window);
    await tx.exec();

    return {
      allowed,
      remaining: Math.floor(newTokens),
      retryAfter: allowed ? 0 : Math.ceil(1 / config.refill),
      limit: config.capacity,
    };
  }

  private async evaluateSlidingWindowLimit(
    key: string,
    config: SlidingWindowRateLimiterOptions
  ): Promise<RateLimiterEvaluationResult> {
    const now = Date.now();
    const windowStart = now - config.window;

    await this.connection.zremrangebyscore(key, 0, windowStart);
    const count = await this.connection.zcard(key);

    if (count < config.max) {
      const tx = this.connection.multi();
      tx.zadd(key, now, `${now}-${Math.random()}`);
      tx.pexpire(key, config.window);
      await tx.exec();
    }

    let retryAfter = 0;
    if (count >= config.max) {
      const oldest = await this.connection.zrange(key, 0, 0, 'WITHSCORES');
      if (oldest.length === 2) {
        const score = oldest[1];
        if (score !== undefined) {
          retryAfter = Math.ceil(
            (Number.parseInt(score, 10) + config.window - now) / 1000
          );
        }
      }
    }

    return {
      allowed: count < config.max,
      remaining: Math.max(0, config.max - count),
      retryAfter,
      limit: config.max,
    };
  }
}

export default RateLimiter;
