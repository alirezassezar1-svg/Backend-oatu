/**
 * NONONICK AUTOMATION ENGINE
 * Retry Manager
 * 
 * Default max retries = 3
 * Retry delays: 5s, 30s, 300s (5 minutes)
 */

export class RetryManager {
  private static RETRY_DELAYS_MS = [
    5 * 1000,    // Attempt 1: 5 seconds
    30 * 1000,   // Attempt 2: 30 seconds
    300 * 1000   // Attempt 3: 5 minutes
  ];

  public static readonly MAX_RETRIES = 3;

  /**
   * Evaluates whether an execution error qualifies for automated retry
   */
  public static shouldRetry(
    attemptNumber: number,
    error: string | null | undefined,
    isExplicitlyRetryable?: boolean
  ): boolean {
    if (attemptNumber >= this.MAX_RETRIES) {
      return false;
    }

    if (isExplicitlyRetryable === true) return true;
    if (isExplicitlyRetryable === false) return false;

    if (!error) return false;

    const lower = error.toLowerCase();
    // Non-retryable validation or business logic errors
    if (lower.includes('validation error') || 
        lower.includes('invalid syntax') || 
        lower.includes('unauthorized') ||
        lower.includes('malformed url') ||
        lower.includes('invalid config') ||
        lower.includes('404 not found') ||
        lower.includes('400 bad request')) {
      return false;
    }

    // Retryable network or transient upstream errors
    return (
      lower.includes('timeout') ||
      lower.includes('econnreset') ||
      lower.includes('econnrefused') ||
      lower.includes('503') ||
      lower.includes('502') ||
      lower.includes('504') ||
      lower.includes('429') ||
      lower.includes('network')
    );
  }

  /**
   * Computes the next retry timestamp based on attempt number
   */
  public static getNextRetryTimestamp(attemptNumber: number): string {
    const delayIndex = Math.min(Math.max(attemptNumber - 1, 0), this.RETRY_DELAYS_MS.length - 1);
    const delay = this.RETRY_DELAYS_MS[delayIndex];
    return new Date(Date.now() + delay).toISOString();
  }
}
