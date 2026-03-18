# Scheduled Workflow

Run workflows automatically on a cron schedule with failure alerting.

## Code

<<< @/../examples/scheduled-workflow.ts

## What it demonstrates

- **`fp.schedule()`** — run workflows on cron expressions
- **Multiple schedules** — different workflows at different intervals
- **Event hooks** — `onComplete` logs every execution
- **Presets** — `@daily` as a convenient shorthand

## Running it

```bash
bun run examples/scheduled-workflow.ts
```

The demo runs for 10 seconds then exits. In production, you'd keep the process running.

## Key concepts

### Cron presets

For common intervals, use named presets instead of cron syntax:

```typescript
fp.schedule("job", { cron: "@hourly" });
fp.schedule("job", { cron: "@daily" });
fp.schedule("job", { cron: "@every_5m" });
```

### Scheduled input

Pass fixed input to every scheduled run:

```typescript
fp.schedule("monitor", {
  cron: "*/5 * * * *",
  input: { endpoints: ["https://api.example.com/health"] },
});
```

### Cleanup

`fp.close()` stops all active schedules and closes the database.
