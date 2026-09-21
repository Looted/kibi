// implements REQ-kibi-html-health-report
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { reportCommand } from "../../src/commands/report.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
const previousExitCode = process.exitCode;

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (typeof previousExitCode === "number") process.exitCode = previousExitCode;
  else if (typeof process.exitCode === "number") process.exitCode = 0;
});

function preparedWorkspace(): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function coverageRows(overrides: Record<string, unknown> = {}) {
  return {
    requirements: {
      summary: {
        total: 1,
        proofNotApplicable: 0,
        proofProven: 1,
        ...((overrides.summary as object) ?? {}),
      },
      meta: {
        branch: "feature/report",
        dirty: false,
        proofSnapshotDirty: false,
        ...((overrides.meta as object) ?? {}),
      },
      rows: [
        {
          id: "REQ-1",
          title: "HTML report",
          proofStatus: "proven",
          proofGaps: [] as string[],
        },
      ],
    },
    symbols: {
      summary: { total: 1, uncovered: 0, mixedRole: 0 },
      rows: [],
    },
    branch: "feature/report",
    ...overrides,
  };
}

describe("reportCommand remaining executeCoverageInContext path", () => {
  test("writes html plus badge from injected coverage", async () => {
    const cwd = preparedWorkspace();
    const fixture = coverageRows();
    const io = captureIo();
    restores.push(io.restore);
    const output = await withCwd(cwd, () =>
      reportCommand(
        {
          output: "health-report",
          tag: " core, ,cli ",
          limit: "50",
        },
        {
          cwd: () => cwd,
          loadCoverage: async () => fixture as never,
        },
      ),
    );
    expect(output).toBe(path.join(cwd, "health-report", "index.html"));
    expect(existsSync(output)).toBe(true);
    expect(existsSync(path.join(cwd, "health-report", "badge.svg"))).toBe(true);
    expect(io.logText()).toContain("Kibi report written");
  });

  test("surfaces structured coverage failures from the injected loader", async () => {
    const cwd = preparedWorkspace();
    await expect(
      withCwd(cwd, () =>
        reportCommand(
          { output: "broken.html" },
          {
            cwd: () => cwd,
            loadCoverage: async () => {
              throw new Error("Coverage did not return structured report data");
            },
          },
        ),
      ),
    ).rejects.toThrow(/structured report data/);
  });

  test("uses the coverage meta branch and unknown fallbacks when attachment is missing", async () => {
    const cwd = preparedWorkspace();
    const output = await withCwd(cwd, () =>
      reportCommand(
        { output: "empty-branch.html" },
        {
          cwd: () => cwd,
          loadCoverage: async () =>
            ({
              requirements: {
                summary: { total: 0, proofNotApplicable: 0, proofProven: 0 },
                meta: {},
                rows: [],
              },
              symbols: {
                summary: { total: 0, uncovered: 0, mixedRole: 0 },
                rows: [],
              },
              branch: "unknown",
            }) as never,
        },
      ),
    );
    expect(existsSync(output)).toBe(true);
  });

  test("cleans up a failed atomic write and still opens via the default viewer", async () => {
    const cwd = preparedWorkspace();
    const load = async () => coverageRows();
    const originalRename = fsPromises.rename;
    let failedOnce = false;
    const rename = spyOn(fsPromises, "rename").mockImplementation(
      async (from, to) => {
        if (!failedOnce && String(to).endsWith("fail.html")) {
          failedOnce = true;
          throw new Error("EIO rename");
        }
        return originalRename(from, to);
      },
    );
    restores.push(() => rename.mockRestore());
    await expect(
      withCwd(cwd, () =>
        reportCommand(
          { output: "fail.html" },
          { cwd: () => cwd, loadCoverage: load },
        ),
      ),
    ).rejects.toThrow(/EIO rename/);

    const opened: string[] = [];
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () =>
      reportCommand(
        { output: "opened.html", open: true },
        {
          cwd: () => cwd,
          loadCoverage: load,
          openReport: async (filePath) => {
            opened.push(filePath);
          },
        },
      ),
    );
    expect(opened[0]).toContain("opened.html");
    expect(io.logText()).toContain("Opened Kibi report");
  });

  test("renders warning, signal, and dirty badge colors from default repository metadata", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".git"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".git", "config"),
      `[remote "origin"]
	url = https://github.com/Acme/Widgets.git
`,
    );
    const warningRows = Array.from({ length: 10 }, (_, index) => ({
      id: `REQ-${index + 1}`,
      proofStatus: index < 8 ? "proven" : "missing",
      proofGaps: [] as string[],
    }));
    const warning = coverageRows({
      requirements: {
        summary: { total: 10, proofNotApplicable: 0, proofProven: 8 },
        meta: { dirty: true, proofSnapshotDirty: false, branch: "main" },
        rows: warningRows,
      },
    });
    const io = captureIo();
    restores.push(io.restore);
    await withCwd(cwd, () =>
      reportCommand(
        { output: "warn.html" },
        { cwd: () => cwd, loadCoverage: async () => warning as never },
      ),
    );
    expect(existsSync(path.join(cwd, "warn.badge.svg"))).toBe(true);

    const signalRows = Array.from({ length: 10 }, (_, index) => ({
      id: `REQ-S${index + 1}`,
      proofStatus: index < 9 ? "proven" : "missing",
      proofGaps: [] as string[],
    }));
    const signal = coverageRows({
      requirements: {
        summary: { total: 10, proofNotApplicable: 0, proofProven: 9 },
        meta: { dirty: false, proofSnapshotDirty: false },
        rows: signalRows,
      },
    });
    await withCwd(cwd, () =>
      reportCommand(
        { output: "signal.html" },
        { cwd: () => cwd, loadCoverage: async () => signal as never },
      ),
    );
    expect(existsSync(path.join(cwd, "signal.badge.svg"))).toBe(true);
  });
});
