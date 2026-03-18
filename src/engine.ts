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
	StepConfig,
	StepContext,
	StepResult,
	StepStatus,
	WorkflowContext,
	WorkflowDefinition,
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

	constructor(config: FlowPilotConfig = {}) {
		this.config = config;
		this.logger = createLogger("flowpilot", config.logLevel ?? "info");
		this.store = new Store(config.dbPath ?? "./flowpilot.db");
		this.aiClient = createAIClient(config.ai);
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

	/** Close the database connection */
	close(): void {
		this.store.close();
	}
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
