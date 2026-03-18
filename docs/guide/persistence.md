# Persistence

FlowPilot automatically persists every workflow execution to SQLite using `bun:sqlite`. No setup required.

## How it works

When you create a `FlowPilot` instance, it opens (or creates) a SQLite database and creates the necessary tables. Every call to `fp.run()` records the full execution including step-level details.

```typescript
const fp = new FlowPilot({
  dbPath: "./my-workflows.db", // default: ./flowpilot.db
});
```

## Database options

| Option | Description |
|---|---|
| `"./flowpilot.db"` | Default — persistent file in current directory |
| `"/path/to/db.sqlite"` | Any absolute or relative path |
| `":memory:"` | In-memory database (lost on exit — great for tests) |

## Querying executions

### Programmatic API

```typescript
// Get a specific execution by ID
const exec = fp.getExecution("1710456789000-abc12345");

// List recent executions (default: last 20)
const recent = fp.listExecutions();

// Filter by workflow name
const deploys = fp.listExecutions("deploy", 10);
```

### CLI

```bash
# All recent executions
bun run flowpilot history

# Filter by workflow
bun run flowpilot history --workflow deploy --limit 5

# Use a different database
bun run flowpilot history --db /path/to/db.sqlite
```

## Schema

FlowPilot uses a single `executions` table with JSON-serialized fields for steps, input, and output:

```sql
CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL,
  input TEXT,
  output TEXT,
  error TEXT,
  steps TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER
);
```

Indexed on `workflow_id`, `status`, and `started_at` for fast queries.

## WAL mode

The database uses [WAL (Write-Ahead Logging)](https://www.sqlite.org/wal.html) mode for better concurrent read/write performance. This is set automatically when the database is opened.

## Cleanup

Close the database connection when your application is done:

```typescript
fp.close();
```
