/**
 * Minimal structured logger. All app logging goes through this — never bare
 * `console.*` (frontend-practices §8). Swap the sink later (Sentry, etc.).
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = { level, msg, ...meta, ts: new Date().toISOString() };
  (console[level] ?? console.log)(JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
