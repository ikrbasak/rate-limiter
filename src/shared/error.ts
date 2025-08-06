export class RateLimiterError extends Error {
  cause: Record<string, string | number | boolean>;

  constructor(
    message: string,
    cause: Record<string, string | number | boolean>
  ) {
    super(message);
    this.cause = cause;
  }
}
