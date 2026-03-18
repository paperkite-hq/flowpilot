# Steps

Steps are the building blocks of workflows. Each step is a named, observable unit of work with built-in retry and timeout.

## Basic step

```typescript
fp.workflow("example", async ({ step }) => {
  const result = await step("my-step", async () => {
    // do work here
    return "step output";
  });

  console.log(result); // "step output"
});
```

## Step context

Every step function receives a `StepContext` with access to the AI client and logger:

```typescript
await step("enrich", async ({ ai, log, executionId }) => {
  log.info("Enriching data...");

  const enriched = await ai.generate("Categorize this: ...");

  log.debug("Enrichment complete", { executionId });
  return enriched;
});
```

## Step configuration

Steps accept an optional config for retry and timeout:

```typescript
await step("call-api", async () => {
  const res = await fetch("https://api.example.com/data");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}, {
  retry: {
    maxAttempts: 5,       // try up to 5 times
    initialDelay: 1000,   // 1s before first retry
    backoffMultiplier: 2, // double the delay each time
    maxDelay: 30000,      // cap at 30s
  },
  timeout: 10000, // 10s per attempt
});
```

See [Retry & Timeout](/guide/retry-timeout) for details.

## Sequential steps

Steps run in the order they're called. The output of one step is available to the next:

```typescript
fp.workflow("pipeline", async ({ step }) => {
  const raw = await step("fetch", async () => {
    return fetchData();
  });

  const cleaned = await step("clean", async () => {
    return cleanData(raw);
  });

  const result = await step("transform", async () => {
    return transformData(cleaned);
  });

  return result;
});
```

## Step results

Each step produces a `StepResult` recorded in the execution history:

```typescript
interface StepResult<T = unknown> {
  stepId: string;       // step name
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: T;           // step return value
  error?: string;       // error message if failed
  startedAt: string;    // ISO timestamp
  completedAt?: string; // ISO timestamp
  attempts: number;     // total attempts (including retries)
  durationMs: number;   // total time including retries
}
```

## Dynamic steps

Steps can be created dynamically based on data:

```typescript
fp.workflow("batch-process", async ({ step, input }) => {
  const results = [];

  for (const item of input.items) {
    const result = await step(`process-${item.id}`, async () => {
      return processItem(item);
    });
    results.push(result);
  }

  return results;
});
```
