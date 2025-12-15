/**
 * Retry options for withRetry function
 */
export interface RetryOptions {
  retries: number;
  delay: number;
  backoff: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute a function with automatic retry on failure
 * Uses exponential backoff: delay * (backoff ^ attempt)
 * 
 * @example
 * const result = await withRetry(
 *   () => fetch(url),
 *   { retries: 3, delay: 1000, backoff: 2 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    retries: 3,
    delay: 1000,
    backoff: 2,
    ...options
  };

  let lastError: Error;

  for (let attempt = 0; attempt < config.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < config.retries - 1) {
        const waitTime = config.delay * Math.pow(config.backoff, attempt);
        
        if (config.onRetry) {
          config.onRetry(attempt + 1, lastError);
        } else {
          console.warn(
            `[Retry] Attempt ${attempt + 1}/${config.retries} failed. ` +
            `Retrying in ${waitTime}ms... Error: ${lastError.message}`
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}

