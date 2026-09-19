import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COMMITTED_BASELINE_PATH,
  buildProofImpact,
  executeProofImpact,
  loadCommittedBaseline,
  proofImpactExitCode,
  renderProofImpact,
} from "../../src/operations/proof/impact.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import { execSync } from "../helpers/isolated-env.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function provenBaseline(status: "proven" | "missing") {
  return {
    version: "kibi.proof-baseline.v2",
    mode: "ratchet",
    currentRequirements: 1,
    proofProven: status === "proven" ? 1 : 0,
    currentUnproven: status === "proven" ? 0 : 1,
    trackedGaps: {},
    requirements: {
      "REQ-A": {
        proofStatus: status,
        gaps: status === "proven" ? [] : ["missing_production_symbol_coverage"],
        uncoveredSymbols: [],
      },
    },
  };
}

function missingCoverage() {
  return {
    summary: {
      total: 1,
      proofNotApplicable: 0,
      proofProven: 0,
      proofMissing: 1,
      proofUnresolved: 0,
    },
    rows: [
      {
        id: "REQ-A",
        proofStatus: "missing",
        proofGaps: ["missing_production_symbol_coverage"],
        proofStages: {
          productionSymbols: { uncoveredSymbols: [] },
        },
      },
    ],
  };
}

function provenCoverage() {
  return {
    summary: {
      total: 1,
      proofNotApplicable: 0,
      proofProven: 1,
      proofMissing: 0,
      proofUnresolved: 0,
    },
    rows: [
      {
        id: "REQ-A",
        proofStatus: "proven",
        proofGaps: [],
        proofStages: {
          productionSymbols: { uncoveredSymbols: [] },
        },
      },
    ],
  };
}

function createGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "kibi-proof-impact-"));
  tempDirs.push(dir);
  execSync("git init -b main", { cwd: dir, stdio: "pipe" });
  execSync('git config user.name "Kibi Test"', { cwd: dir, stdio: "pipe" });
  execSync('git config user.email "test@kibi.invalid"', {
    cwd: dir,
    stdio: "pipe",
  });
  execSync("git config commit.gpgsign false", { cwd: dir, stdio: "pipe" });
  return dir;
}

function writeBaseline(dir: string, status: "proven" | "missing" | "raw") {
  mkdirSync(join(dir, "proof"), { recursive: true });
  const path = join(dir, COMMITTED_BASELINE_PATH);
  if (status === "raw") {
    writeFileSync(path, "{not-json");
    return;
  }
  writeFileSync(path, `${JSON.stringify(provenBaseline(status), null, 2)}\n`);
}

function commitBaseline(dir: string, message: string) {
  execSync(`git add ${COMMITTED_BASELINE_PATH}`, { cwd: dir, stdio: "pipe" });
  execSync(`git commit -m "${message}"`, { cwd: dir, stdio: "pipe" });
}

function stubContext(workspaceRoot: string): OperationContext {
  return {
    workspaceRoot,
    signal: AbortSignal.abort(),
    clock: () => new Date("2026-08-10T12:05:00Z"),
  };
}

describe("proof impact vs committed baseline", () => {
  test("names committed proof/baseline.json as the comparison target", () => {
    const { result, rows } = buildProofImpact(
      {
        version: "kibi.proof-baseline.v2",
        requirements: {
          "REQ-A": {
            proofStatus: "proven",
            gaps: [],
            uncoveredSymbols: [],
          },
        },
      },
      missingCoverage(),
    );
    expect(result.comparisonTarget).toBe(COMMITTED_BASELINE_PATH);
    expect(result.comparisonTarget).toBe("proof/baseline.json");
    expect(result.changes[0]?.id).toBe("REQ-A");
    const text = renderProofImpact(result, rows);
    expect(text).toContain("committed proof/baseline.json");
    expect(text).toContain("REQ-A: proven -> missing");
    expect(text).not.toContain("Git HEAD");
    expect(text).not.toContain("worktree");
  });

  test("reads HEAD:proof/baseline.json even when the worktree baseline was edited", async () => {
    const dir = createGitRepo();
    writeBaseline(dir, "proven");
    commitBaseline(dir, "committed proven baseline");
    writeBaseline(dir, "missing");

    const baseline = await loadCommittedBaseline(dir);
    expect(baseline.requirements?.["REQ-A"]?.proofStatus).toBe("proven");

    const { result, text } = await executeProofImpact(stubContext(dir), {
      loadCoverage: async () => ({ structuredContent: missingCoverage() }),
    });
    expect(result.changes).toEqual([
      expect.objectContaining({
        id: "REQ-A",
        kind: "changed",
        before: expect.objectContaining({ proofStatus: "proven" }),
        after: expect.objectContaining({ proofStatus: "missing" }),
      }),
    ]);
    expect(text).toContain("REQ-A: proven -> missing");
  });

  test("fails when HEAD:proof/baseline.json is missing", async () => {
    const dir = createGitRepo();
    writeFileSync(join(dir, "README.md"), "sandbox\n");
    execSync("git add README.md", { cwd: dir, stdio: "pipe" });
    execSync('git commit -m "no baseline"', { cwd: dir, stdio: "pipe" });
    await expect(loadCommittedBaseline(dir)).rejects.toThrow(
      /HEAD:proof\/baseline\.json is missing or unreadable/,
    );
  });

  test("fails when HEAD:proof/baseline.json is not valid JSON", async () => {
    const dir = createGitRepo();
    writeBaseline(dir, "raw");
    commitBaseline(dir, "malformed baseline");
    await expect(loadCommittedBaseline(dir)).rejects.toThrow(
      /HEAD:proof\/baseline\.json is not valid JSON/,
    );
  });

  test("fails when the workspace is not a Git repository", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kibi-proof-impact-nongit-"));
    tempDirs.push(dir);
    writeBaseline(dir, "proven");
    await expect(loadCommittedBaseline(dir)).rejects.toThrow(
      /not in a suitable Git state/,
    );
  });

  test("exits 0 for no change, improvements, and regressions", () => {
    const unchanged = buildProofImpact(
      provenBaseline("proven"),
      provenCoverage(),
    ).result;
    const improved = buildProofImpact(
      provenBaseline("missing"),
      provenCoverage(),
    ).result;
    const regressed = buildProofImpact(
      provenBaseline("proven"),
      missingCoverage(),
    ).result;
    expect(unchanged.changes).toHaveLength(0);
    expect(improved.changes[0]).toEqual(
      expect.objectContaining({
        id: "REQ-A",
        before: expect.objectContaining({ proofStatus: "missing" }),
        after: expect.objectContaining({ proofStatus: "proven" }),
      }),
    );
    expect(regressed.changes[0]).toEqual(
      expect.objectContaining({
        id: "REQ-A",
        before: expect.objectContaining({ proofStatus: "proven" }),
        after: expect.objectContaining({ proofStatus: "missing" }),
      }),
    );
    expect(proofImpactExitCode(unchanged)).toBe(0);
    expect(proofImpactExitCode(improved)).toBe(0);
    expect(proofImpactExitCode(regressed)).toBe(0);
  });
});
