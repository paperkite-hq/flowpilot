# CLI

FlowPilot includes a command-line interface for running workflows and inspecting execution history.

## Commands

### `flowpilot run`

Execute a workflow from a TypeScript file:

```bash
bun run flowpilot run <file.ts> [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--input <json>` | JSON input to pass to the workflow |
| `--db <path>` | SQLite database path (default: `./flowpilot.db`) |

**Examples:**

```bash
# Run a workflow
bun run flowpilot run ./deploy.ts

# Pass JSON input
bun run flowpilot run ./summarize.ts --input '{"url": "https://example.com"}'
```

**Workflow file format:**

Your workflow file should export one of:

1. A default `FlowPilot` instance + a `workflowId` string:

```typescript
import { FlowPilot } from "flowpilot";

const fp = new FlowPilot();

fp.workflow("my-workflow", async ({ step }) => {
  return step("hello", async () => "Hello!");
});

export default fp;
export const workflowId = "my-workflow";
```

2. A `run()` function:

```typescript
import { FlowPilot } from "flowpilot";

export async function run(input: unknown) {
  const fp = new FlowPilot({ dbPath: ":memory:" });
  fp.workflow("inline", async ({ step }) => {
    return step("greet", async () => `Hello, ${(input as any).name}!`);
  });
  const result = await fp.run("inline", input);
  fp.close();
  return result;
}
```

### `flowpilot history`

View past workflow executions:

```bash
bun run flowpilot history [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--workflow <id>` | Filter by workflow name |
| `--limit <n>` | Number of entries to show (default: 20) |
| `--db <path>` | SQLite database path |

**Examples:**

```bash
# Show all recent executions
bun run flowpilot history

# Show last 5 deploys
bun run flowpilot history --workflow deploy --limit 5
```

**Output:**

```
ID                     Workflow                 Status       Duration   Steps
--------------------------------------------------------------------------------
1710456789000-abc      deploy                   completed    1234ms     ✓✓✓
1710456780000-def      summarize                failed       567ms      ✓✗
```
