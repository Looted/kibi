import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KIBI_PERF_TIMINGS_ENV,
  KIBI_PERF_TRACE_DIR_ENV,
  KIBI_PERF_TRACE_MAX_BYTES,
  KIBI_PERF_TRACE_MAX_EVENTS,
  type PerformanceTraceEventKind,
  writeAllBytes,
  writePerformanceTraceEvent,
} from "../src/performance-trace.js";

const saved = {
  timings: process.env[KIBI_PERF_TIMINGS_ENV],
  dir: process.env[KIBI_PERF_TRACE_DIR_ENV],
  cwd: process.cwd(),
  getuid: process.getuid,
};
const roots: string[] = [];
let dir: string;

function restore(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

function privateDir(): string {
  const created = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-perf-")),
  );
  fs.chmodSync(created, 0o700);
  roots.push(created);
  return created;
}

beforeEach(() => {
  dir = privateDir();
  process.env[KIBI_PERF_TIMINGS_ENV] = "1";
  process.env[KIBI_PERF_TRACE_DIR_ENV] = dir;
});

afterEach(() => {
  process.chdir(saved.cwd);
  process.getuid = saved.getuid;
  restore(KIBI_PERF_TIMINGS_ENV, saved.timings);
  restore(KIBI_PERF_TRACE_DIR_ENV, saved.dir);
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

const traceFile = (directory = dir) =>
  path.join(directory, `kibi-performance-${process.pid}.jsonl`);

function lines(directory = dir): unknown[] {
  if (!fs.existsSync(traceFile(directory))) return [];
  return fs
    .readFileSync(traceFile(directory), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const event = (durationMs: number, kind = "prolog-round-trip") => ({
  kind: kind as PerformanceTraceEventKind,
  durationMs,
});
const line = (durationMs: number, kind = "prolog-round-trip") => ({
  kind,
  durationMs,
  pid: process.pid,
});

describe("writePerformanceTraceEvent", () => {
  test("appends rounded events to a private file", () => {
    writePerformanceTraceEvent(event(1.23456));
    writePerformanceTraceEvent(event(0, "engine-query-cache-hit"));
    writePerformanceTraceEvent(event(60_000));
    expect(lines()).toStrictEqual([
      line(1.235),
      line(0, "engine-query-cache-hit"),
      line(60_000),
    ]);
    expect(fs.statSync(traceFile()).mode & 0o777).toBe(0o600);
    expect(fs.readFileSync(traceFile(), "utf8").endsWith("}\n")).toBe(true);
  });

  test("drops durations that are not finite or out of range", () => {
    for (const durationMs of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -0.001,
      60_000.001,
    ])
      writePerformanceTraceEvent(event(durationMs));
    expect(fs.existsSync(traceFile())).toBe(false);
  });

  test("writes nothing unless timings are on and the directory is absolute", () => {
    process.env[KIBI_PERF_TIMINGS_ENV] = "0";
    writePerformanceTraceEvent(event(1));
    Reflect.deleteProperty(process.env, KIBI_PERF_TIMINGS_ENV);
    writePerformanceTraceEvent(event(1));
    expect(fs.existsSync(traceFile())).toBe(false);
    process.env[KIBI_PERF_TIMINGS_ENV] = "1";
    Reflect.deleteProperty(process.env, KIBI_PERF_TRACE_DIR_ENV);
    expect(() => writePerformanceTraceEvent(event(1))).not.toThrow();
    process.env[KIBI_PERF_TRACE_DIR_ENV] = "";
    expect(() => writePerformanceTraceEvent(event(1))).not.toThrow();
    const cwd = path.join(dir, "cwd");
    fs.mkdirSync(cwd);
    process.chdir(cwd);
    process.env[KIBI_PERF_TRACE_DIR_ENV] = "..";
    writePerformanceTraceEvent(event(1));
    process.chdir(saved.cwd);
    expect(fs.existsSync(traceFile())).toBe(false);
  });

  test("refuses a missing, linked, shared or foreign directory", () => {
    process.env[KIBI_PERF_TRACE_DIR_ENV] = path.join(dir, "absent");
    writePerformanceTraceEvent(event(1));
    const link = path.join(privateDir(), "link");
    fs.symlinkSync(dir, link);
    process.env[KIBI_PERF_TRACE_DIR_ENV] = link;
    writePerformanceTraceEvent(event(1));
    expect(fs.existsSync(traceFile())).toBe(false);

    const shared = privateDir();
    fs.chmodSync(shared, 0o750);
    process.env[KIBI_PERF_TRACE_DIR_ENV] = shared;
    writePerformanceTraceEvent(event(1));
    expect(fs.existsSync(traceFile(shared))).toBe(false);

    const foreign = privateDir();
    process.env[KIBI_PERF_TRACE_DIR_ENV] = foreign;
    const uid = saved.getuid?.call(process) ?? 0;
    process.getuid = () => uid + 1;
    writePerformanceTraceEvent(event(1));
    process.getuid = undefined as unknown as typeof process.getuid;
    writePerformanceTraceEvent(event(1));
    process.getuid = saved.getuid;
    expect(fs.existsSync(traceFile(foreign))).toBe(false);
    writePerformanceTraceEvent(event(2));
    expect(lines(foreign)).toStrictEqual([line(2)]);
  });

  test("a regular file as the directory writes nothing and does not throw", () => {
    const file = path.join(dir, "plain");
    fs.writeFileSync(file, "", { mode: 0o600 });
    process.env[KIBI_PERF_TRACE_DIR_ENV] = file;
    expect(() => writePerformanceTraceEvent(event(1))).not.toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe("");
  });

  test("refuses the working directory and directories inside it", () => {
    process.chdir(dir);
    writePerformanceTraceEvent(event(1));
    expect(fs.existsSync(traceFile())).toBe(false);
    const inner = path.join(dir, "inner");
    fs.mkdirSync(inner, { mode: 0o700 });
    const dotted = path.join(dir, "..inner");
    fs.mkdirSync(dotted, { mode: 0o700 });
    for (const candidate of [inner, dotted]) {
      process.env[KIBI_PERF_TRACE_DIR_ENV] = candidate;
      writePerformanceTraceEvent(event(1));
      expect(fs.existsSync(traceFile(candidate))).toBe(false);
    }
  });

  test("accepts sibling and parent directories of the working directory", () => {
    const parent = privateDir();
    const cwd = path.join(parent, "cwd");
    fs.mkdirSync(cwd);
    const sibling = path.join(parent, "sibling");
    fs.mkdirSync(sibling, { mode: 0o700 });
    process.chdir(cwd);
    process.env[KIBI_PERF_TRACE_DIR_ENV] = sibling;
    writePerformanceTraceEvent(event(1));
    process.env[KIBI_PERF_TRACE_DIR_ENV] = parent;
    writePerformanceTraceEvent(event(2));
    expect(lines(sibling)).toStrictEqual([line(1)]);
    expect(lines(parent)).toStrictEqual([line(2)]);
  });

  test("never appends to a file it did not create", () => {
    fs.writeFileSync(traceFile(), "foreign\n");
    writePerformanceTraceEvent(event(1));
    writePerformanceTraceEvent(event(2));
    expect(fs.readFileSync(traceFile(), "utf8")).toBe("foreign\n");
  });

  test("stops when the file changes under it", () => {
    writePerformanceTraceEvent(event(1));
    fs.appendFileSync(traceFile(), "x");
    writePerformanceTraceEvent(event(2));
    writePerformanceTraceEvent(event(3));
    expect(fs.readFileSync(traceFile(), "utf8")).toBe(
      `${JSON.stringify(line(1))}\nx`,
    );

    const other = privateDir();
    process.env[KIBI_PERF_TRACE_DIR_ENV] = other;
    writePerformanceTraceEvent(event(1));
    const target = path.join(other, "target");
    fs.writeFileSync(target, fs.readFileSync(traceFile(other)));
    fs.rmSync(traceFile(other));
    fs.symlinkSync(target, traceFile(other));
    writePerformanceTraceEvent(event(2));
    expect(fs.readFileSync(target, "utf8")).toBe(
      `${JSON.stringify(line(1))}\n`,
    );

    const third = privateDir();
    process.env[KIBI_PERF_TRACE_DIR_ENV] = third;
    writePerformanceTraceEvent(event(1));
    fs.rmSync(traceFile(third));
    expect(() => writePerformanceTraceEvent(event(2))).not.toThrow();
    expect(fs.existsSync(traceFile(third))).toBe(false);
  });

  test("a failed append turns the trace off for good", () => {
    writePerformanceTraceEvent(event(1));
    const aside = `${traceFile()}.aside`;
    fs.renameSync(traceFile(), aside);
    writePerformanceTraceEvent(event(2));
    fs.renameSync(aside, traceFile());
    writePerformanceTraceEvent(event(3));
    expect(lines()).toStrictEqual([line(1)]);
  });

  test.skipIf(!fs.existsSync("/proc/self/fd"))(
    "closes the file after every append",
    () => {
      writePerformanceTraceEvent(event(1));
      const before = fs.readdirSync("/proc/self/fd").length;
      for (let index = 0; index < 20; index += 1)
        writePerformanceTraceEvent(event(1));
      expect(fs.readdirSync("/proc/self/fd").length).toBeLessThan(before + 5);
    },
  );

  test("ends with an events marker after the event limit", () => {
    for (let index = 0; index <= KIBI_PERF_TRACE_MAX_EVENTS + 1; index += 1)
      writePerformanceTraceEvent(event(1));
    const written = lines();
    expect(written.length).toBe(KIBI_PERF_TRACE_MAX_EVENTS + 1);
    expect(written.at(-2)).toStrictEqual(line(1));
    expect(written.at(-1)).toStrictEqual({
      kind: "trace-limit",
      pid: process.pid,
      limit: "events",
    });
  });

  test("ends with a bytes marker before the byte limit", () => {
    const kind = "k".repeat(100_000);
    for (let index = 0; index < 7; index += 1)
      writePerformanceTraceEvent(event(1, kind));
    const written = lines();
    expect(written.length).toBe(6);
    expect(written.at(-1)).toStrictEqual({
      kind: "trace-limit",
      pid: process.pid,
      limit: "bytes",
    });
    expect(fs.statSync(traceFile()).size).toBeLessThanOrEqual(
      KIBI_PERF_TRACE_MAX_BYTES,
    );
  });

  test("an event filling the reserve exactly is the last one written", () => {
    // Four events of `size` bytes fill the file up to the reserve exactly.
    const size = (KIBI_PERF_TRACE_MAX_BYTES - 96) / 4;
    const base = JSON.stringify(line(1, "")).length + 1;
    const kind = "k".repeat(size - base);
    for (let index = 0; index < 5; index += 1)
      writePerformanceTraceEvent(event(1, kind));
    const written = lines() as { kind: string }[];
    expect(written.map((entry) => entry.kind.length)).toStrictEqual([
      kind.length,
      kind.length,
      kind.length,
      kind.length,
      "trace-limit".length,
    ]);
  });

  test("an oversized first event leaves only the marker", () => {
    writePerformanceTraceEvent(event(1, "k".repeat(KIBI_PERF_TRACE_MAX_BYTES)));
    expect(lines()).toStrictEqual([
      { kind: "trace-limit", pid: process.pid, limit: "bytes" },
    ]);
  });
});

describe("writeAllBytes", () => {
  test("keeps writing until every byte is written", () => {
    const calls: number[][] = [];
    const write = ((
      _fd: number,
      _b: Buffer,
      offset: number,
      length: number,
    ) => {
      calls.push([offset, length]);
      return Math.min(length, 2);
    }) as unknown as typeof fs.writeSync;
    writeAllBytes(7, Buffer.from("abcde"), write);
    expect(calls).toStrictEqual([
      [0, 5],
      [2, 3],
      [4, 1],
    ]);
  });

  test("an empty buffer makes no call", () => {
    let called = false;
    writeAllBytes(7, Buffer.alloc(0), (() => {
      called = true;
      return 0;
    }) as unknown as typeof fs.writeSync);
    expect(called).toBe(false);
  });

  test("a write that makes no progress throws", () => {
    for (const result of [0, -1])
      expect(() =>
        writeAllBytes(
          7,
          Buffer.from("a"),
          (() => result) as unknown as typeof fs.writeSync,
        ),
      ).toThrow(new Error("Performance trace write made no progress"));
  });
});
