import { createAIClient } from "./ai.ts";
import { createLogger } from "./logger.ts";
import { resolveRetryConfig, withRetry } from "./retry.ts";
import { Store } from "./store.ts";
import type {
	AIClient,
	ExecutionId,
	ExecutionRecord,
	ExecutionStatus,
	FlowPilotConfig,
	Logger,
	ParallelStepDef,
	ScheduleConfig,
	StepConfig,
	StepContext,
	StepResult,
	StepStatus,
	WorkflowContext,
	WorkflowDefinition,
	WorkflowHooks,
} from "./types.ts";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class FlowPilot {
	private workflows = new Map<string, WorkflowDefinition>();
	private config: FlowPilotConfig;
	private store: Store;
	private logger: Logger;
	private aiClient: AIClient;
	private schedules = new Map<
		string,
		{ config: ScheduleConfig; timer: ReturnType<typeof setInterval> | null }
	>();
	private hooks: WorkflowHooks;

	constructor(config: FlowPilotConfig = {}) {
		this.config = config;
		this.logger = createLogger("flowpilot", config.logLevel ?? "info");
		this.store = new Store(config.dbPath ?? "./flowpilot.db");
		this.aiClient = createAIClient(config.ai);
		this.hooks = config.hooks ?? {};
	}

	/** Register a workflow definition */
	workflow<TInput = unknown, TOutput = unknown>(
		id: string,
		fn: (ctx: WorkflowContext<TInput>) => Promise<TOutput>,
	): WorkflowDefinition<TInput, TOutput> {
		if (this.workflows.has(id)) {
			throw new Error(`Workflow "${id}" is already registered`);
		}
		const def: WorkflowDefinition<TInput, TOutput> = { id, fn };
		this.workflows.set(id, def as unknown as WorkflowDefinition<unknown, unknown>);
		return def;
	}

	/** Execute a workflow by ID */
	async run<TInput = unknown, TOutput = unknown>(
		workflowId: string,
		input?: TInput,
	): Promise<ExecutionRecord> {
		const def = this.workflows.get(workflowId);
		if (!def) {
			throw new Error(`Workflow "${workflowId}" not found. Did you forget to register it?`);
		}

		const executionId: ExecutionId = generateId();
		const steps: StepResult[] = [];
		const startedAt = new Date().toISOString();
		let status: ExecutionStatus = "running";
		let output: unknown;
		let error: string | undefined;

		this.logger.info(`Starting workflow "${workflowId}"`, { executionId });

		const stepLog = createLogger(`${workflowId}/${executionId}`, this.config.logLevel ?? "info");

		const ctx: WorkflowContext<TInput> = {
			input: input as TInput,
			ai: this.aiClient,
			log: stepLog,
			executionId,
			step: async <T>(
				stepId: string,
				fn: (ctx: StepContext) => T | Promise<T>,
				config?: StepConfig,
			): Promise<T> => {
				return this.executeStep(stepId, fn, config, steps, executionId, stepLog);
			},
			parallel: async <T extends readonly unknown[]>(
				...stepDefs: { [K in keyof T]: ParallelStepDef<T[K]> }
			): Promise<T> => {
				stepLog.info(`Running ${stepDefs.length} steps in parallel`);
				const promises = stepDefs.map((def) =>
					this.executeStep(def.id, def.fn, def.config, steps, executionId, stepLog),
				);
				const results = await Promise.all(promises);
				return results as unknown as T;
			},
		};

		const start = performance.now();

		try {
			output = await (def.fn as (ctx: WorkflowContext<TInput>) => Promise<TOutput>)(ctx);
			status = "completed";
			this.logger.info(`Workflow "${workflowId}" completed`, { executionId });
		} catch (err) {
			status = "failed";
			error = err instanceof Error ? err.message : String(err);
			this.logger.error(`Workflow "${workflowId}" failed: ${error}`, {
				executionId,
			});
		}

		const durationMs = Math.round(performance.now() - start);
		const completedAt = new Date().toISOString();

		const record: ExecutionRecord = {
			id: executionId,
			workflowId,
			status,
			input,
			output,
			error,
			steps,
			startedAt,
			completedAt,
			durationMs,
		};

		this.store.saveExecution(record);

		// Fire lifecycle hooks
		try {
			if (status === "completed" && this.hooks.onSuccess) {
				await this.hooks.onSuccess(record);
			}
			if (status === "failed" && this.hooks.onFailure) {
				await this.hooks.onFailure(record);
			}
			if (this.hooks.onComplete) {
				await this.hooks.onComplete(record);
			}
		} catch (hookErr) {
			this.logger.error("Hook error", {
				error: hookErr instanceof Error ? hookErr.message : String(hookErr),
			});
		}

		return record;
	}

	private async executeStep<T>(
		stepId: string,
		fn: (ctx: StepContext) => T | Promise<T>,
		config: StepConfig | undefined,
		steps: StepResult[],
		executionId: ExecutionId,
		log: Logger,
	): Promise<T> {
		const retryConfig = resolveRetryConfig(config?.retry, this.config.defaultRetry);
		const timeout = config?.timeout ?? this.config.defaultTimeout ?? 60_000;

		log.info(`Step "${stepId}" starting`);
		const startedAt = new Date().toISOString();
		const start = performance.now();

		let stepStatus: StepStatus = "running";
		let stepOutput: T | undefined;
		let stepError: string | undefined;
		let attempts = 0;

		const stepCtx: StepContext = {
			ai: this.aiClient,
			executionId,
			log,
		};

		try {
			const { result, attempts: totalAttempts } = await withRetry(
				async () => {
					return withTimeout(() => fn(stepCtx), timeout, stepId);
				},
				retryConfig,
				(attempt, err, delay) => {
					log.warn(
						`Step "${stepId}" attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms`,
					);
				},
			);

			stepOutput = result;
			stepStatus = "completed";
			attempts = totalAttempts;
			log.info(`Step "${stepId}" completed`, { attempts });
		} catch (err) {
			stepStatus = "failed";
			stepError = err instanceof Error ? err.message : String(err);
			attempts = retryConfig.maxAttempts;
			log.error(`Step "${stepId}" failed after ${attempts} attempts: ${stepError}`);
			throw err;
		} finally {
			const durationMs = Math.round(performance.now() - start);
			const result: StepResult<T> = {
				stepId,
				status: stepStatus,
				output: stepOutput,
				error: stepError,
				startedAt,
				completedAt: new Date().toISOString(),
				attempts,
				durationMs,
			};
			steps.push(result as StepResult);
		}

		return stepOutput as T;
	}

	/** Get execution history */
	getExecution(executionId: string): ExecutionRecord | undefined {
		return this.store.getExecution(executionId);
	}

	/** List recent executions for a workflow */
	listExecutions(workflowId?: string, limit = 20): ExecutionRecord[] {
		return this.store.listExecutions(workflowId, limit);
	}

	/** Schedule a workflow to run on a cron expression */
	schedule(workflowId: string, config: ScheduleConfig): void {
		if (!this.workflows.has(workflowId)) {
			throw new Error(`Workflow "${workflowId}" not found. Register it before scheduling.`);
		}
		if (this.schedules.has(workflowId)) {
			throw new Error(`Workflow "${workflowId}" is already scheduled. Unschedule first.`);
		}

		const intervalMs = parseCronToMs(config.cron);
		const enabled = config.enabled !== false;

		this.logger.info(`Scheduling "${workflowId}" every ${intervalMs}ms (cron: ${config.cron})`, {
			enabled,
		});

		const timer = enabled
			? setInterval(async () => {
					this.logger.info(`Scheduled run of "${workflowId}"`);
					try {
						await this.run(workflowId, config.input);
					} catch (err) {
						this.logger.error(`Scheduled "${workflowId}" failed`, {
							error: err instanceof Error ? err.message : String(err),
						});
					}
				}, intervalMs)
			: null;

		this.schedules.set(workflowId, { config, timer });
	}

	/** Remove a scheduled workflow */
	unschedule(workflowId: string): void {
		const entry = this.schedules.get(workflowId);
		if (entry?.timer) {
			clearInterval(entry.timer);
		}
		this.schedules.delete(workflowId);
		this.logger.info(`Unscheduled "${workflowId}"`);
	}

	/** Close the database connection and stop all schedules */
	close(): void {
		for (const [id] of this.schedules) {
			this.unschedule(id);
		}
		this.store.close();
	}
}

