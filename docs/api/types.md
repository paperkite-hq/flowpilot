# Types

All types are exported from the main `flowpilot` package:

```typescript
import type {
  FlowPilotConfig,
  ExecutionRecord,
  ExecutionStatus,
  StepResult,
  StepStatus,
  RetryConfig,
  StepConfig,
  WorkflowContext,
  StepContext,
  AIClient,
  AIGenerateOptions,
  AIProviderConfig,
  WorkflowDefinition,
  Logger,
  ExecutionId,
  WorkflowId,
} from "flowpilot";
```

---

## `ExecutionRecord`

```typescript
interface ExecutionRecord {
  id: ExecutionId;
  workflowId: WorkflowId;
  status: ExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  steps: StepResult[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}
```

## `ExecutionStatus`

```typescript
type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
```

## `StepResult`

```typescript
interface StepResult<T = unknown> {
  stepId: string;
  status: StepStatus;
  output?: T;
  error?: string;
  startedAt: string;
  completedAt?: string;
  attempts: number;
  durationMs: number;
}
```

## `StepStatus`

```typescript
type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
```

## `RetryConfig`

```typescript
interface RetryConfig {
  maxAttempts?: number;      // default: 1 (no retry)
  initialDelay?: number;     // default: 1000ms
  backoffMultiplier?: number; // default: 2
  maxDelay?: number;         // default: 30000ms
}
```

## `StepConfig`

```typescript
interface StepConfig {
  retry?: RetryConfig;
  timeout?: number; // default: 60000ms
}
```

## `AIProviderConfig`

```typescript
interface AIProviderConfig {
  provider: "anthropic" | "openai";
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}
```

## `AIGenerateOptions`

```typescript
interface AIGenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}
```

## `AIClient`

```typescript
interface AIClient {
  generate(prompt: string, options?: AIGenerateOptions): Promise<string>;
}
```

## `Logger`

```typescript
interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}
```
