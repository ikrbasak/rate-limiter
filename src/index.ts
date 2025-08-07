import Redis from 'ioredis';

/**
 * A function that generates values for rate limiting configuration.
 * Can be synchronous or asynchronous and return any specified type.
 *
 * @template TReturnType - The type of value returned by the generator
 * @template TArgs - The arguments passed to the generator function
 * @param {...TArgs} args - Arguments passed to the generator
 * @returns {TReturnType | Promise<TReturnType>} The generated value
 *
 * @example
 * ```typescript
 * // Synchronous string generator for keys
 * const keyGenerator: ValueGenerator<string> = () => `user:${getCurrentUserId()}`;
 *
 * // Asynchronous number generator for limits based on user tier
 * const limitGenerator: ValueGenerator<number> = async (userId: number) => {
 *   const user = await getUserById(userId);
 *   return user.tier === 'premium' ? 1000 : 100;
 * };
 *
 * // Synchronous number generator
 * const staticLimit: ValueGenerator<number> = () => 100;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueGenerator<TReturnType, TArgs extends any[] = []> =
  | ((...args: TArgs) => TReturnType)
  | ((...args: TArgs) => Promise<TReturnType>);

/**
 * Common configuration options shared across all rate limiting algorithms.
 */
export type CommonRateLimiterOptions = {
  /** The key used to identify the rate limit bucket - can be static or generated dynamically */
  key: string | ValueGenerator<string>;
  /** The time window in milliseconds for rate limiting */
  window: number;
  /** The maximum number of requests allowed in the time window - can be static or generated dynamically */
  limit: number | ValueGenerator<number>;
};

/**
 * Configuration for fixed window rate limiting algorithm.
 * Resets the counter at fixed intervals.
 *
 * @example
 * ```typescript
 * const options: FixedWindowRateLimiterOptions = {
 *   algo: 'fixed_window',
 *   key: 'api:user:123',
 *   window: 60000, // 1 minute
 *   limit: 100     // 100 requests per minute
 * };
 *
 * // With dynamic key and limit
 * const dynamicOptions: FixedWindowRateLimiterOptions = {
 *   algo: 'fixed_window',
 *   key: () => `api:user:${getCurrentUserId()}`,
 *   window: 60000,
 *   limit: async () => await getUserRateLimit()
 * };
 * ```
 */
export type FixedWindowRateLimiterOptions = CommonRateLimiterOptions & {
  algo: 'fixed_window';
};

/**
 * Configuration for sliding window rate limiting algorithm.
 * Maintains a rolling window of requests.
 *
 * @example
 * ```typescript
 * const options: SlidingWindowRateLimiterOptions = {
 *   algo: 'sliding_window',
 *   key: 'api:endpoint:search',
 *   window: 300000, // 5 minutes
 *   limit: 50       // 50 requests in any 5-minute period
 * };
 *
 * // With dynamic configuration
 * const dynamicOptions: SlidingWindowRateLimiterOptions = {
 *   algo: 'sliding_window',
 *   key: () => `api:${getClientIP()}:${getEndpoint()}`,
 *   window: 300000,
 *   limit: () => getEndpointLimit()
 * };
 * ```
 */
export type SlidingWindowRateLimiterOptions = CommonRateLimiterOptions & {
  algo: 'sliding_window';
};

/**
 * Configuration for token bucket rate limiting algorithm.
 * Allows burst traffic up to the bucket size, then refills at a steady rate.
 *
 * @example
 * ```typescript
 * const options: TokenBucketRateLimiterOptions = {
 *   algo: 'token_bucket',
 *   key: 'api:upload',
 *   window: 3600000, // 1 hour bucket lifetime
 *   limit: 10,       // 10 tokens maximum
 *   refill: 1        // 1 token per second refill rate
 * };
 *
 * // With dynamic key and limit
 * const dynamicOptions: TokenBucketRateLimiterOptions = {
 *   algo: 'token_bucket',
 *   key: async () => `bucket:${await getUserId()}`,
 *   window: 3600000,
 *   limit: async () => await getUserBucketSize(),
 *   refill: 0.5 // 0.5 tokens per second
 * };
 * ```
 */
