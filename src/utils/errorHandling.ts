/**
 * Error handling utilities for the Symmetric app
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'NETWORK_ERROR', undefined, originalError);
    this.name = 'NetworkError';
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode: number, originalError?: Error) {
    super(message, 'API_ERROR', statusCode, originalError);
    this.name = 'APIError';
  }
}

export class SensorError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SENSOR_ERROR', undefined, originalError);
    this.name = 'SensorError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', undefined, originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Check if an error is a specific type
 */
export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError;
};

export const isAPIError = (error: unknown): error is APIError => {
  return error instanceof APIError;
};

export const isSensorError = (error: unknown): error is SensorError => {
  return error instanceof SensorError;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof NetworkError) {
    return 'Network connection issue. Please check your internet and try again.';
  }

  if (error instanceof APIError) {
    if (error.statusCode === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.statusCode === 503) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    return 'Service error. Please try again.';
  }

  if (error instanceof SensorError) {
    return 'Sensor connection issue. Please check your device.';
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Log error to console with context
 */
export const logError = (
  error: unknown,
  context?: string,
  metadata?: Record<string, unknown>
) => {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('=== Error Log ===');
  console.error('Timestamp:', timestamp);
  if (context) console.error('Context:', context);
  console.error('Message:', errorMessage);
  if (errorStack) console.error('Stack:', errorStack);
  if (metadata) console.error('Metadata:', metadata);
  console.error('================');

  // In production, you would send this to a logging service
  // Example: Sentry, LogRocket, DataDog, etc.
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = <T = unknown>(
  json: string,
  fallback: T
): T => {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logError(error, 'safeJsonParse', { json });
    return fallback;
  }
};

/**
 * Safe localStorage operations
 */
export const safeLocalStorage = {
  getItem: <T = string>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      logError(error, 'safeLocalStorage.getItem', { key });
      return fallback;
    }
  },

  setItem: (key: string, value: unknown): boolean => {
    try {
      const stringValue = typeof value === 'string'
        ? value
        : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      logError(error, 'safeLocalStorage.setItem', { key });
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logError(error, 'safeLocalStorage.removeItem', { key });
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logError(error, 'safeLocalStorage.clear');
      return false;
    }
  },
};

/**
 * Retry utility with exponential backoff
 */
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    maxDelayMs = 10000,
    shouldRetry,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetryError = shouldRetry ? shouldRetry(error, attempt) : true;

      // Don't retry on last attempt or if shouldRetry returns false
      if (attempt === maxAttempts || !shouldRetryError) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const calculatedDelay = exponentialBackoff
        ? Math.min(delayMs * Math.pow(2, attempt - 1), maxDelayMs)
        : delayMs;

      logError(error, 'retry', {
        attempt,
        maxAttempts,
        nextDelayMs: calculatedDelay,
      });

      // Call retry callback
      if (onRetry) {
        onRetry(error, attempt);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, calculatedDelay));
    }
  }

  throw lastError;
};

/**
 * Timeout utility - reject promise if it takes too long
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error(`Operation timed out after ${timeoutMs}ms`)
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(timeoutError), timeoutMs)
    ),
  ]);
};

/**
 * Circuit breaker pattern - prevent cascade failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      monitoringPeriodMs?: number;
    } = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      monitoringPeriodMs: 120000,
      ...options,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const timeSinceLastFailure = this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : Infinity;

      if (timeSinceLastFailure < this.options.resetTimeoutMs!) {
        throw new Error('Circuit breaker is open. Service temporarily unavailable.');
      }

      // Try to recover
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold!) {
      this.state = 'open';
      logError(
        new Error('Circuit breaker opened'),
        'CircuitBreaker',
        { failureCount: this.failureCount }
      );
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
  }
}
