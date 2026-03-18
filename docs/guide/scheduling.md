# Scheduling

FlowPilot can run workflows on a schedule using cron expressions.

## Basic scheduling

```typescript
const fp = new FlowPilot();

fp.workflow("cleanup", async ({ step }) => {
  return step("sweep", async () => {
    // clean up old data
    return { cleaned: 42 };
  });
});

// Run every hour
fp.schedule("cleanup", { cron: "0 * * * *" });
```

## Cron expressions

Standard 5-field cron syntax is supported:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sun=0)
│ │ │ │ │
* * * * *
```

Common patterns:

| Expression | Meaning |
|---|---|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |

## Presets

For convenience, named presets are available:

| Preset | Interval |
|---|---|
| `@hourly` | Every hour |
| `@daily` | Every 24 hours |
| `@weekly` | Every 7 days |
| `@monthly` | Every 30 days |
| `@yearly` | Every 365 days |
| `@every_5m` | Every 5 minutes |
| `@every_15m` | Every 15 minutes |
| `@every_30m` | Every 30 minutes |

```typescript
fp.schedule("health-check", { cron: "@every_5m" });
fp.schedule("daily-report", { cron: "@daily" });
```

## Passing input

Scheduled workflows can receive fixed input on each run:

```typescript
fp.schedule("fetch-prices", {
  cron: "*/30 * * * *",
  input: { symbols: ["AAPL", "GOOGL", "MSFT"] },
});
```

## Disabling schedules

Create a schedule in a disabled state:

```typescript
fp.schedule("expensive-task", {
  cron: "@hourly",
  enabled: false, // won't run until re-enabled
});
```

## Unscheduling

Remove a schedule at any time:

```typescript
fp.unschedule("cleanup");
```

## Combining with hooks

Use event hooks to react to scheduled workflow results:

```typescript
const fp = new FlowPilot({
  hooks: {
    onFailure: async (record) => {
      await sendAlert(`${record.workflowId} failed: ${record.error}`);
    },
    onComplete: async (record) => {
      metrics.record(record.workflowId, record.durationMs);
    },
  },
});

fp.workflow("health-check", async ({ step }) => {
  return step("ping", async () => {
    const res = await fetch("https://api.example.com/health");
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return { status: "healthy" };
  });
});

fp.schedule("health-check", { cron: "@every_5m" });
```

## Cleanup

`fp.close()` automatically stops all active schedules and closes the database:

```typescript
// Stops all schedules + closes DB
fp.close();
```
