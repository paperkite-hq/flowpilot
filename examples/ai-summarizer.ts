/**
 * AI Summarizer — workflow that fetches a URL and summarizes it with an LLM.
 *
 * Requires ANTHROPIC_API_KEY or OPENAI_API_KEY in environment.
 *
 * Run: ANTHROPIC_API_KEY=sk-... bun run packages/flowpilot/examples/ai-summarizer.ts
 */
import { FlowPilot } from "../src/index.ts";

const fp = new FlowPilot({
	dbPath: ":memory:",
	ai: {
		provider: "anthropic",
		// Uses ANTHROPIC_API_KEY from env by default
	},
});

fp.workflow<{ url: string }, string>("summarize-url", async ({ step, input }) => {
	const content = await step("fetch", async ({ log }) => {
		log.info(`Fetching ${input.url}`);
		const res = await fetch(input.url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const text = await res.text();
		// Take first 2000 chars to stay within token limits
		return text.slice(0, 2000);
	});

	const summary = await step(
		"summarize",
		async ({ ai, log }) => {
			log.info("Generating summary...");
			return ai.generate(`Summarize the following content in 2-3 sentences:\n\n${content}`, {
				maxTokens: 256,
			});
		},
		{ retry: { maxAttempts: 3 } },
	);

	await step("output", async ({ log }) => {
		log.info(`Summary: ${summary}`);
	});

	return summary;
});

const url = process.argv[2] ?? "https://example.com";
const result = await fp.run("summarize-url", { url });

if (result.status === "completed") {
	console.log("\n--- Summary ---");
	console.log(result.output);
} else {
	console.error("Failed:", result.error);
}

fp.close();
