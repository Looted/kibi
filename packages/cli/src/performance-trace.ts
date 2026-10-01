import { constants } from "node:fs";
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  realpathSync,
  statSync,
  writeSync,
} from "node:fs";
import path from "node:path";

export const KIBI_PERF_TRACE_DIR_ENV = "KIBI_PERF_TRACE_DIR";
export const KIBI_PERF_TIMINGS_ENV = "KIBI_PERF_TIMINGS";
export const KIBI_PERF_TRACE_MAX_EVENTS = 5_000;
export const KIBI_PERF_TRACE_MAX_BYTES = 512 * 1024;

export type PerformanceTraceEventKind =
  | "prolog-round-trip"
  | "prolog-process-cache-hit"
  | "engine-query-cache-hit"
  | "engine-freshness-cache-hit";

interface PerformanceTraceEvent {
  readonly kind: PerformanceTraceEventKind;
  readonly durationMs: number;
}

interface TraceState {
  bytes: number;
  events: number;
  disabled: boolean;
}

const states = new Map<string, TraceState>();
const MAX_DURATION_MS = 60_000;
const TRACE_LIMIT_RESERVE_BYTES = 96;

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function privateTraceFile(): {
  readonly file: string;
  readonly state: TraceState;
} | null {
  if (process.env[KIBI_PERF_TIMINGS_ENV] !== "1") return null;
  const configuredDirectory = process.env[KIBI_PERF_TRACE_DIR_ENV];
  if (!configuredDirectory || !path.isAbsolute(configuredDirectory))
    return null;

  try {
    const directoryInfo = lstatSync(configuredDirectory);
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
      return null;
    }
    const directory = realpathSync(configuredDirectory);
    if (path.resolve(configuredDirectory) !== directory) return null;
    const directoryStats = statSync(directory);
    if (
      typeof process.getuid !== "function" ||
      directoryStats.uid !== process.getuid()
    ) {
      return null;
    }
    if ((directoryStats.mode & 0o077) !== 0) {
      return null;
    }
    const currentDirectory = realpathSync(process.cwd());
    if (isWithin(currentDirectory, directory)) return null;

    const file = path.join(directory, `kibi-performance-${process.pid}.jsonl`);
    let state = states.get(file);
    if (!state) {
      if (existsSync(file)) return null;
      state = { bytes: 0, events: 0, disabled: false };
      states.set(file, state);
    }
    if (state.disabled) return null;
    return { file, state };
  } catch {
    return null;
  }
}

function writeAll(fd: number, bytes: Buffer): void {
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(fd, bytes, offset, bytes.length - offset);
    if (written <= 0)
      throw new Error("Performance trace write made no progress");
    offset += written;
  }
}

function appendLine(
  file: string,
  state: TraceState,
  line: string,
  exclusive: boolean,
): void {
  const fileInfo = existsSync(file) ? lstatSync(file) : null;
  if (
    (exclusive && fileInfo !== null) ||
    (!exclusive &&
      (!fileInfo?.isFile() ||
        fileInfo.isSymbolicLink() ||
        fileInfo.size !== state.bytes))
  ) {
    throw new Error("Performance trace file changed unexpectedly");
  }
  const flags =
    constants.O_WRONLY |
    constants.O_CREAT |
    constants.O_APPEND |
    (constants.O_NOFOLLOW ?? 0) |
    (exclusive ? constants.O_EXCL : 0);
  const fd = openSync(file, flags, 0o600);
  try {
    const bytes = Buffer.from(line, "utf8");
    writeAll(fd, bytes);
    state.bytes += bytes.length;
  } finally {
    closeSync(fd);
  }
}

function appendLimitMarker(
  file: string,
  state: TraceState,
  limit: "events" | "bytes",
): void {
  const marker = `${JSON.stringify({ kind: "trace-limit", pid: process.pid, limit })}\n`;
  const byteLength = Buffer.byteLength(marker, "utf8");
  if (state.bytes + byteLength <= KIBI_PERF_TRACE_MAX_BYTES) {
    appendLine(file, state, marker, state.events === 0);
  }
  state.disabled = true;
}

/**
 * Append one bounded, payload-free timing observation to the explicitly
 * supplied private host trace directory. Trace I/O is best-effort and never
 * changes the operation result.
 */
export function writePerformanceTraceEvent(event: PerformanceTraceEvent): void {
  if (
    !Number.isFinite(event.durationMs) ||
    event.durationMs < 0 ||
    event.durationMs > MAX_DURATION_MS
  ) {
    return;
  }
  const trace = privateTraceFile();
  if (!trace) return;
  const durationMs = Math.round(event.durationMs * 1000) / 1000;
  const line = `${JSON.stringify({
    kind: event.kind,
    durationMs,
    pid: process.pid,
  })}\n`;
  const byteLength = Buffer.byteLength(line, "utf8");

  try {
    if (
      trace.state.events >= KIBI_PERF_TRACE_MAX_EVENTS ||
      trace.state.bytes + byteLength >
        KIBI_PERF_TRACE_MAX_BYTES - TRACE_LIMIT_RESERVE_BYTES
    ) {
      appendLimitMarker(
        trace.file,
        trace.state,
        trace.state.events >= KIBI_PERF_TRACE_MAX_EVENTS ? "events" : "bytes",
      );
      return;
    }
    appendLine(trace.file, trace.state, line, trace.state.events === 0);
    trace.state.events += 1;
  } catch {
    trace.state.disabled = true;
  }
}
