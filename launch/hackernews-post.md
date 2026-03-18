# Hacker News Launch

## Show HN Post

**Title**: Show HN: FlowPilot – Bun-native workflow engine for TypeScript with AI integration

**URL**: https://github.com/paperkite-hq/flowpilot

**Comment (posted by submitter):**

FlowPilot is a TypeScript SDK for defining and executing multi-step workflows. You define workflows as typed functions — no YAML, no visual builder, just code.

Core features:

- Steps with automatic retry (exponential backoff) and per-step timeouts
- SQLite persistence via bun:sqlite — every execution is recorded with step-level traces
- First-class AI integration (Anthropic Claude, OpenAI) available in any step
- CLI for running workflows and querying execution history
- Zero npm dependencies

I built this because I kept writing the same retry/timeout/logging boilerplate across different automation scripts. The existing options (Temporal, n8n, Trigger.dev) are great but felt heavy for my use case — I wanted a library, not a platform.

The AI integration is optional but useful — a lot of my workflows involve an LLM call somewhere (categorization, summarization, extraction), and having it built into the step context means I don't need to manage a separate client.

Example:

```typescript
const fp = new FlowPilot({ ai: { provider: "anthropic" } });

fp.workflow("process", async ({ step, input }) => {
  const data = await step("fetch", async () => {
    const res = await fetch(input.url);
    return res.json();
  }, { retry: { maxAttempts: 3 }, timeout: 10000 });

  return step("analyze", async ({ ai }) => {
    return ai.generate(`Analyze: ${JSON.stringify(data)}`);
  });
});
```

SQLite persistence means you can always go back and see exactly what happened in each step — timing, output, retry count. Useful for debugging flaky integrations.

Currently Bun-only (uses bun:sqlite). Docs at https://paperkite-hq.github.io/flowpilot/

Happy to answer questions about the architecture or design decisions.
