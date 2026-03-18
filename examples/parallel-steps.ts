/**
 * Parallel Steps Example
 *
 * Demonstrates running multiple steps concurrently using ctx.parallel().
 * Steps execute simultaneously and results are collected when all complete.
 */
import { FlowPilot } from "../src/index.ts";

const fp = new FlowPilot({
	dbPath: ":memory:",
	hooks: {
		onSuccess: (record) => {
			console.log(`\n✓ Workflow completed in ${record.durationMs}ms`);
			console.log(`  Steps: ${record.steps.map((s) => `${s.stepId}(${s.durationMs}ms)`).join(", ")}`);
		},
	},
});

fp.workflow<{ urls: string[] }>("parallel-fetch", async ({ step, parallel, input, log }) => {
	// Step 1: Validate inputs (sequential)
	const urls = await step("validate", async () => {
		if (!input.urls?.length) throw new Error("No URLs provided");
		log.info(`Fetching ${input.urls.length} URLs in parallel`);
		return input.urls;
	});

	// Step 2: Fetch all URLs in parallel
	const results = await parallel(
		...urls.map((url, i) => ({
			id: `fetch-${i}`,
			fn: async () => {
				const start = performance.now();
				const res = await fetch(url);
				const text = await res.text();
				const duration = Math.round(performance.now() - start);
				return {
					url,
					status: res.status,
					length: text.length,
					duration,
				};
			},
			config: { timeout: 10_000, retry: { maxAttempts: 2, initialDelay: 500 } },
		})),
	);

	// Step 3: Summarize (sequential)
	return step("summarize", async () => {
		const total = results.reduce((sum, r) => sum + (r as { length: number }).length, 0);
		return {
			fetched: results.length,
			totalBytes: total,
			results,
		};
	});
});

const result = await fp.run("parallel-fetch", {
	urls: [
		"https://httpbin.org/get",
		"https://httpbin.org/ip",
		"https://httpbin.org/user-agent",
	],
});

console.log("\nResults:", JSON.stringify(result.output, null, 2));
fp.close();
