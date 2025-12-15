/**
 * Rate limiter for throttling concurrent operations
 * 
 * @example
 * const limiter = new RateLimiter(2, 5000);
 * for (let i = 0; i < 10; i++) {
 *   await limiter.throttle(() => expensiveOperation());
 * }
 */
export class RateLimiter {
  private queue: Array<(value?: unknown) => void> = [];
  private running = 0;

  /**
   * @param maxConcurrent - Maximum concurrent operations
   * @param minDelay - Minimum milliseconds between operations
   */
  constructor(
    private maxConcurrent: number,
    private minDelay: number
  ) {
    if (maxConcurrent < 1) {
      throw new Error('maxConcurrent must be at least 1');
    }
    if (minDelay < 0) {
      throw new Error('minDelay must be >= 0');
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if max concurrent operations are running
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;
    try {
      const result = await fn();
      
      // Enforce minimum delay between operations
      if (this.minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay));
      }
      
      return result;
    } finally {
      this.running--;
      
      // Process next item in queue
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      minDelay: this.minDelay
    };
  }
}

