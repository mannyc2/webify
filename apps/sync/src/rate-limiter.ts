/**
 * Token bucket rate limiter for Workers.
 * Since Workers can't block/sleep, when tokens are exhausted the caller
 * should re-enqueue remaining work for later processing.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private consecutiveFailures = 0;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number, // tokens per second
    private readonly circuitBreakerThreshold = 3,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /** Try to consume a token. Returns true if allowed, false if exhausted. */
  tryConsume(): boolean {
    if (this.isCircuitOpen()) return false;
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Record a successful request (resets circuit breaker). */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /** Record a rate-limited (429) response. */
  recordRateLimited(): void {
    this.consecutiveFailures++;
  }

  /** Check if circuit breaker is open (too many consecutive 429s). */
  isCircuitOpen(): boolean {
    return this.consecutiveFailures >= this.circuitBreakerThreshold;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
