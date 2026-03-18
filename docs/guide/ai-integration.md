# AI Integration

FlowPilot has first-class support for LLM calls inside workflow steps. Configure once, use in any step.

## Configuration

### Anthropic Claude

```typescript
const fp = new FlowPilot({
  ai: {
    provider: "anthropic",
    // Uses ANTHROPIC_API_KEY env var by default
    // Or pass explicitly:
    // apiKey: "sk-ant-...",
    // model: "claude-sonnet-4-20250514",
  },
});
```

### OpenAI

```typescript
const fp = new FlowPilot({
  ai: {
    provider: "openai",
    // Uses OPENAI_API_KEY env var by default
    // model: "gpt-4o",
  },
});
```

## Using AI in steps

The AI client is available in the step context:

```typescript
fp.workflow("classify", async ({ step }) => {
  const category = await step("classify", async ({ ai }) => {
    return ai.generate("Classify this text as positive, negative, or neutral: ...");
  });

  return category;
});
```

## Generation options

```typescript
await step("generate", async ({ ai }) => {
  return ai.generate("Write a haiku about TypeScript", {
    model: "claude-sonnet-4-20250514", // override model for this call
    maxTokens: 100,
    temperature: 0.7,
    system: "You are a poet who writes only about programming.",
  });
});
```

## AI with retry

Combine AI calls with retry for resilience against rate limits:

```typescript
await step("summarize", async ({ ai }) => {
  return ai.generate("Summarize: ...", { maxTokens: 256 });
}, {
  retry: {
    maxAttempts: 3,
    initialDelay: 2000, // wait 2s before retry (rate limit recovery)
  },
});
```

## Multiple providers

You can use different providers in the same workflow by creating separate FlowPilot instances or overriding the model per step:

```typescript
const fp = new FlowPilot({
  ai: { provider: "anthropic" },
});

fp.workflow("multi-model", async ({ step }) => {
  // Uses the default Anthropic provider
  const draft = await step("draft", async ({ ai }) => {
    return ai.generate("Write a product description for...");
  });

  // Override to a specific model
  const refined = await step("refine", async ({ ai }) => {
    return ai.generate(`Improve this: ${draft}`, {
      model: "claude-sonnet-4-20250514",
      temperature: 0.3,
    });
  });

  return refined;
});
```

## The AIClient interface

```typescript
interface AIClient {
  generate(prompt: string, options?: AIGenerateOptions): Promise<string>;
}

interface AIGenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}
```