export type TokenBucketRateLimiterOptions = CommonRateLimiterOptions & {
  algo: 'token_bucket';
  /** The rate at which tokens are refilled (tokens per second) */
  refill: number;
};

/**
 * Union type of all supported rate limiter configurations.
 */
export type RateLimiterOptions =
  | FixedWindowRateLimiterOptions
  | SlidingWindowRateLimiterOptions
  | TokenBucketRateLimiterOptions;

/**
 * Global configuration for the rate limiter instance.
 */
export type RateLimiterConfig = {
  /** Prefix for all Redis keys (defaults to 'rl') */
  prefix?: string;
};

/**
 * Result of evaluating a rate limit request.
 */
export type RateLimiterEvaluationResult = {
  /** The current limit that was applied */
  limit: number;
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Seconds to wait before retrying (0 if allowed) */
  retryAfter: number;
};

/**
 * A Redis-based rate limiter supporting multiple algorithms with dynamic configuration.
 *
 * Supports three rate limiting algorithms:
 * - **Fixed Window**: Simple counter that resets at fixed intervals
 * - **Sliding Window**: Maintains a rolling window of requests for more precise limiting
 * - **Token Bucket**: Allows burst traffic with steady refill rate
 *
 * Keys and limits can be static values or generated dynamically using synchronous or asynchronous functions.
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis';
 * import RateLimiter from './rate-limiter';
 *
 * const redis = new Redis();
 * const rateLimiter = new RateLimiter(redis, { prefix: 'myapp' });
 *
 * // Create a rate limiter with dynamic key and static limit
 * const limiter = rateLimiter.create({
 *   algo: 'fixed_window',
 *   key: () => `api:user:${getCurrentUserId()}`,
 *   window: 60000, // 1 minute
 *   limit: 100     // 100 requests per minute
 * });
 *
 * // Evaluate a request
 * const result = await limiter.evaluate();
 * if (!result.allowed) {
 *   console.log(`Rate limited. Retry after ${result.retryAfter} seconds`);
 * }
 *
 * // Create a limiter with both dynamic key and limit
 * const dynamicLimiter = rateLimiter.create({
 *   algo: 'sliding_window',
 *   key: async () => `api:${await getUserTier()}:${getUserId()}`,
 *   window: 300000,
 *   limit: async () => await getUserRateLimit()
 * });
 * ```
 */
class RateLimiter {
  /** Redis connection instance */
  connection: Redis;
  /** Prefix for all Redis keys */
  prefix = 'rl';

  /**
   * Creates a new RateLimiter instance.
   *
   * @param connection - Redis connection instance
   * @param config - Optional configuration for the rate limiter
   *
   * @example
   * ```typescript
   * import Redis from 'ioredis';
   *
   * const redis = new Redis({
   *   host: 'localhost',
   *   port: 6379
   * });
   *
   * const rateLimiter = new RateLimiter(redis, {
   *   prefix: 'myapp:rl'
   * });
   * ```
   */
  constructor(connection: Redis, config?: RateLimiterConfig) {
    this.connection = connection;
    this.prefix = config?.prefix ?? this.prefix;
  }

  /**
   * Creates a rate limiter with the specified options.
   *
   * The returned object contains an evaluate function that can be called
   * to check if a request should be allowed. Each call to evaluate will
   * generate fresh keys and limits if they are dynamic.
   *
   * @param options - Configuration options for the rate limiter
   * @returns An object containing the evaluate function
   *
   * @example
   * ```typescript
   * // Static configuration
   * const staticLimiter = rateLimiter.create({
   *   algo: 'fixed_window',
   *   key: 'api:global',
   *   window: 60000,
   *   limit: 1000
   * });
   *
   * // Dynamic key with static limit
   * const userLimiter = rateLimiter.create({
   *   algo: 'sliding_window',
   *   key: () => `user:${getCurrentUserId()}`,
   *   window: 300000,
   *   limit: 50
   * });
   *
   * // Both key and limit dynamic (async)
   * const premiumLimiter = rateLimiter.create({
   *   algo: 'token_bucket',
   *   key: async () => {
   *     const userId = await getCurrentUserId();
   *     const tier = await getUserTier(userId);
   *     return `${tier}:${userId}`;
   *   },
   *   window: 3600000,
   *   limit: async () => {
   *     const user = await getCurrentUser();
   *     return user.isPremium ? 1000 : 100;
   *   },
   *   refill: 0.5
   * });
   *
   * // Usage
   * const result = await staticLimiter.evaluate();
   * const userResult = await userLimiter.evaluate();
   * const premiumResult = await premiumLimiter.evaluate();
   * ```
   */
  create(options: RateLimiterOptions) {
    return {
      evaluate: () => this.evaluate(options),
    };
  }

