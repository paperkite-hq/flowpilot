import { Database } from "bun:sqlite";
import type { ExecutionRecord } from "./types.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL,
  input TEXT,
  output TEXT,
  error TEXT,
  steps TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started ON executions(started_at DESC);
`;

export class Store {
	private db: Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.db.exec("PRAGMA journal_mode = WAL;");
		this.db.exec(SCHEMA);
	}

	saveExecution(record: ExecutionRecord): void {
		this.db
			.prepare(
				`INSERT OR REPLACE INTO executions
				(id, workflow_id, status, input, output, error, steps, started_at, completed_at, duration_ms)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				record.id,
				record.workflowId,
				record.status,
				record.input != null ? JSON.stringify(record.input) : null,
				record.output != null ? JSON.stringify(record.output) : null,
				record.error ?? null,
				JSON.stringify(record.steps),
				record.startedAt,
				record.completedAt ?? null,
				record.durationMs ?? null,
			);
	}

	getExecution(id: string): ExecutionRecord | undefined {
		const row = this.db
			.prepare("SELECT * FROM executions WHERE id = ?")
			.get(id) as ExecutionRow | null;
		return row ? rowToRecord(row) : undefined;
	}

	listExecutions(workflowId?: string, limit = 20): ExecutionRecord[] {
		if (workflowId) {
			const rows = this.db
				.prepare("SELECT * FROM executions WHERE workflow_id = ? ORDER BY started_at DESC LIMIT ?")
				.all(workflowId, limit) as ExecutionRow[];
			return rows.map(rowToRecord);
		}
		const rows = this.db
			.prepare("SELECT * FROM executions ORDER BY started_at DESC LIMIT ?")
			.all(limit) as ExecutionRow[];
		return rows.map(rowToRecord);
	}

	close(): void {
		this.db.close();
	}
}

interface ExecutionRow {
	id: string;
	workflow_id: string;
	status: string;
	input: string | null;
	output: string | null;
	error: string | null;
	steps: string;
	started_at: string;
	completed_at: string | null;
	duration_ms: number | null;
}

function rowToRecord(row: ExecutionRow): ExecutionRecord {
	return {
		id: row.id,
		workflowId: row.workflow_id,
		status: row.status as ExecutionRecord["status"],
		input: row.input ? JSON.parse(row.input) : undefined,
		output: row.output ? JSON.parse(row.output) : undefined,
		error: row.error ?? undefined,
		steps: JSON.parse(row.steps),
		startedAt: row.started_at,
		completedAt: row.completed_at ?? undefined,
		durationMs: row.duration_ms ?? undefined,
	};
}
