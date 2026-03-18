/**
 * Retry demo — shows exponential backoff on flaky steps.
 *
 * Run: bun run packages/flowpilot/examples/retry-demo.ts
 */
import { FlowPilot } from "../src/index.ts";

const fp = new FlowPilot({ dbPath: ":memory:", logLevel: "debug" });

let attempts = 0;

fp.workflow("retry-demo", async ({ step }) => {
	const value = await step(
		"flaky-step",
		async () => {
			attempts++;
			if (attempts < 3) {
				throw new Error(`Attempt ${attempts} failed (simulated)`);
			}
			return `Succeeded on attempt ${attempts}`;
		},
		{
			retry: { maxAttempts: 5, initialDelay: 100 },
		},
	);

	await step("report", async ({ log }) => {
		log.info(`Final result: ${value}`);
	});

	return value;
});

const result = await fp.run("retry-demo");
console.log("\nOutcome:", result.status);
console.log("Output:", result.output);
console.log(
	"Steps:",
	result.steps.map((s) => `${s.stepId}: ${s.status} (${s.attempts} attempts)`),
);
fp.close();
