import Redis from 'ioredis';

/**
 * A function that returns a string key, or a static string key for rate limiting
 */
export type RateLimiterKey = string | (() => string);

/**
 * Common options shared across all rate limiter algorithms
 */
export type CommonRateLimiterOptions = {
  /** The key used to identify the rate limit bucket */
  key: RateLimiterKey;
  /** The time window in milliseconds (must be a positive integer) */
  window: number;
};

/**
 * Configuration options for fixed window rate limiting algorithm
 */
export type FixedWindowRateLimiterOptions = CommonRateLimiterOptions & {
  /** Algorithm type */
  algo: 'fixed_window';
  /** Maximum number of requests allowed in the window (must be a positive integer) */
  max: number;
};

/**
 * Configuration options for sliding window rate limiting algorithm
 */
export type SlidingWindowRateLimiterOptions = CommonRateLimiterOptions & {
  /** Algorithm type */
  algo: 'sliding_window';
  /** Maximum number of requests allowed in the window (must be a positive integer) */
  max: number;
};

/**
 * Configuration options for token bucket rate limiting algorithm
 */
export type TokenBucketRateLimiterOptions = CommonRateLimiterOptions & {
  /** Algorithm type */
  algo: 'token_bucket';
  /** Maximum number of tokens the bucket can hold (must be a positive integer) */
  capacity: number;
  /** Rate at which tokens are refilled per second (must be a positive number, can be decimal) */
  refill: number;
};

/**
 * Union type of all possible rate limiter configuration options
 */
export type RateLimiterOptions =
  | FixedWindowRateLimiterOptions
  | SlidingWindowRateLimiterOptions
  | TokenBucketRateLimiterOptions;

/**
 * Configuration options for the RateLimiter class
 */
export type RateLimiterConfig = {
  /** Optional prefix for Redis keys (defaults to 'rl', must be a non-empty string) */
  prefix?: string;
};

/**
 * Result of evaluating a rate limit request
 */
export type RateLimiterEvaluationResult = {
  /** The configured limit for this rate limiter (positive integer) */
  limit: number;
  /** Whether the request is allowed (boolean) */
  allowed: boolean;
  /** Number of requests remaining in the current window (non-negative integer) */
  remaining: number;
  /** Time in seconds to wait before retrying (non-negative integer, 0 if allowed) */
  retryAfter: number;
};

/**
 * A flexible rate limiter that supports multiple algorithms (fixed window, sliding window, token bucket)
 * Uses Redis for distributed rate limiting across multiple application instances.
 *
 * @example
 * ```typescript
 * const redis = new Redis('redis://localhost:6379');
 * const rateLimiter = new RateLimiter(redis, { prefix: 'api' });
 *
 * // Create a fixed window rate limiter
 * const limiter = rateLimiter.create({
 *   algo: 'fixed_window',
 *   key: 'user:123',
 *   window: 60000, // 1 minute
 *   max: 100
 * });
 *
 * const result = await limiter.evaluate();
 * if (result.allowed) {
 *   // Process the request
 * } else {
 *   // Rate limit exceeded, wait result.retryAfter seconds
 * }
 * ```
 */
class RateLimiter {
  /** Redis connection instance */
  connection: Redis;
  /** Prefix for all Redis keys used by this rate limiter */
  prefix = 'rl';

  /**
   * Creates a new RateLimiter instance
   *
   * @param connection - Redis connection instance (must be a valid ioredis connection)
   * @param config - Optional configuration for the rate limiter
   * @param config.prefix - Custom prefix for Redis keys (must be non-empty string if provided)
   */
  constructor(connection: Redis, config?: RateLimiterConfig) {
    this.connection = connection;
    this.prefix = config?.prefix ?? this.prefix;
  }

  /**
   * Creates a rate limiter instance with the specified configuration
   *
   * @param options - Rate limiter configuration options
   * @param options.key - Identifier for the rate limit bucket (string or function returning string)
   * @param options.window - Time window in milliseconds (must be positive integer)
   * @param options.max - Maximum requests allowed (required for fixed/sliding window, must be positive integer)
   * @param options.capacity - Token bucket capacity (required for token bucket, must be positive integer)
   * @param options.refill - Token refill rate per second (required for token bucket, must be positive number)
   * @returns An object containing the evaluate function and the Redis key used
   *
   * @example
   * ```typescript
   * const limiter = rateLimiter.create({
   *   algo: 'sliding_window',
   *   key: () => `user:${getCurrentUserId()}`,
   *   window: 3600000, // 1 hour
   *   max: 1000
   * });
   * ```
   */
  create(options: RateLimiterOptions) {
    const redisKey = this.generateKey(options.algo, options.key);
    return { evaluate: () => this.evaluate(redisKey, options), redisKey };
  }

  /**
   * Generates a Redis key for the rate limiter
   *
   * @private
   * @param algo - The algorithm type
   * @param key - The user-provided key (string or function)
   * @returns The generated Redis key
   */
  private generateKey<TAlgo extends string>(algo: TAlgo, key: RateLimiterKey) {
    return `${this.prefix}:${algo}:${typeof key === 'string' ? key : key()}`;
  }

  /**
   * Evaluates whether a request should be allowed based on the rate limit configuration
   *
   * @private
   * @param key - Identifier for the rate limit bucket (string or function returning string)
   * @param options - Rate limiter configuration options
   * @returns Promise resolving to the evaluation result
   */
  private evaluate(
    key: string,
    options: RateLimiterOptions
  ): Promise<RateLimiterEvaluationResult> {
    const { algo } = options;

    switch (algo) {
      case 'token_bucket': {
        return this.evaluateTokenBucketLimit(key, options);
      }
      case 'sliding_window': {
        return this.evaluateSlidingWindowLimit(key, options);
      }
      case 'fixed_window': {
        return this.evaluateFixedWindowLimit(key, options);
      }
    }
  }

  /**
   * Evaluates a fixed window rate limit
   *
   * Fixed window algorithm divides time into fixed intervals and counts requests within each interval.
   * The counter resets at the start of each new window.
   *
   * @private
   * @param key - Redis key for this rate limiter
   * @param config - Fixed window rate limiter configuration
   * @returns Promise resolving to the evaluation result
   */
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

  /**
   * Evaluates a token bucket rate limit
   *
   * Token bucket algorithm maintains a bucket of tokens that are consumed by requests
   * and refilled at a constant rate. Requests are allowed if tokens are available.
   *
   * @private
   * @param key - Redis key for this rate limiter
   * @param config - Token bucket rate limiter configuration
   * @returns Promise resolving to the evaluation result
   */
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

  /**
   * Evaluates a sliding window rate limit
   *
   * Sliding window algorithm maintains a log of request timestamps and counts
   * requests within a sliding time window. Provides more accurate rate limiting
   * than fixed window but requires more memory.
   *
   * @private
   * @param key - Redis key for this rate limiter
   * @param config - Sliding window rate limiter configuration
   * @returns Promise resolving to the evaluation result
   */
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
