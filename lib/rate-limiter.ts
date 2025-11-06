// Rate limiter utility for Appwrite operations
export class RateLimiter {
  private lastCallTime: number = 0;
  private minInterval: number;

  constructor(requestsPerMinute: number = 60) {
    // Convert requests per minute to minimum interval in milliseconds
    this.minInterval = (60 * 1000) / requestsPerMinute;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTime = Date.now();
  }
}

// Global rate limiter instances
export const databaseRateLimiter = new RateLimiter(30); // 30 requests per minute for database
export const apiRateLimiter = new RateLimiter(10); // 10 requests per minute for external API

// Retry utility with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        if (appwriteError.code === 429) {
          console.log(`Rate limit hit on attempt ${attempt + 1}, will retry...`);
          continue;
        }
      }

      // For non-rate-limit errors, only retry if we have attempts left
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError!;
}

// Batch processing utility
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5,
  delayBetweenBatches: number = 2000
): Promise<{ results: R[]; errors: string[] }> {
  const results: R[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`);

    // Process batch items sequentially with rate limiting
    for (const item of batch) {
      try {
        await databaseRateLimiter.waitIfNeeded();
        const result = await withRetry(() => processor(item));
        results.push(result);
      } catch (error) {
        const errorMsg = `Failed to process item: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Delay between batches (except for the last batch)
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayBetweenBatches}ms between batches...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return { results, errors };
}