import { constants } from "node:fs";
import {
  closeSync,
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

/** The trace file is no longer the one this process has been appending to. */
class TraceFileChanged extends Error {}
const MAX_DURATION_MS = 60_000;
const TRACE_LIMIT_RESERVE_BYTES = 96;

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  // The same directory gives "", which passes every test below.
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function privateTraceFile(): {
  readonly file: string;
  readonly state: TraceState;
} | null {
  if (process.env[KIBI_PERF_TIMINGS_ENV] !== "1") return null;
  const configuredDirectory = process.env[KIBI_PERF_TRACE_DIR_ENV] as string;

  try {
    // An unset variable is no absolute path (Node throws for it instead,
    // which the catch below answers the same way).
    if (!path.isAbsolute(configuredDirectory)) return null;
    // A symbolic link anywhere in the path makes the real path differ. A
    // configured path that is not a directory fails at the first append,
    // which disables the trace.
    const directory = realpathSync(configuredDirectory);
    if (path.resolve(configuredDirectory) !== directory) return null;
    const directoryStats = statSync(directory);
    // Windows has no process.getuid: the call throws and the catch below
    // turns the trace off there.
    // biome-ignore lint/style/noNonNullAssertion: see above
    if (directoryStats.uid !== process.getuid!()) return null;
    if ((directoryStats.mode & 0o077) !== 0) {
      return null;
    }
    const currentDirectory = realpathSync(process.cwd());
    if (isWithin(currentDirectory, directory)) return null;

    const file = path.join(directory, `kibi-performance-${process.pid}.jsonl`);
    let state = states.get(file);
    if (!state) {
      // A file this process did not create fails the O_EXCL first append.
      state = { bytes: 0, events: 0, disabled: false };
      states.set(file, state);
    }
    if (state.disabled) return null;
    return { file, state };
  } catch {
    // Any unreadable directory leaves the trace off.
  }
  return null;
}

/** Write every byte of `bytes` to `fd`, however many calls `write` takes. */
export function writeAllBytes(
  fd: number,
  bytes: Buffer,
  write: typeof writeSync = writeSync,
): void {
  let offset = 0;
  while (offset < bytes.length) {
    const written = write(fd, bytes, offset, bytes.length - offset);
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
  // The first line creates the file with O_EXCL, which fails when it exists.
  // Every later line expects the file exactly as this process left it: lstat
  // throws for a vanished file and reports a symbolic link as no file. Any
  // failure here disables the trace (see the caller).
  if (!exclusive) {
    const fileInfo = lstatSync(file);
    if (!fileInfo.isFile() || fileInfo.size !== state.bytes)
      throw new TraceFileChanged();
  }
  // O_NOFOLLOW is undefined on Windows, and `| undefined` adds no bits.
  const flags =
    constants.O_WRONLY |
    constants.O_CREAT |
    constants.O_APPEND |
    constants.O_NOFOLLOW |
    (exclusive ? constants.O_EXCL : 0);
  const fd = openSync(file, flags, 0o600);
  try {
    const bytes = Buffer.from(line, "utf8");
    writeAllBytes(fd, bytes);
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
  // Events stop TRACE_LIMIT_RESERVE_BYTES short of the byte limit, which
  // leaves room for this marker.
  state.disabled = true;
  const marker = `${JSON.stringify({ kind: "trace-limit", pid: process.pid, limit })}\n`;
  appendLine(file, state, marker, state.events === 0);
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
  const byteLength = Buffer.byteLength(line);

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
