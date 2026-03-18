/**
 * Hello World — simplest possible FlowPilot workflow.
 *
 * Run: bun run packages/flowpilot/examples/hello-world.ts
 */
import { FlowPilot } from "../src/index.ts";

const fp = new FlowPilot({ dbPath: ":memory:" });

fp.workflow("hello", async ({ step, log }) => {
	const greeting = await step("greet", async () => {
		return "Hello from FlowPilot!";
	});

	await step("print", async () => {
		log.info(greeting);
	});

	return greeting;
});

const result = await fp.run("hello");
console.log("Result:", result.output);
fp.close();
