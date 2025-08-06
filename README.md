# Rate Limiter ([@ikrbasak/rate-limiter](https://www.npmjs.com/package/@ikrbasak/rate-limiter?activeTab=readme))

A flexible, Redis-backed rate limiter for Node.js applications supporting multiple algorithms: Fixed Window, Sliding Window, and Token Bucket.

## Features

- 🚀 **Multiple Algorithms**: Fixed Window, Sliding Window, and Token Bucket
- 🔄 **Redis-backed**: Distributed rate limiting across multiple instances
- 📝 **TypeScript Support**: Full type safety with comprehensive JSDoc documentation
- ⚡ **High Performance**: Optimized Redis operations with pipelining
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
  prefix: 'api', // Optional: custom Redis key prefix, default to 'rl'
});

// Create a rate limiter
const limiter = rateLimiter.create({
  algo: 'fixed_window',
  key: 'user:123',
  window: 60000, // 1 minute in milliseconds
  max: 100, // 100 requests per minute
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
  max: 100, // 100 requests per window
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
  max: 100, // 100 requests per minute
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
  capacity: 1000, // Maximum 1000 tokens
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
  key: string | (() => string); // Unique identifier
  window: number; // Time window in milliseconds (positive integer)
};
```

### Algorithm-Specific Options

#### Fixed Window & Sliding Window

```typescript
{
  algo: 'fixed_window' | 'sliding_window',
  max: number // Maximum requests (positive integer)
}
```

#### Token Bucket

```typescript
{
  algo: 'token_bucket',
  capacity: number, // Maximum tokens (positive integer)
  refill: number // Refill rate per second (positive number)
}
```

## Advanced Usage

### Dynamic Keys

Use functions for dynamic rate limiting:

```typescript
const limiter = rateLimiter.create({
  algo: 'sliding_window',
  key: () => `user:${getCurrentUserId()}:${getClientIP()}`,
  window: 60000,
  max: 50,
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
  max: 10,
});

// Sustained usage (long-term)
const sustainedLimiter = rateLimiter.create({
  algo: 'sliding_window',
  key: 'api:user:123',
  window: 3600000, // 1 hour
  max: 1000,
});

// Check both limits
const [burstResult, sustainedResult] = await Promise.all([
  burstLimiter.evaluate(),
  sustainedLimiter.evaluate(),
]);

const allowed = burstResult.allowed && sustainedResult.allowed;
```

### Express.js Middleware

```typescript
import express from 'express';

function createRateLimitMiddleware(limiterOptions: RateLimiterOptions) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const limiter = rateLimiter.create({
      ...limiterOptions,
      key: req.ip || 'anonymous',
    });

    try {
      const result = await limiter.evaluate();

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(
          Date.now() + result.retryAfter * 1000
        ).toISOString(),
      });

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next(); // Fail open - allow request if rate limiter fails
    }
  };
}

// Usage
const app = express();
app.use(
  '/api',
  createRateLimitMiddleware({
    algo: 'sliding_window',
    window: 60000,
    max: 100,
  })
);
```

### Next.js API Route

```typescript
// pages/api/example.ts or app/api/example/route.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const limiter = rateLimiter.create({
    algo: 'fixed_window',
    key:
      (req.headers['x-forwarded-for'] as string) ||
      req.connection.remoteAddress ||
      'anonymous',
    window: 60000,
    max: 10,
  });

  const result = await limiter.evaluate();

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
    });
  }

  // Process request
  res.json({ message: 'Success', remaining: result.remaining });
}
```

## Response Format

The `evaluate()` method returns a `RateLimiterEvaluationResult`:

```typescript
{
  limit: number; // Configured limit (positive integer)
  allowed: boolean; // Whether request is allowed
  remaining: number; // Requests remaining (non-negative integer)
  retryAfter: number; // Seconds to wait before retry (0 if allowed)
}
```

## Error Handling

```typescript
try {
  const result = await limiter.evaluate();
  // Handle result
} catch (error) {
  console.error('Rate limiter error:', error);
  // Implement fallback strategy (fail open/closed)

  // Fail open (allow request)
  return { allowed: true, remaining: 0, retryAfter: 0, limit: 0 };

  // Or fail closed (deny request)
  // return { allowed: false, remaining: 0, retryAfter: 60, limit: 0 };
}
```

## Best Practices

### 1. Choose the Right Algorithm

- **Fixed Window**: Simple APIs, basic protection
- **Sliding Window**: Accurate limiting, prevent bursts
- **Token Bucket**: Allow legitimate bursts, credit systems

### 2. Key Design

```typescript
// Good: Specific and meaningful
key: `api:${endpoint}:user:${userId}`;
key: `download:${fileId}:ip:${clientIP}`;

// Avoid: Too generic
key: 'user';
key: 'api';
```

### 3. Window Sizing

```typescript
// Multiple time windows for different scenarios
const shortTerm = { window: 1000, max: 5 }; // Burst protection
const mediumTerm = { window: 60000, max: 100 }; // Per-minute limits
const longTerm = { window: 3600000, max: 1000 }; // Hourly quotas
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

**Keywords:** rate limiting, Redis, TypeScript, Node.js, API, throttling, token bucket, sliding window, fixed window
