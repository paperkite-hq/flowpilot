#!/usr/bin/env bun

import { resolve } from "node:path";

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
	printHelp();
	process.exit(0);
}

if (command === "run") {
	await runWorkflow(args.slice(1));
} else if (command === "history") {
	await showHistory(args.slice(1));
} else {
	console.error(`Unknown command: ${command}`);
	printHelp();
	process.exit(1);
}

function printHelp() {
	console.log(`
flowpilot - Bun-native AI workflow engine

Usage:
  flowpilot run <workflow.ts> [--input <json>] [--db <path>]
  flowpilot history [--workflow <id>] [--limit <n>] [--db <path>]

Commands:
  run       Execute a workflow file
  history   Show execution history

Options:
  --input   JSON input to pass to the workflow (default: {})
  --db      SQLite database path (default: ./flowpilot.db)
  --workflow Filter history by workflow ID
  --limit   Number of history entries (default: 20)
  --help    Show this help message
`);
}

async function runWorkflow(args: string[]) {
	const filePath = args[0];
	if (!filePath) {
		console.error("Error: workflow file path required");
		console.error("Usage: flowpilot run <workflow.ts>");
		process.exit(1);
	}

	let input: unknown = {};

	for (let i = 1; i < args.length; i++) {
		if (args[i] === "--input" && args[i + 1]) {
			try {
				input = JSON.parse(args[i + 1] as string);
			} catch {
				console.error(`Error: invalid JSON input: ${args[i + 1]}`);
				process.exit(1);
			}
			i++;
		}
	}

	const absPath = resolve(filePath);

	try {
		// Import the workflow file — it should export a default FlowPilot instance
		// or call fp.run() itself
		const mod = await import(absPath);

		if (mod.default && typeof mod.default === "object" && "run" in mod.default) {
			// The file exports a FlowPilot instance with a registered workflow
			const fp = mod.default;

			// Find the first registered workflow
			if (mod.workflowId) {
				const result = await fp.run(mod.workflowId, input);
				printResult(result);
			} else {
				console.error(
					"Error: workflow file must export `workflowId` (the workflow ID string) and `default` (the FlowPilot instance)",
				);
				process.exit(1);
			}
		} else if (mod.run && typeof mod.run === "function") {
			// The file exports a run() function
			const result = await mod.run(input);
			printResult(result);
		} else {
			console.error(
				"Error: workflow file must export either:\n" +
					"  - `default` (FlowPilot instance) + `workflowId` (string)\n" +
					"  - `run(input)` function",
			);
			process.exit(1);
		}
	} catch (err) {
		console.error(`Error running workflow: ${err instanceof Error ? err.message : err}`);
		process.exit(1);
	}
}

async function showHistory(args: string[]) {
	let workflowId: string | undefined;
	let limit = 20;
	let dbPath = "./flowpilot.db";

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--workflow" && args[i + 1]) {
			workflowId = args[i + 1];
			i++;
		} else if (args[i] === "--limit" && args[i + 1]) {
			limit = Number.parseInt(args[i + 1] as string, 10);
			i++;
		} else if (args[i] === "--db" && args[i + 1]) {
			dbPath = args[i + 1] as string;
			i++;
		}
	}

	const { Store } = await import("../src/store.ts");
	const store = new Store(dbPath);
	const executions = store.listExecutions(workflowId, limit);
	store.close();

	if (executions.length === 0) {
		console.log("No executions found.");
		return;
	}

	console.log(
		`\n${"ID".padEnd(22)} ${"Workflow".padEnd(24)} ${"Status".padEnd(12)} ${"Duration".padEnd(10)} Steps`,
	);
	console.log("-".repeat(80));

	for (const exec of executions) {
		const duration = exec.durationMs ? `${exec.durationMs}ms` : "-";
		const stepSummary = exec.steps.map((s) => (s.status === "completed" ? "✓" : "✗")).join("");
		console.log(
			`${exec.id.padEnd(22)} ${exec.workflowId.padEnd(24)} ${exec.status.padEnd(12)} ${duration.padEnd(10)} ${stepSummary}`,
		);
	}
	console.log();
}

function printResult(result: {
	status: string;
	durationMs?: number;
	steps: Array<{ stepId: string; status: string; durationMs: number }>;
	error?: string;
}) {
	console.log(`\nExecution ${result.status === "completed" ? "succeeded" : "failed"}`);
	if (result.durationMs) {
		console.log(`Duration: ${result.durationMs}ms`);
	}
	console.log(`Steps:`);
	for (const step of result.steps) {
		const icon = step.status === "completed" ? "✓" : "✗";
		console.log(`  ${icon} ${step.stepId} (${step.durationMs}ms)`);
	}
	if (result.error) {
		console.log(`\nError: ${result.error}`);
	}
	console.log();
}
