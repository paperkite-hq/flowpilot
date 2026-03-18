# FlowPilot API

## `new FlowPilot(config?)`

Creates a new FlowPilot engine instance.

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot({
  dbPath: "./flowpilot.db",
  ai: { provider: "anthropic" },
  defaultRetry: { maxAttempts: 3 },
  defaultTimeout: 60000,
  logLevel: "info",
});
```

### `FlowPilotConfig`

| Property | Type | Default | Description |
|---|---|---|---|
| `dbPath` | `string` | `"./flowpilot.db"` | SQLite database path. Use `":memory:"` for ephemeral. |
| `ai` | `AIProviderConfig` | — | Default AI provider configuration |
| `defaultRetry` | `RetryConfig` | `{ maxAttempts: 1 }` | Default retry config for all steps |
| `defaultTimeout` | `number` | `60000` | Default step timeout in milliseconds |
| `logLevel` | `"debug" \| "info" \| "warn" \| "error"` | `"info"` | Minimum log level |

---

## `fp.workflow(id, fn)`

Register a workflow definition.

```typescript
fp.workflow<InputType, OutputType>(id: string, fn: WorkflowFn): WorkflowDefinition
```

**Parameters:**
- `id` — unique workflow identifier
- `fn` — async function receiving a `WorkflowContext`

**Throws** if a workflow with the same `id` is already registered.

**Returns** the `WorkflowDefinition` object.

---

## `fp.run(workflowId, input?)`

Execute a registered workflow.

```typescript
const result = await fp.run<InputType, OutputType>(workflowId: string, input?: InputType): Promise<ExecutionRecord>
```

**Parameters:**
- `workflowId` — the workflow to execute
- `input` — optional input data passed to the workflow context

**Returns** an `ExecutionRecord` with the full execution trace.

**Throws** if the workflow is not registered.

---

## `fp.getExecution(id)`

Retrieve a specific execution record by ID.

```typescript
const exec = fp.getExecution(executionId: string): ExecutionRecord | undefined
```

---

## `fp.listExecutions(workflowId?, limit?)`

List recent executions, optionally filtered by workflow.

```typescript
const executions = fp.listExecutions(workflowId?: string, limit?: number): ExecutionRecord[]
```

**Parameters:**
- `workflowId` — optional filter by workflow name
- `limit` — max results (default: 20)

---

## `fp.close()`

Close the SQLite database connection. Call when done with the instance.

```typescript
fp.close(): void
```

---

## `WorkflowContext`

Passed to the workflow function:

| Property | Type | Description |
|---|---|---|
| `input` | `TInput` | The input data |
| `step` | `(id, fn, config?) => Promise<T>` | Run a named step |
| `ai` | `AIClient` | LLM client |
| `log` | `Logger` | Structured logger |
| `executionId` | `string` | Unique execution ID |

---

## `StepContext`

Passed to each step function:

| Property | Type | Description |
|---|---|---|
| `ai` | `AIClient` | LLM client |
| `log` | `Logger` | Structured logger |
| `executionId` | `string` | Unique execution ID |
