# AI Summarizer

Fetch a web page and summarize it using an LLM.

<<< ../examples/ai-summarizer.ts

## What it does

1. **Fetch step** — downloads the page at the given URL
2. **Summarize step** — sends the content to Claude for summarization (with retry)
3. Returns the summary string

## Configuration

Set `ANTHROPIC_API_KEY` in your environment, or change the provider to `"openai"` and set `OPENAI_API_KEY`.

## Running it

```bash
ANTHROPIC_API_KEY=sk-ant-... bun run examples/ai-summarizer.ts
```
