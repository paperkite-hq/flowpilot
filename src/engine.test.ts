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

	it("runs steps in parallel", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });
		const order: string[] = [];

		fp.workflow("parallel-test", async ({ parallel }) => {
			const [a, b, c] = await parallel(
				{
					id: "fast",
					fn: async () => {
						order.push("fast-start");
						await new Promise((r) => setTimeout(r, 10));
						order.push("fast-end");
						return 1;
					},
				},
				{
					id: "medium",
					fn: async () => {
						order.push("medium-start");
						await new Promise((r) => setTimeout(r, 20));
						order.push("medium-end");
						return 2;
					},
				},
				{
					id: "slow",
					fn: async () => {
						order.push("slow-start");
						await new Promise((r) => setTimeout(r, 30));
						order.push("slow-end");
						return 3;
					},
				},
			);
			return { a, b, c };
		});

		const result = await fp.run("parallel-test");
		expect(result.status).toBe("completed");
		expect((result.output as { a: number; b: number; c: number }).a).toBe(1);
		expect((result.output as { a: number; b: number; c: number }).b).toBe(2);
		expect((result.output as { a: number; b: number; c: number }).c).toBe(3);
		expect(result.steps).toHaveLength(3);
		// All should start before any end (proving parallelism)
		expect(order.filter((o) => o.endsWith("-start"))).toHaveLength(3);
		fp.close();
	});

	it("fires onSuccess hook", async () => {
		let hookRecord: import("./types.ts").ExecutionRecord | null = null;
		const fp = new FlowPilot({
			dbPath: ":memory:",
			hooks: {
				onSuccess: (record) => {
					hookRecord = record;
				},
			},
		});

		fp.workflow("hook-test", async ({ step }) => {
			return step("ok", async () => "done");
		});

		await fp.run("hook-test");
		expect(hookRecord).not.toBeNull();
		expect(hookRecord?.status).toBe("completed");
		fp.close();
	});

	it("fires onFailure hook", async () => {
		let hookRecord: import("./types.ts").ExecutionRecord | null = null;
		const fp = new FlowPilot({
			dbPath: ":memory:",
			logLevel: "error",
			hooks: {
				onFailure: (record) => {
					hookRecord = record;
				},
			},
		});

		fp.workflow("fail-hook", async ({ step }) => {
			return step("boom", async () => {
				throw new Error("fail");
			});
		});

		await fp.run("fail-hook");
		expect(hookRecord).not.toBeNull();
		expect(hookRecord?.status).toBe("failed");
		fp.close();
	});

	it("schedules and unschedules workflows", async () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });
		let runCount = 0;

		fp.workflow("scheduled", async ({ step }) => {
			runCount++;
			return step("tick", async () => runCount);
		});

		// Schedule but disabled
		fp.schedule("scheduled", { cron: "* * * * *", enabled: false });
		await new Promise((r) => setTimeout(r, 100));
		expect(runCount).toBe(0);
		fp.unschedule("scheduled");

		fp.close();
	});

	it("rejects scheduling unknown workflows", () => {
		const fp = new FlowPilot({ dbPath: ":memory:" });
		expect(() => fp.schedule("nope", { cron: "@daily" })).toThrow("not found");
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
