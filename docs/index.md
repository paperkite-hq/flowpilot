---
layout: home
hero:
  name: FlowPilot
  text: Bun-native AI workflow engine
  tagline: Define, execute, and observe multi-step workflows with built-in LLM integration, retry logic, and persistence.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/paperkite-hq/flowpilot

features:
  - title: TypeScript-first
    details: Define workflows as code with full type safety — no YAML, no JSON config files.
  - title: Bun-native
    details: Built for Bun's runtime with zero npm dependencies. Uses bun:sqlite for persistence.
  - title: AI-native
    details: First-class LLM integration (Anthropic Claude, OpenAI) available in every step.
  - title: Reliable
    details: Automatic retry with exponential backoff and per-step timeouts out of the box.
  - title: Observable
    details: Every execution is persisted to SQLite with step-level traces, queryable via API or CLI.
  - title: Lightweight
    details: Zero npm dependencies. Runs anywhere Bun runs — local dev, Docker, or production.
---
