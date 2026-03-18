import type { RetryConfig } from "./types.ts";

const DEFAULT_RETRY: Required<RetryConfig> = {
	maxAttempts: 1,
	initialDelay: 1000,
	backoffMultiplier: 2,
	maxDelay: 30_000,
};

export function resolveRetryConfig(
	config?: RetryConfig,
	defaults?: RetryConfig,
): Required<RetryConfig> {
	return {
		maxAttempts: config?.maxAttempts ?? defaults?.maxAttempts ?? DEFAULT_RETRY.maxAttempts,
		initialDelay: config?.initialDelay ?? defaults?.initialDelay ?? DEFAULT_RETRY.initialDelay,
		backoffMultiplier:
			config?.backoffMultiplier ?? defaults?.backoffMultiplier ?? DEFAULT_RETRY.backoffMultiplier,
		maxDelay: config?.maxDelay ?? defaults?.maxDelay ?? DEFAULT_RETRY.maxDelay,
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	config: Required<RetryConfig>,
	onRetry?: (attempt: number, error: Error, delayMs: number) => void,
): Promise<{ result: T; attempts: number }> {
	let lastError: Error | undefined;
	let delay = config.initialDelay;

	for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
		try {
			const result = await fn();
			return { result, attempts: attempt };
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			if (attempt < config.maxAttempts) {
				onRetry?.(attempt, lastError, delay);
				await sleep(delay);
				delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
			}
		}
	}

	throw lastError;
}
