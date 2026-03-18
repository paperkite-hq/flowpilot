# Retry & Timeout

FlowPilot has built-in retry with exponential backoff and per-step timeouts.

## Retry

### Per-step retry

```typescript
await step("flaky-api", async () => {
  const res = await fetch("https://api.example.com/data");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}, {
  retry: {
    maxAttempts: 5,       // total attempts (1 initial + 4 retries)
    initialDelay: 1000,   // 1s before first retry
    backoffMultiplier: 2, // exponential: 1s → 2s → 4s → 8s
    maxDelay: 30000,      // cap delay at 30s
  },
});
```

### Default retry for all steps

Set a default retry config that applies to every step:

```typescript
const fp = new FlowPilot({
  defaultRetry: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
  },
});
```

Per-step config overrides the default.

### Retry config

| Option | Default | Description |
|---|---|---|
| `maxAttempts` | `1` | Total attempts including the first (1 = no retry) |
| `initialDelay` | `1000` | Milliseconds before the first retry |
| `backoffMultiplier` | `2` | Multiply delay after each retry |
| `maxDelay` | `30000` | Maximum delay between retries |

### How it works

With `maxAttempts: 4, initialDelay: 1000, backoffMultiplier: 2`:

1. **Attempt 1** — run immediately
2. **Attempt 2** — wait 1000ms, then retry
3. **Attempt 3** — wait 2000ms, then retry
4. **Attempt 4** — wait 4000ms, then retry
5. If all fail, the step fails with the last error

## Timeout

### Per-step timeout

```typescript
await step("slow-operation", async () => {
  // If this takes longer than 5s, it throws
  return longRunningOperation();
}, {
  timeout: 5000, // 5 seconds
});
```

### Default timeout

```typescript
const fp = new FlowPilot({
  defaultTimeout: 30000, // 30s default for all steps
});
```

The built-in default is 60 seconds.

### Timeout with retry

When combined, the timeout applies to **each individual attempt**:

```typescript
await step("api-call", async () => {
  return callExternalApi();
}, {
  timeout: 5000, // each attempt times out after 5s
  retry: {
    maxAttempts: 3, // retry up to 3 times on timeout or error
    initialDelay: 1000,
  },
});
```
