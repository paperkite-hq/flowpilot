# Hello World

The simplest possible FlowPilot workflow.

<<< ../../examples/hello-world.ts

## What it does

1. Registers a workflow called `"hello"` with two steps
2. The `"greet"` step returns a greeting string
3. The `"print"` step logs the greeting
4. The workflow returns the greeting as its output

## Running it

```bash
bun run examples/hello-world.ts
```
