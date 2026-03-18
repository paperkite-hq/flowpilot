import { describe, expect, it } from "bun:test";
import { FlowPilot } from "./engine.ts";

describe("FlowPilot", () => {
	it("runs a simple workflow", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });

		fp.workflow("simple", async ({ step }) => {
			const a = await step("add", async () => 1 + 1);
			const b = await step("multiply", async () => a * 3);
			return b;
		});

		const result = await fp.run("simple");
		expect(result.status).toBe("completed");
		expect(result.output).toBe(6);
		expect(result.steps).toHaveLength(2);
		expect(result.steps[0]?.status).toBe("completed");
		expect(result.steps[1]?.status).toBe("completed");
		fp.close();
	});

	it("passes input to workflow", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });

		fp.workflow<{ name: string }, string>("greet", async ({ step, input }) => {
			return step("greet", async () => `Hello, ${input.name}!`);
		});

		const result = await fp.run("greet", { name: "World" });
		expect(result.status).toBe("completed");
		expect(result.output).toBe("Hello, World!");
		fp.close();
	});

	it("handles step failures", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:", logLevel: "error" });

		fp.workflow("failing", async ({ step }) => {
			await step("boom", async () => {
				throw new Error("Something went wrong");
			});
		});

		const result = await fp.run("failing");
		expect(result.status).toBe("failed");
		expect(result.error).toBe("Something went wrong");
		expect(result.steps[0]?.status).toBe("failed");
		fp.close();
	});

	it("retries failing steps", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:", logLevel: "error" });
		let attempts = 0;

		fp.workflow("retry", async ({ step }) => {
			return step(
				"flaky",
				async () => {
					attempts++;
					if (attempts < 3) throw new Error("Not yet");
					return "ok";
				},
				{ retry: { maxAttempts: 5, initialDelay: 10 } },
			);
		});

		const result = await fp.run("retry");
		expect(result.status).toBe("completed");
		expect(result.output).toBe("ok");
		expect(result.steps[0]?.attempts).toBe(3);
		fp.close();
	});

	it("times out slow steps", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:", logLevel: "error" });

		fp.workflow("slow", async ({ step }) => {
			return step(
				"too-slow",
				async () => {
					await new Promise((r) => setTimeout(r, 5000));
					return "never";
				},
				{ timeout: 50 },
			);
		});

		const result = await fp.run("slow");
		expect(result.status).toBe("failed");
		expect(result.error).toContain("timed out");
		fp.close();
	});

	it("persists and retrieves executions", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });

		fp.workflow("persist-test", async ({ step }) => {
			return step("compute", async () => 42);
		});

		const result = await fp.run("persist-test");
		const retrieved = fp.getExecution(result.id);

		expect(retrieved).toBeDefined();
		expect(retrieved?.workflowId).toBe("persist-test");
		expect(retrieved?.status).toBe("completed");
		expect(retrieved?.output).toBe(42);
		fp.close();
	});

	it("lists executions", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });

		fp.workflow("list-test", async ({ step }) => {
			return step("noop", async () => "done");
		});

		await fp.run("list-test");
		await fp.run("list-test");
		await fp.run("list-test");

		const all = fp.listExecutions("list-test");
		expect(all).toHaveLength(3);
		fp.close();
	});

	it("rejects duplicate workflow IDs", () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });
		fp.workflow("dupe", async () => {});
		expect(() => fp.workflow("dupe", async () => {})).toThrow(
			'Workflow "dupe" is already registered',
		);
		fp.close();
	});

	it("rejects unknown workflow IDs", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });
		await expect(fp.run("nonexistent")).rejects.toThrow('Workflow "nonexistent" not found');
		fp.close();
	});

	it("records step duration", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });

		fp.workflow("timed", async ({ step }) => {
			return step("wait", async () => {
				await new Promise((r) => setTimeout(r, 20));
				return "done";
			});
		});

		const result = await fp.run("timed");
		expect(result.steps[0]?.durationMs).toBeGreaterThanOrEqual(15);
		expect(result.durationMs).toBeGreaterThanOrEqual(15);
		fp.close();
	});
});