/**
 * Parse simple cron expressions to interval milliseconds.
 * Supports: "* / N * * * *" patterns for minutes, and common presets.
 * For full cron support, use a cron library — this covers the 80% case.
 */
function parseCronToMs(cron: string): number {
	const presets: Record<string, number> = {
		"@yearly": 365.25 * 24 * 60 * 60 * 1000,
		"@monthly": 30 * 24 * 60 * 60 * 1000,
		"@weekly": 7 * 24 * 60 * 60 * 1000,
		"@daily": 24 * 60 * 60 * 1000,
		"@hourly": 60 * 60 * 1000,
		"@every_5m": 5 * 60 * 1000,
		"@every_15m": 15 * 60 * 1000,
		"@every_30m": 30 * 60 * 1000,
	};

	if (presets[cron]) return presets[cron];

	// Parse standard 5-field cron: minute hour day month weekday
	const parts = cron.trim().split(/\s+/);
	if (parts.length !== 5) {
		throw new Error(
			`Invalid cron expression: "${cron}". Use 5 fields or a preset (@daily, @hourly, etc.)`,
		);
	}

	const [minute] = parts;

	// */N in minute field = every N minutes
	const everyMinMatch = minute?.match(/^\*\/(\d+)$/);
	if (everyMinMatch) {
		return Number.parseInt(everyMinMatch[1] ?? "1", 10) * 60 * 1000;
	}

	// * * * * * = every minute
	if (parts.every((p) => p === "*")) {
		return 60 * 1000;
	}

	// 0 * * * * = every hour
	if (minute === "0" && parts.slice(1).every((p) => p === "*")) {
		return 60 * 60 * 1000;
	}

	// 0 */N * * * = every N hours
	const everyHourMatch = parts[1]?.match(/^\*\/(\d+)$/);
	if (minute === "0" && everyHourMatch) {
		return Number.parseInt(everyHourMatch[1] ?? "1", 10) * 60 * 60 * 1000;
	}

	throw new Error(
		`Unsupported cron expression: "${cron}". Use */N for intervals, presets (@daily, @hourly), or simple patterns.`,
	);
}

async function withTimeout<T>(
	fn: () => T | Promise<T>,
	timeoutMs: number,
	label: string,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Step "${label}" timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		Promise.resolve(fn())
			.then((result) => {
				clearTimeout(timer);
				resolve(result);
			})
			.catch((err) => {
				clearTimeout(timer);
				reject(err);
			});
	});
}
