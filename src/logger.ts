import type { Logger } from "./types.ts";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export function createLogger(prefix: string, level: keyof typeof LEVELS = "info"): Logger {
	const minLevel = LEVELS[level];

	function emit(lvl: keyof typeof LEVELS, message: string, data?: Record<string, unknown>) {
		if (LEVELS[lvl] < minLevel) return;
		const ts = new Date().toISOString();
		const line = `[${ts}] [${lvl.toUpperCase()}] [${prefix}] ${message}`;
		if (data && Object.keys(data).length > 0) {
			console.log(line, JSON.stringify(data));
		} else {
			console.log(line);
		}
	}

	return {
		info: (msg, data) => emit("info", msg, data),
		warn: (msg, data) => emit("warn", msg, data),
		error: (msg, data) => emit("error", msg, data),
		debug: (msg, data) => emit("debug", msg, data),
	};
}