  /**
   * Generates a Redis key for the rate limiter, resolving dynamic keys if needed.
   *
   * @private
   * @template TAlgo - The algorithm type
   * @param algo - The rate limiting algorithm
   * @param key - The rate limiter key (string or generator function)
   * @returns Promise resolving to the generated Redis key
   *
   * @example
   * ```typescript
   * // Static key
   * const staticKey = await this.generateKey('fixed_window', 'api:global');
   * // Result: "rl:fixed_window:api:global"
   *
   * // Dynamic key (sync)
   * const dynamicKey = await this.generateKey('sliding_window', () => `user:${userId}`);
   * // Result: "rl:sliding_window:user:123"
   *
   * // Dynamic key (async)
   * const asyncKey = await this.generateKey('token_bucket', async () => {
   *   const user = await getUser();
   *   return `${user.tier}:${user.id}`;
   * });
   * // Result: "rl:token_bucket:premium:456"
   * ```
   */
  private async generateKey<TAlgo extends string>(
    algo: TAlgo,
    key: string | ValueGenerator<string>
  ) {
    let intermediateKey = '';
    if (typeof key === 'string') {
      intermediateKey = key;
    } else {
      const result = key();
      if (result instanceof Promise) {
        intermediateKey = await result;
      } else {
        intermediateKey = result;
      }
    }

    return `${this.prefix}:${algo}:${intermediateKey}`;
  }

  /**
   * Evaluates whether a request should be allowed based on the rate limit.
   *
   * This method generates the Redis key and resolves the limit value dynamically
   * on each evaluation, allowing for flexible rate limiting based on current context.
   *
   * @private
   * @param options - The rate limiter configuration
   * @returns Promise resolving to the evaluation result
   */
  private async evaluate(
    options: RateLimiterOptions
  ): Promise<RateLimiterEvaluationResult> {
    const { algo, limit: maxLimit, window, key } = options;

    // Generate the Redis key (may be async)
    const redisKey = await this.generateKey(algo, key);
    let limit = 0;

    // Resolve the limit (can be a number, function, or async function)
    if (typeof maxLimit === 'number') {
      limit = maxLimit;
    } else {
      const result = maxLimit();
      if (result instanceof Promise) {
        limit = await result;
      } else {
        limit = result;
      }
    }

    switch (algo) {
      case 'token_bucket': {
        const { refill } = options;
        return this.evaluateTokenBucketLimit(redisKey, limit, refill, window);
      }
      case 'sliding_window': {
        return this.evaluateSlidingWindowLimit(redisKey, limit, window);
      }
      case 'fixed_window': {
        return this.evaluateFixedWindowLimit(redisKey, limit, window);
      }
    }
  }

