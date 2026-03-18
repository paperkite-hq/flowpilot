# What is FlowPilot?

FlowPilot is a **Bun-native workflow engine** for TypeScript. It lets you define multi-step workflows as code, with built-in support for:

- **LLM integration** — call Anthropic Claude or OpenAI from any step
- **Retry with exponential backoff** — handle flaky APIs gracefully
- **Per-step timeouts** — never hang on a stuck step
- **SQLite persistence** — every execution is recorded with step-level traces
- **CLI** — run workflows and inspect history from the terminal

## Why FlowPilot?

Most workflow engines force you into YAML, JSON, or a visual UI. FlowPilot takes a different approach: **workflows are TypeScript functions**. You get full type safety, IDE autocomplete, and the ability to use any npm package inside your steps.

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot();

fp.workflow("deploy", async ({ step, log }) => {
  await step("build", async () => {
    log.info("Building project...");
    // any TypeScript code here
  });

  await step("test", async () => {
    log.info("Running tests...");
  });

  await step("deploy", async () => {
    log.info("Deploying to production...");
  });
});
```

## How it compares

| Feature | FlowPilot | n8n | Temporal | Trigger.dev |
|---|---|---|---|---|
| Language | TypeScript | JSON/UI | Go/Java/TS | TypeScript |
| Runtime | Bun | Node.js | Self-hosted | Cloud/Self |
| AI built-in | Yes | Via nodes | No | No |
| Dependencies | 0 | Many | Heavy | Medium |
| Persistence | SQLite | Postgres | Cassandra | Postgres |
| Learning curve | Low | Medium | High | Medium |

## Design principles

1. **Code over config** — workflows are functions, not config files
2. **Zero dependencies** — only uses Bun built-ins (`bun:sqlite`, `bun:test`)
3. **AI-first** — LLM calls are a first-class primitive, not an afterthought
4. **Observable by default** — every execution is persisted automatically
5. **Fail gracefully** — retry and timeout are built into the step primitive
