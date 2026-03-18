# FlowPilot

Bun-native AI workflow engine for TypeScript. Define, execute, and observe multi-step workflows with built-in LLM integration, retry logic, and persistence.

## Features

- **TypeScript-first** — define workflows as code, not YAML or JSON
- **Bun-native** — built for Bun's runtime, including `bun:sqlite` for zero-dependency persistence
- **AI-native** — first-class LLM integration (Anthropic Claude, OpenAI) available in every step
- **Reliable** — automatic retry with exponential backoff, per-step timeouts
- **Observable** — execution history stored in SQLite, queryable via API or CLI
- **Lightweight** — zero npm dependencies, runs anywhere Bun runs

## Quick Start

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot();

fp.workflow("hello", async ({ step, log }) => {
  const greeting = await step("greet", async () => {
    return "Hello from FlowPilot!";
  });

  await step("print", async () => {
    log.info(greeting);
  });

  return greeting;
});

const result = await fp.run("hello");
console.log(result.output); // "Hello from FlowPilot!"
```

## AI Workflows

Pass an AI provider config to use LLMs inside your steps:

```typescript
const fp = new FlowPilot({
  ai: { provider: "anthropic" }, // uses ANTHROPIC_API_KEY env var
});

fp.workflow("summarize", async ({ step, input }) => {
  const content = await step("fetch", async () => {
    const res = await fetch(input.url);
    return res.text();
  });

  const summary = await step("summarize", async ({ ai }) => {
    return ai.generate(`Summarize this:\n\n${content}`, {
      maxTokens: 256,
    });
  }, { retry: { maxAttempts: 3 } });

  return summary;
});

await fp.run("summarize", { url: "https://example.com" });
```

## Retry & Timeout

Every step supports configurable retry with exponential backoff and timeouts:

```typescript
await step("flaky-api", async () => {
  const res = await fetch("https://api.example.com/data");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}, {
  retry: {
    maxAttempts: 5,
    initialDelay: 1000,   // 1s before first retry
    backoffMultiplier: 2, // 1s → 2s → 4s → 8s
    maxDelay: 30000,      // cap at 30s
  },
  timeout: 10000, // 10s per attempt
});
```

## Execution History

Every execution is persisted to SQLite automatically:

```typescript
// Query programmatically
const executions = fp.listExecutions("my-workflow", 10);

// Or use the CLI
// bun run flowpilot history --workflow my-workflow --limit 10
```

## CLI

```bash
# Run a workflow file
bun run flowpilot run ./my-workflow.ts

# Pass JSON input
bun run flowpilot run ./my-workflow.ts --input '{"url": "https://example.com"}'

# View execution history
bun run flowpilot history
bun run flowpilot history --workflow summarize --limit 5
```

## Configuration

```typescript
const fp = new FlowPilot({
  // SQLite database path (default: ./flowpilot.db, use ":memory:" for ephemeral)
  dbPath: "./my-workflows.db",

  // Default AI provider
  ai: {
    provider: "anthropic",  // or "openai"
    model: "claude-sonnet-4-20250514",
    apiKey: "sk-...",       // or set ANTHROPIC_API_KEY / OPENAI_API_KEY
  },

  // Default retry for all steps
  defaultRetry: {
    maxAttempts: 3,
    initialDelay: 1000,
  },

  // Default step timeout (ms)
  defaultTimeout: 60000,

  // Log level
  logLevel: "info", // "debug" | "info" | "warn" | "error"
});
```

## Docker

Run FlowPilot in Docker with zero setup:

```bash
docker run --rm -v $(pwd):/app -w /app oven/bun:1 bun run flowpilot run ./my-workflow.ts
```

Or use the included Dockerfile:

```bash
docker build -t flowpilot .
docker run --rm flowpilot examples/hello-world.ts
```

## Documentation

Full documentation is available at [the docs site](https://paperkite-hq.github.io/flowpilot/):

```bash
bun run docs:dev  # Start local dev server
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

AGPL-3.0-or-later