  /**
   * Evaluates a fixed window rate limit.
   *
   * In fixed window algorithm, the counter resets at fixed intervals.
   * This is the most memory-efficient but can allow bursts at window boundaries.
   *
   * @private
   * @param key - Redis key for the counter
   * @param limit - Maximum requests allowed in the window
   * @param window - Window duration in milliseconds
   * @returns Promise resolving to the evaluation result
   *
   * @example
   * ```
   * Window: 60 seconds, Limit: 10
   *
   * 0s-60s: 10 requests allowed
   * 60s:    Counter resets to 0
   * 60s-120s: 10 more requests allowed
   *
   * Potential issue: 10 requests at 59s + 10 requests at 61s = 20 requests in 2 seconds
   * ```
   */
  private async evaluateFixedWindowLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimiterEvaluationResult> {
    const count = await this.connection.incr(key);
    if (count === 1) {
      await this.connection.pexpire(key, window);
    }

    const ttl = await this.connection.pttl(key);
    const allowed = count <= limit;

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      retryAfter: allowed ? 0 : Math.ceil(ttl / 1000),
      limit,
    };
  }

  /**
   * Evaluates a token bucket rate limit.
   *
   * Token bucket allows burst traffic up to the bucket capacity,
   * then refills tokens at a steady rate. Good for APIs that need
   * to handle occasional spikes while maintaining average rate control.
   *
   * @private
   * @param key - Redis key for the bucket data
   * @param limit - Maximum tokens in the bucket (burst capacity)
   * @param refill - Rate of token refill (tokens per second)
   * @param window - TTL for the bucket data in milliseconds
   * @returns Promise resolving to the evaluation result
   *
   * @example
   * ```
   * Bucket size: 10, Refill: 1 token/second
   *
   * t=0s:  10 tokens available, use 10 → 0 tokens left
   * t=5s:  5 tokens refilled → 5 tokens available
   * t=10s: 5 more tokens refilled → 10 tokens available (capped at limit)
   * t=15s: Use 3 tokens → 7 tokens left, continue refilling
   * ```
   */
  private async evaluateTokenBucketLimit(
    key: string,
    limit: number,
    refill: number,
    window: number
  ): Promise<RateLimiterEvaluationResult> {
    const now = Date.now();

    const [tokensStr, lastRefillStr] = await this.connection.hmget(
      key,
      'tokens',
      'last_refill'
    );
    const tokens = Number.parseFloat(tokensStr ?? `${limit}`);
    const lastRefill = Number.parseInt(lastRefillStr ?? `${now}`, 10);

    // Calculate how many tokens to add based on elapsed time
    const elapsed = (now - lastRefill) / 1000;
    const refillAmount = Math.floor(elapsed * refill);
    let newTokens = Math.min(limit, tokens + refillAmount);

    let allowed = false;

    // Check if we have enough tokens for this request
    if (newTokens >= 1) {
      allowed = true;
      newTokens -= 1;
    }

    // Update the bucket state
    const tx = this.connection.multi();
    tx.hset(key, 'tokens', newTokens.toFixed(2), 'last_refill', now);
    tx.pexpire(key, window);
    await tx.exec();

    return {
      allowed,
      remaining: Math.floor(newTokens),
      retryAfter: allowed ? 0 : Math.ceil(1 / refill),
      limit,
    };
  }

  /**
   * Evaluates a sliding window rate limit.
   *
   * Sliding window maintains a rolling window of requests, providing
   * the most accurate rate limiting but using more memory. Each request
   * is tracked individually with timestamps.
   *
   * @private
   * @param key - Redis key for the sorted set of requests
   * @param limit - Maximum requests allowed in the sliding window
   * @param window - Window duration in milliseconds
   * @returns Promise resolving to the evaluation result
   *
   * @example
   * ```
   * Window: 60 seconds, Limit: 10
   *
   * t=0s:  Request 1 → Allowed (1/10)
   * t=30s: Request 2-6 → Allowed (6/10)
   * t=45s: Request 7-10 → Allowed (10/10)
   * t=50s: Request 11 → Denied (would exceed limit in 60s window)
   * t=60s: Request 1 expires from window → 9/10 used in current window
   * t=61s: New request → Allowed (10/10 in new 60s window)
   * ```
   */
  private async evaluateSlidingWindowLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<RateLimiterEvaluationResult> {
    const now = Date.now();
    const windowStart = now - window;

    // Remove expired requests from the sliding window
    await this.connection.zremrangebyscore(key, 0, windowStart);
    const count = await this.connection.zcard(key);

    // Add current request if under limit
    if (count < limit) {
      const tx = this.connection.multi();
      tx.zadd(key, now, `${now}-${Math.random()}`);
      tx.pexpire(key, window);
      await tx.exec();
    }

    // Calculate retry after time based on oldest request in window
    let retryAfter = 0;
    if (count >= limit) {
      const oldest = await this.connection.zrange(key, 0, 0, 'WITHSCORES');
      if (oldest.length === 2) {
        const score = oldest[1];
        if (score !== undefined) {
          retryAfter = Math.ceil(
            (Number.parseInt(score, 10) + window - now) / 1000
          );
        }
      }
    }

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      retryAfter,
      limit,
    };
  }
}

export default RateLimiter;
