# Workflows

A workflow is a named, reusable function that contains one or more steps. Each workflow execution is recorded with full step-level tracing.

## Defining a workflow

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot();

fp.workflow("my-workflow", async ({ step, input, log, ai, executionId }) => {
  // step()   — run a named step
  // input    — the input data passed to fp.run()
  // log      — structured logger
  // ai       — LLM client
  // executionId — unique ID for this execution

  const data = await step("fetch-data", async () => {
    return { items: [1, 2, 3] };
  });

  return data;
});
```

## Running a workflow

```typescript
const result = await fp.run("my-workflow", { key: "value" });

console.log(result.status);    // "completed" or "failed"
console.log(result.output);    // return value from the workflow function
console.log(result.durationMs); // total execution time
console.log(result.steps);     // array of step results
```

## Typed inputs and outputs

Use generics for type-safe workflow I/O:

```typescript
interface SummarizeInput {
  url: string;
  maxLength?: number;
}

fp.workflow<SummarizeInput, string>("summarize", async ({ step, input }) => {
  // input is typed as SummarizeInput
  const content = await step("fetch", async () => {
    const res = await fetch(input.url);
    return res.text();
  });

  return content.slice(0, input.maxLength ?? 1000);
});

// Type-safe invocation
await fp.run<SummarizeInput, string>("summarize", {
  url: "https://example.com",
  maxLength: 500,
});
```

## Execution records

Every `fp.run()` call returns an `ExecutionRecord`:

```typescript
interface ExecutionRecord {
  id: string;           // unique execution ID
  workflowId: string;   // the workflow name
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  input?: unknown;      // the input data
  output?: unknown;     // the return value
  error?: string;       // error message if failed
  steps: StepResult[];  // per-step details
  startedAt: string;    // ISO timestamp
  completedAt?: string; // ISO timestamp
  durationMs?: number;  // total duration
}
```

## Querying execution history

```typescript
// Get a specific execution
const exec = fp.getExecution("1234567890-abc");

// List recent executions
const all = fp.listExecutions(); // last 20

// Filter by workflow
const summarizeRuns = fp.listExecutions("summarize", 10);
```

## Error handling

If any step throws, the workflow is marked as `"failed"` and the error is captured:

```typescript
fp.workflow("risky", async ({ step }) => {
  await step("might-fail", async () => {
    throw new Error("Something went wrong");
  });

  // This step never runs
  await step("never-reached", async () => {
    return "won't get here";
  });
});

const result = await fp.run("risky");
console.log(result.status); // "failed"
console.log(result.error);  // "Something went wrong"
```
