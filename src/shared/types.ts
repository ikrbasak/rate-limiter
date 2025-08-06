export type RateLimiterKey = string | (() => string);
export type CommonRateLimiterOptions = { key: RateLimiterKey; window: number };
export type FixedWindowRateLimiterOptions = CommonRateLimiterOptions & {
  algo: 'fixed_window';
  max: number;
};
export type SlidingWindowRateLimiterOptions = CommonRateLimiterOptions & {
  algo: 'sliding_window';
  max: number;
};
export type TokenBucketRateLimiterOptions = CommonRateLimiterOptions & {
  algo: 'token_bucket';
  capacity: number;
  refill: number;
};
export type RateLimiterOptions =
  | FixedWindowRateLimiterOptions
  | SlidingWindowRateLimiterOptions
  | TokenBucketRateLimiterOptions;
export type RateLimiterConfig = { prefix?: string };
export type RateLimiterEvaluationResult = {
  limit: number;
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};
