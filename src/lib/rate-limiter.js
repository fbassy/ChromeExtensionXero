/**
 * Rate limiter for Xero API calls.
 * Enforces: 5 concurrent, 60 per minute, 5000 per day.
 */

export class RateLimiter {
  constructor({
    maxConcurrent = 5,
    maxPerMinute = 60,
    maxPerDay = 5000,
  } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.maxPerMinute = maxPerMinute;
    this.maxPerDay = maxPerDay;
    this.activeCount = 0;
    this.minuteTimestamps = [];
    this.dayTimestamps = [];
    this.queue = [];
  }

  /**
   * Execute a request function respecting rate limits.
   * Queues the request if limits would be exceeded.
   */
  async execute(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this._processQueue();
    });
  }

  _canProceed() {
    const now = Date.now();

    // Clean old timestamps
    const oneMinuteAgo = now - 60_000;
    this.minuteTimestamps = this.minuteTimestamps.filter((t) => t > oneMinuteAgo);

    const oneDayAgo = now - 86_400_000;
    this.dayTimestamps = this.dayTimestamps.filter((t) => t > oneDayAgo);

    return (
      this.activeCount < this.maxConcurrent &&
      this.minuteTimestamps.length < this.maxPerMinute &&
      this.dayTimestamps.length < this.maxPerDay
    );
  }

  async _processQueue() {
    while (this.queue.length > 0 && this._canProceed()) {
      const { requestFn, resolve, reject } = this.queue.shift();
      const now = Date.now();

      this.activeCount++;
      this.minuteTimestamps.push(now);
      this.dayTimestamps.push(now);

      requestFn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.activeCount--;
          this._processQueue();
        });
    }

    // If there are still queued items but we can't proceed, schedule a retry
    if (this.queue.length > 0 && !this._canProceed()) {
      setTimeout(() => this._processQueue(), 1000);
    }
  }
}

// Shared instance for all Xero API calls
export const xeroRateLimiter = new RateLimiter();
