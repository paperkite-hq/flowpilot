/**
 * Core types for FlowPilot workflow engine.
 */

/** Unique identifier for a workflow execution */
export type ExecutionId = string;

/** Unique identifier for a workflow definition */
export type WorkflowId = string;

/** Status of a workflow execution */
export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/** Status of a single step execution */
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/** Configuration for retry behavior */
export interface RetryConfig {
	/** Maximum number of attempts (including the first). Default: 1 (no retry) */
	maxAttempts?: number;
	/** Initial delay in ms before first retry. Default: 1000 */
	initialDelay?: number;
	/** Multiplier for exponential backoff. Default: 2 */
	backoffMultiplier?: number;
	/** Maximum delay between retries in ms. Default: 30000 */
	maxDelay?: number;
}

/** Configuration for a single step */
export interface StepConfig {
	/** Retry configuration */
	retry?: RetryConfig;
	/** Timeout in ms for this step. Default: 60000 (1 minute) */
	timeout?: number;
}

/** Record of a completed step execution */
export interface StepResult<T = unknown> {
	stepId: string;
	status: StepStatus;
	output?: T;
	error?: string;
	startedAt: string;
	completedAt?: string;
	attempts: number;
	durationMs: number;
}

/** Record of a workflow execution */
export interface ExecutionRecord {
	id: ExecutionId;
	workflowId: WorkflowId;
	status: ExecutionStatus;
	input?: unknown;
	output?: unknown;
	error?: string;
	steps: StepResult[];
	startedAt: string;
	completedAt?: string;
	durationMs?: number;
}

/** LLM provider configuration */
export interface AIProviderConfig {
	provider: "anthropic" | "openai";
	model?: string;
	apiKey?: string;
	baseUrl?: string;
}

/** Options for AI text generation */
export interface AIGenerateOptions {
	/** Model override for this call */
	model?: string;
	/** Maximum tokens to generate */
	maxTokens?: number;
	/** Temperature (0-1) */
	temperature?: number;
	/** System prompt */
	system?: string;
}

/** The AI helper available inside workflow steps */
export interface AIClient {
	/** Generate text from a prompt */
	generate(prompt: string, options?: AIGenerateOptions): Promise<string>;
}

/** Context passed to step functions */
export interface StepContext {
	/** AI client for LLM calls */
	ai: AIClient;
	/** The workflow execution ID */
	executionId: ExecutionId;
	/** Structured logger */
	log: Logger;
}

/** Context passed to workflow functions */
export interface WorkflowContext<TInput = unknown> {
	/** The input data for this execution */
	input: TInput;
	/** Run a named step */
	step<T>(id: string, fn: (ctx: StepContext) => T | Promise<T>, config?: StepConfig): Promise<T>;
	/** Run multiple steps in parallel */
	parallel<T extends readonly unknown[]>(
		...steps: { [K in keyof T]: ParallelStepDef<T[K]> }
	): Promise<T>;
	/** AI client for LLM calls */
	ai: AIClient;
	/** Structured logger */
	log: Logger;
	/** The workflow execution ID */
	executionId: ExecutionId;
}

/** Definition for a step to run in parallel */
export interface ParallelStepDef<T = unknown> {
	id: string;
	fn: (ctx: StepContext) => T | Promise<T>;
	config?: StepConfig;
}

/** A workflow definition */
export interface WorkflowDefinition<TInput = unknown, TOutput = unknown> {
	id: WorkflowId;
	fn: (ctx: WorkflowContext<TInput>) => Promise<TOutput>;
}

/** Logger interface */
export interface Logger {
	info(message: string, data?: Record<string, unknown>): void;
	warn(message: string, data?: Record<string, unknown>): void;
	error(message: string, data?: Record<string, unknown>): void;
	debug(message: string, data?: Record<string, unknown>): void;
}

/** Event hooks for workflow lifecycle */
export interface WorkflowHooks {
	/** Called after a workflow completes successfully */
	onSuccess?: (record: ExecutionRecord) => void | Promise<void>;
	/** Called after a workflow fails */
	onFailure?: (record: ExecutionRecord) => void | Promise<void>;
	/** Called after every workflow execution (success or failure) */
	onComplete?: (record: ExecutionRecord) => void | Promise<void>;
}

/** Configuration for the FlowPilot engine */
export interface FlowPilotConfig {
	/** SQLite database path. Default: ./flowpilot.db */
	dbPath?: string;
	/** Default AI provider configuration */
	ai?: AIProviderConfig;
	/** Default retry config for all steps */
	defaultRetry?: RetryConfig;
	/** Default step timeout in ms */
	defaultTimeout?: number;
	/** Log level */
	logLevel?: "debug" | "info" | "warn" | "error";
	/** Global event hooks */
	hooks?: WorkflowHooks;
}

/** Cron schedule definition */
export interface ScheduleConfig {
	/** Cron expression (e.g. every 5 minutes, @daily, @hourly) */
	cron: string;
	/** Input to pass to the workflow on each run */
	input?: unknown;
	/** Whether the schedule is currently active */
	enabled?: boolean;
}
