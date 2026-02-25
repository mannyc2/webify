type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  source: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

export interface Logger {
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
}

export function createLogger(source: string): Logger {
  function emit(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
    const entry: LogEntry = { source, level, msg, ...extra };
    if (level === "error") {
      console.error(entry);
    } else if (level === "warn") {
      console.warn(entry);
    } else {
      console.log(entry);
    }
  }

  return {
    info: (msg, extra) => emit("info", msg, extra),
    warn: (msg, extra) => emit("warn", msg, extra),
    error: (msg, extra) => emit("error", msg, extra),
  };
}
