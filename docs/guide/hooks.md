# Event Hooks

FlowPilot fires lifecycle hooks after each workflow execution, letting you react to success, failure, or completion.

## Available hooks

| Hook | Fires when |
|---|---|
| `onSuccess` | Workflow completes successfully |
| `onFailure` | Workflow fails (step error, timeout, etc.) |
| `onComplete` | After every execution (success or failure) |

## Configuration

Pass hooks when creating a FlowPilot instance:

```typescript
const fp = new FlowPilot({
  hooks: {
    onSuccess: (record) => {
      console.log(`${record.workflowId} completed in ${record.durationMs}ms`);
    },
    onFailure: (record) => {
      console.error(`${record.workflowId} failed: ${record.error}`);
    },
    onComplete: (record) => {
      // Runs after every execution
      metrics.record(record);
    },
  },
});
```

## The ExecutionRecord

Every hook receives the full `ExecutionRecord`:

```typescript
interface ExecutionRecord {
  id: string;           // unique execution ID
  workflowId: string;   // workflow name
  status: "completed" | "failed";
  input?: unknown;       // workflow input
  output?: unknown;      // workflow output (on success)
  error?: string;        // error message (on failure)
  steps: StepResult[];   // individual step results
  startedAt: string;     // ISO timestamp
  completedAt?: string;  // ISO timestamp
  durationMs?: number;   // total execution time
}
```

## Async hooks

Hooks can be async — FlowPilot awaits them before returning from `fp.run()`:

```typescript
const fp = new FlowPilot({
  hooks: {
    onFailure: async (record) => {
      await fetch("https://hooks.slack.com/...", {
        method: "POST",
        body: JSON.stringify({ text: `Workflow ${record.workflowId} failed: ${record.error}` }),
      });
    },
  },
});
```

## Error handling

Hook errors are caught and logged — they never cause the workflow execution to fail:

```typescript
const fp = new FlowPilot({
  hooks: {
    onSuccess: () => {
      throw new Error("hook bug");
      // Logged as warning, but fp.run() still returns successfully
    },
  },
});
```

## Use cases

- **Alerting**: Send Slack/email/PagerDuty alerts on failure
- **Metrics**: Record execution times, success rates
- **Chaining**: Trigger downstream workflows on completion
- **Logging**: Custom structured logging beyond the built-in logger
- **Cleanup**: Release resources after execution
