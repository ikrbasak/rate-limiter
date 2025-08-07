# Rate Limiter ([@ikrbasak/rate-limiter](https://www.npmjs.com/package/@ikrbasak/rate-limiter?activeTab=readme))

A flexible, Redis-backed rate limiter for Node.js applications supporting multiple algorithms: Fixed Window, Sliding Window, and Token Bucket.

## Features

- 🚀 **Multiple Algorithms**: Fixed Window, Sliding Window, and Token Bucket
- 🔄 **Redis-backed**: Distributed rate limiting across multiple instances
- 📝 **TypeScript Support**: Full type safety with comprehensive JSDoc documentation
- ⚡ **High Performance**: Optimized Redis operations with pipelining
- 🎯 **Dynamic Configuration**: Support for dynamic keys and limits using sync/async functions
- 🛡️ **Production Ready**: Battle-tested algorithms with proper error handling

## Installation

```bash
npm install @ikrbasak/rate-limiter ioredis
```

```bash
yarn add @ikrbasak/rate-limiter ioredis
```

```bash
pnpm add @ikrbasak/rate-limiter ioredis
```

## Quick Start

```typescript
import Redis from 'ioredis';
import RateLimiter from '@ikrbasak/rate-limiter';

// Initialize Redis connection
const redis = new Redis('redis://localhost:6379');

// Create rate limiter instance
const rateLimiter = new RateLimiter(redis, {
  prefix: 'api', // Optional: custom Redis key prefix, defaults to 'rl'
});

// Create a rate limiter
const limiter = rateLimiter.create({
  algo: 'fixed_window',
  key: 'user:123',
  window: 60000, // 1 minute in milliseconds
  limit: 100, // 100 requests per minute
});

// Check rate limit
const result = await limiter.evaluate();

if (result.allowed) {
  // Process the request
  console.log(`Request allowed. ${result.remaining} requests remaining.`);
} else {
  // Rate limit exceeded
  console.log(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
}
```

## Algorithms

### 1. Fixed Window

Divides time into fixed intervals and counts requests within each interval.

```typescript
const limiter = rateLimiter.create({
  algo: 'fixed_window',
  key: 'api:user:123',
  window: 60000, // 1 minute window
  limit: 100, // 100 requests per window
});
```

**Use cases:**

- Simple API rate limiting
- Resource quotas
- Basic request throttling

**Pros:** Simple, memory efficient

**Cons:** Potential burst at window boundaries

### 2. Sliding Window

Maintains a log of request timestamps and counts requests within a sliding time window.

```typescript
const limiter = rateLimiter.create({
  algo: 'sliding_window',
  key: 'api:user:123',
  window: 60000, // 1 minute sliding window
  limit: 100, // 100 requests per minute
});
```

**Use cases:**

- More accurate rate limiting
- Preventing burst attacks
- Fair usage enforcement

**Pros:** Accurate, smooth rate limiting

**Cons:** Higher memory usage

### 3. Token Bucket

Maintains a bucket of tokens that are consumed by requests and refilled at a constant rate.

```typescript
const limiter = rateLimiter.create({
  algo: 'token_bucket',
  key: 'api:user:123',
  window: 3600000, // 1 hour token bucket lifetime
  limit: 1000, // Maximum 1000 tokens
  refill: 10, // 10 tokens per second
});
```

**Use cases:**

- Allowing burst traffic
- Credit-based systems
- Flexible rate limiting

**Pros:** Allows bursts, flexible

**Cons:** More complex to understand

## Configuration Options

### Common Options

```typescript
type CommonRateLimiterOptions = {
  key: string | ValueGenerator<string>; // Static string or function that returns string
  window: number; // Time window in milliseconds (positive integer)
  limit: number | ValueGenerator<number>; // Static number or function that returns number
};
```

### Algorithm-Specific Options

#### Fixed Window & Sliding Window

```typescript
{
  algo: 'fixed_window' | 'sliding_window',
  key: string | (() => string) | (() => Promise<string>),
  limit: number | (() => number) | (() => Promise<number>)
}
```

#### Token Bucket

```typescript
{
  algo: 'token_bucket',
  key: string | (() => string) | (() => Promise<string>),
  limit: number | (() => number) | (() => Promise<number>), // Maximum tokens
  refill: number // Refill rate per second (positive number)
}
```

## Advanced Usage

### Dynamic Keys

Use functions for dynamic rate limiting:

