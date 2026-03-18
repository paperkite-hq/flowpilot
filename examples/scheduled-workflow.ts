/**
 * Scheduled Workflow Example
 *
 * Demonstrates running workflows on a cron schedule.
 * Supports cron expressions and presets like @hourly, @daily.
 */
import { FlowPilot } from "../src/index.ts";

const fp = new FlowPilot({
	dbPath: ":memory:",
	hooks: {
		onComplete: (record) => {
			console.log(
				`[${record.completedAt}] ${record.workflowId}: ${record.status} (${record.durationMs}ms)`,
			);
		},
	},
});

// Define a health-check workflow
fp.workflow("health-check", async ({ step, log }) => {
	const status = await step("check-api", async () => {
		const res = await fetch("https://httpbin.org/status/200");
		return { status: res.status, ok: res.ok };
	});

	return step("report", async () => {
		if (!status.ok) {
			log.error("API is DOWN!");
			// In production: send alert via webhook, email, etc.
		}
		return status;
	});
});

// Define a cleanup workflow
fp.workflow("cleanup", async ({ step, log }) => {
	return step("sweep", async () => {
		log.info("Running cleanup...");
		return { cleaned: 0 };
	});
});

// Schedule: health check every 5 minutes, cleanup daily
fp.schedule("health-check", { cron: "*/5 * * * *" });
fp.schedule("cleanup", { cron: "@daily" });

console.log("Schedules active. Press Ctrl+C to stop.");
console.log("  health-check: every 5 minutes");
console.log("  cleanup: daily");

// Run for 10 seconds then stop (for demo purposes)
setTimeout(() => {
	console.log("\nStopping schedules...");
	fp.close();
	process.exit(0);
}, 10_000);
