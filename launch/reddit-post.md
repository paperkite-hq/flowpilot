# Reddit Launch Posts

## r/typescript — Primary Launch Post

**Title**: I built FlowPilot — a Bun-native workflow engine for TypeScript with built-in AI and SQLite persistence

**Body**:

I've been building a lot of multi-step automations lately (data pipelines, webhook processors, content scrapers) and kept running into the same problems:

- n8n and Temporal are powerful but heavy — I don't need a whole platform, just a library
- Most workflow tools use YAML/JSON configs instead of real code
- Adding LLM calls to steps means bolting on a separate AI SDK
- No easy way to see what happened when a step fails at 3am

So I built **FlowPilot** — a TypeScript SDK where you define workflows as code, not config files. It runs on Bun, uses `bun:sqlite` for zero-dependency persistence, and has first-class AI integration built in.

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot({
  ai: { provider: "anthropic" }
});

fp.workflow("process-order", async ({ step, input }) => {
  const order = await step("validate", async () => {
    // your validation logic
    return validateOrder(input);
  });

  const enriched = await step("enrich", async ({ ai }) => {
    return ai.generate(`Categorize this order: ${JSON.stringify(order)}`);
  }, { retry: { maxAttempts: 3 } });

  await step("save", async () => {
    await db.insert(enriched);
  });

  return enriched;
});
```

**What you get:**
- Steps with automatic retry (exponential backoff) and per-step timeouts
- Every execution persisted to SQLite — full step-by-step traces
- AI integration for Anthropic + OpenAI available in any step
- CLI for running workflows and querying history
- Docker support for one-liner execution
- Zero npm dependencies

**What it's NOT:** It's not a visual workflow builder (yet), and it's not trying to replace Temporal for distributed systems. It's for the "I have 5-20 steps that need to run reliably and I want to see what happened" use case.

GitHub: https://github.com/paperkite-hq/flowpilot
Docs: https://paperkite-hq.github.io/flowpilot/

Would love feedback — especially on the API design. What would make this useful for your workflows?

---

## r/bun — Bun-focused Post

**Title**: FlowPilot — workflow engine built specifically for Bun (bun:sqlite persistence, zero npm deps)

**Body**:

Built a workflow engine that's designed from the ground up for Bun:

- Uses `bun:sqlite` for execution persistence — no external DB needed
- Zero npm dependencies — just Bun builtins
- TypeScript-first API (define workflows as code, not YAML)
- Built-in AI integration (Claude + OpenAI) for LLM-powered steps
- Configurable retry with exponential backoff

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot();

fp.workflow("etl", async ({ step, input }) => {
  const raw = await step("extract", async () => {
    return fetch(input.source).then(r => r.json());
  });

  const clean = await step("transform", async () => {
    return raw.filter(r => r.valid).map(normalize);
  }, { retry: { maxAttempts: 3 } });

  await step("load", async () => {
    await db.insertMany(clean);
  });

  return { processed: clean.length };
});
```

Every execution is automatically persisted to SQLite with step-level traces, so you can always query what happened. Also includes a CLI (`flowpilot run` / `flowpilot history`).

GitHub: https://github.com/paperkite-hq/flowpilot

Curious if anyone else has been using `bun:sqlite` for persistence in production? It's been rock solid for us.

---

## r/selfhosted — Self-hosted Angle

**Title**: FlowPilot — self-hosted workflow automation engine (TypeScript, SQLite, Docker)

**Body**:

If you're running automations on your own hardware and don't want to spin up a whole n8n/Airflow instance, I built FlowPilot — a lightweight workflow engine that runs as a single process with SQLite storage.

**Quick start with Docker:**
```bash
docker run --rm -v $(pwd):/app -w /app oven/bun:1 bun run flowpilot run ./my-workflow.ts
```

You define workflows in TypeScript, and every execution is persisted to a local SQLite database with full step traces. Built-in retry with exponential backoff, per-step timeouts, and optional AI integration.

No cloud account needed, no external database, no containers to orchestrate. Just a single binary and a `.db` file.

GitHub: https://github.com/paperkite-hq/flowpilot
License: AGPL-3.0

---

## r/node — Node/TS Ecosystem Post

**Title**: FlowPilot: define multi-step workflows in TypeScript with built-in retry, persistence, and AI

**Body**:

Released FlowPilot — a TypeScript workflow SDK focused on reliability for multi-step processes. The core idea: define workflows as typed functions, get automatic retry, timeout, persistence, and observability for free.

Built for Bun but the patterns are familiar to any TS developer. Each step is a function with configurable retry (exponential backoff), and every execution is recorded to SQLite with step-level timing and status.

Also has first-class AI integration if your workflows need LLM calls — Anthropic and OpenAI supported out of the box.

Repo: https://github.com/paperkite-hq/flowpilot
Docs: https://paperkite-hq.github.io/flowpilot/