```typescript
// Synchronous key generation
const limiter = rateLimiter.create({
  algo: 'sliding_window',
  key: () => `user:${getCurrentUserId()}:${getClientIP()}`,
  window: 60000,
  limit: 50,
});

// Asynchronous key generation
const asyncLimiter = rateLimiter.create({
  algo: 'token_bucket',
  key: async (id: number) => {
    const userId = await getUserId(id);
    const tier = await getUserTier(userId);
    return `${tier}:${userId}`;
  },
  window: 3600000,
  limit: 1000,
  refill: 1,
});
```

### Dynamic Limits

Adjust limits based on user tiers, time of day, or other factors:

```typescript
// Synchronous limit generation
const limiter = rateLimiter.create({
  algo: 'fixed_window',
  key: 'api:user:123',
  window: 60000,
  limit: () => {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17 ? 1000 : 100; // Higher limits during business hours
  },
});

// Asynchronous limit generation
const premiumLimiter = rateLimiter.create({
  algo: 'sliding_window',
  key: 'api:user:123',
  window: 60000,
  limit: async () => {
    const user = await getUserById(123);
    return user.tier === 'premium' ? 1000 : 100;
  },
});
```

### Multiple Rate Limiters

Combine different algorithms for comprehensive protection:

```typescript
// Burst protection (short-term)
const burstLimiter = rateLimiter.create({
  algo: 'fixed_window',
  key: 'api:user:123',
  window: 1000, // 1 second
  limit: 10,
});

// Sustained usage (long-term)
const sustainedLimiter = rateLimiter.create({
  algo: 'sliding_window',
  key: 'api:user:123',
  window: 3600000, // 1 hour
  limit: 1000,
});

// Check both limits
const [burstResult, sustainedResult] = await Promise.all([
  burstLimiter.evaluate(),
  sustainedLimiter.evaluate(),
]);

const allowed = burstResult.allowed && sustainedResult.allowed;
```

## Response Format

The `evaluate()` method returns a `RateLimiterEvaluationResult`:

```typescript
{
  limit: number; // Applied limit (positive integer)
  allowed: boolean; // Whether request is allowed
  remaining: number; // Requests remaining (non-negative integer)
  retryAfter: number; // Seconds to wait before retry (0 if allowed)
}
```

## Best Practices

### 1. Choose the Right Algorithm

- **Fixed Window**: Simple APIs, basic protection, memory efficient
- **Sliding Window**: Accurate limiting, prevent bursts, fair usage
- **Token Bucket**: Allow legitimate bursts, credit systems, flexible limits

### 2. Key Design

```typescript
// Good: Specific and meaningful keys
key: () => `api:${endpoint}:user:${userId}`;
key: () => `download:${fileId}:ip:${clientIP}`;
key: async (id: number) => `tier:${await getUserTier(number)}:${userId}`;

// Avoid: Too generic or static when dynamic is needed
key: 'user';
key: 'api';
```

### 3. Window Sizing

```typescript
// Multiple time windows for different scenarios
const shortTerm = { window: 1000, limit: 5 }; // Burst protection
const mediumTerm = { window: 60000, limit: 100 }; // Per-minute limits
const longTerm = { window: 3600000, limit: 1000 }; // Hourly quotas
```

## Redis Configuration

For optimal performance, configure Redis with:

```redis
# Redis configuration for rate limiting
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

## Performance Considerations

- **Connection Pooling**: Use Redis connection pooling for high-traffic applications
- **Key Expiration**: All keys are automatically set to expire to prevent memory leaks
- **Pipeline Operations**: The library uses Redis transactions for atomic operations
- **Memory Usage**: Sliding window uses more memory than fixed window due to timestamp storage
- **Dynamic Function Caching**: Cache results of expensive async operations when possible

## TypeScript Support

The library is written in TypeScript and provides full type safety:

```typescript
import RateLimiter, {
  RateLimiterOptions,
  RateLimiterEvaluationResult,
  ValueGenerator,
  FixedWindowRateLimiterOptions,
  SlidingWindowRateLimiterOptions,
  TokenBucketRateLimiterOptions,
} from '@ikrbasak/rate-limiter';

// Type-safe configuration
const options: FixedWindowRateLimiterOptions = {
  algo: 'fixed_window',
  key: 'user:123',
  window: 60000,
  limit: 100,
};

// Type-safe result handling
const result: RateLimiterEvaluationResult = await limiter.evaluate();
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: some amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

MIT License. See [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: ikrbasak@gmail.com

---

**Keywords:** rate limiting, Redis, TypeScript, Node.js, API, throttling, token bucket, sliding window, fixed window, dynamic configuration
