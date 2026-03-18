# Parallel Steps

Fetch multiple URLs concurrently and aggregate results.

## Code

<<< @/../examples/parallel-steps.ts

## What it demonstrates

- **`ctx.parallel()`** — runs multiple steps at the same time
- **Per-step config** — each parallel step gets its own retry and timeout
- **Mixed flow** — sequential validation → parallel fetch → sequential merge
- **Event hooks** — `onSuccess` logs timing information

## Running it

```bash
bun run examples/parallel-steps.ts
```

## Key concepts

### Parallel step definition

Each step in `parallel()` is an object with `id`, `fn`, and optional `config`:

```typescript
const [a, b] = await parallel(
  { id: "step-a", fn: async () => "result-a" },
  { id: "step-b", fn: async () => "result-b", config: { timeout: 5000 } },
);
```

### Error handling

If any parallel step fails, the entire `parallel()` call fails. Use retry config on individual steps to handle transient failures:

```typescript
{
  id: "flaky-api",
  fn: async () => fetch(url).then(r => r.json()),
  config: { retry: { maxAttempts: 3, initialDelay: 500 } },
}
```
