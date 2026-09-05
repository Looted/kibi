// implements REQ-kibi-html-health-report

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { openReport, reportCommand } from "../../src/commands/report.js";

function coverage(total: number, proven: number) {
  return {
    branch: "develop",
    requirements: {
      summary: { total, proofNotApplicable: 0, proofProven: proven },
      meta: { branch: "develop", dirty: false, proofSnapshotDirty: false },
      rows: Array.from({ length: total }, (_, index) => ({
        id: `REQ-${index + 1}`,
        title: "Row",
        proofStatus: index < proven ? "proven" : "missing",
        proofGaps: [] as string[],
      })),
    },
    symbols: { summary: { total: 0, uncovered: 0, mixedRole: 0 }, rows: [] },
  };
}

describe("report badge bands and openReport", () => {
  let root: string;
  let logSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-report-bands-"));
    logSpy = spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test("renders no-requirements, 95%, and 75% badge bands", async () => {
    await reportCommand(
      { output: "empty" },
      { cwd: () => root, loadCoverage: async () => coverage(0, 0) },
    );
    expect(readFileSync(path.join(root, "empty", "badge.svg"), "utf8")).toContain(
      "no requirements",
    );

    await reportCommand(
      { output: "high.htm" },
      { cwd: () => root, loadCoverage: async () => coverage(20, 19) },
    );
    expect(readFileSync(path.join(root, "high.badge.svg"), "utf8")).toContain(
      "95% proven",
    );

    await reportCommand(
      { output: "mid" },
      { cwd: () => root, loadCoverage: async () => coverage(4, 3) },
    );
    expect(readFileSync(path.join(root, "mid", "badge.svg"), "utf8")).toContain(
      "75% proven",
    );
  });

  test("openReport spawns the platform opener and rejects spawn errors", async () => {
    const childProcess = await import("node:child_process");
    const spawnSpy = spyOn(childProcess, "spawn").mockImplementation((() => {
      const child = new EventEmitter() as EventEmitter & {
        unref: () => void;
      };
      child.unref = () => undefined;
      queueMicrotask(() => child.emit("spawn"));
      return child as never;
    }) as typeof childProcess.spawn);
    await openReport(path.join(root, "index.html"));
    expect(spawnSpy).toHaveBeenCalled();
    spawnSpy.mockImplementation((() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("error", new Error("no opener")));
      return child as never;
    }) as typeof childProcess.spawn);
    await expect(openReport(path.join(root, "index.html"))).rejects.toThrow(
      /no opener/,
    );
    spawnSpy.mockRestore();
  });
});
