# Getting Started

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later

## Installation

```bash
bun add flowpilot
```

## Your first workflow

Create a file called `hello.ts`:

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot({ dbPath: ":memory:" });

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
console.log(result.status); // "completed"
console.log(result.steps);  // [{stepId: "greet", ...}, {stepId: "print", ...}]

fp.close();
```

Run it:

```bash
bun run hello.ts
```

## What just happened?

1. We created a `FlowPilot` instance with an in-memory SQLite database
2. Registered a workflow called `"hello"` with two steps
3. Ran the workflow — each step executed in order
4. The execution was recorded with timing and status for each step

## Using the CLI

FlowPilot comes with a CLI for running workflows and inspecting history:

```bash
# Run a workflow file
bun run flowpilot run ./hello.ts

# View execution history
bun run flowpilot history

# Filter by workflow
bun run flowpilot history --workflow hello --limit 5
```

## Adding AI

To use LLMs in your workflows, configure an AI provider:

```typescript
const fp = new FlowPilot({
  ai: {
    provider: "anthropic",  // or "openai"
    // Uses ANTHROPIC_API_KEY env var by default
  },
});

fp.workflow("summarize", async ({ step, input }) => {
  const content = await step("fetch", async () => {
    const res = await fetch(input.url);
    return res.text();
  });

  return step("summarize", async ({ ai }) => {
    return ai.generate(`Summarize this in 3 bullet points:\n\n${content}`);
  });
});

await fp.run("summarize", { url: "https://example.com" });
```

## Next steps

- [Workflows](/guide/workflows) — learn the workflow API in depth
- [Steps](/guide/steps) — retry, timeout, and step composition
- [AI Integration](/guide/ai-integration) — configure LLM providers
- [Examples](/examples/overview) — real-world workflow patterns
