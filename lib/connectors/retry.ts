import { ConnectorFailure } from "./errors";

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  delay: (milliseconds: number) => Promise<void>;
};

export async function withRetry<ResultType>(
  operation: () => Promise<ResultType>,
  options: RetryOptions,
): Promise<ResultType> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error("Retry maximum attempts must be a positive integer.");
  }

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof ConnectorFailure) || !error.retryable || attempt === options.maxAttempts) throw error;
      const exponentialDelay = options.baseDelayMs * 2 ** (attempt - 1);
      const requestedDelay = error.retryAfterMs ?? exponentialDelay;
      await options.delay(Math.max(0, Math.min(requestedDelay, options.maxDelayMs)));
    }
  }

  throw new Error("Retry attempts were exhausted.");
}
