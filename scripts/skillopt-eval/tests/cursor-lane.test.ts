import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CursorUsageError,
  main as cursorMain,
  parseCursorArgs,
} from "../cursor-operator";
import { runCursorQualification } from "../cursor/qualify";
import {
  evaluateCursorVerdict,
  runCursorCompatibilityGate,
  summarizeCursorCells,
} from "../cursor/suite";
import type { CursorCellReceipt } from "../cursor/types";

setDefaultTimeout(60_000);

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

const FAKE_AGENT = `#!/bin/sh
case "$1" in
  --version) echo "2026.08.11-test"; exit 0 ;;
  status) echo '{"loggedIn":true,"email":"secret-identity@example.com"}'; exit 0 ;;
  models) printf 'model-alpha\\nmodel-beta\\n'; exit 0 ;;
  mcp)
    echo "playwright: ready"
    echo "kibi: ready"
    exit 0 ;;
esac
printf '%s\\n' '{"type":"assistant","message":{"content":[{"type":"text","text":"compat probe"}]}}'
printf '%s\\n' '{"type":"result","result":"done"}'
exit 0
`;

const FAKE_AGENT_UNAPPROVED = `#!/bin/sh
case "$1" in
  --version) echo "2026.08.11-test"; exit 0 ;;
  status) echo '{"loggedIn":true}' ; exit 0 ;;
  models) printf 'model-alpha\\n'; exit 0 ;;
  mcp) echo "kibi: not loaded (needs approval)"; exit 0 ;;
esac
exit 1
`;

async function fakeAgent(unapproved = false): Promise<string> {
  const root = await temporaryRoot("skillopt-cursor-fake-");
  const path = join(root, "cursor-agent");
  await writeFile(path, unapproved ? FAKE_AGENT_UNAPPROVED : FAKE_AGENT, {
    mode: 0o700,
  });
  await chmod(path, 0o700);
  return path;
}

function passingQualification() {
  return {
    schemaVersion: "1.0.0" as const,
    artifactType: "skillopt-cursor-qualification" as const,
    verdict: "pass" as const,
    cursorVersion: "2026.08.11-test",
    reasons: [],
    checks: [],
    paidModelCalls: 0 as const,
  };
}

describe("cursor compatibility lane", () => {
  test("summarizes per-variant cells and applies absolute floors", () => {
    const cell = (
      variant: CursorCellReceipt["variant"],
      score: number,
      hard: 0 | 1,
      criticalFailures: readonly string[] = [],
    ): CursorCellReceipt => ({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-cursor-cell",
      host: "cursor-agent",
      hostVersion: "test",
      episodeId: `ep-${variant}-${score}-${hard}`,
      runId: "run",
      variant,
      skill: "kibi-usage",
      taskId: "task",
      candidateBodyHash: "a".repeat(64),
      startedAt: "2026-08-24T00:00:00Z",
      finishedAt: "2026-08-24T00:01:00Z",
      exitCode: 0,
      termination: "exit",
      result: {
        outcome: hard === 1 ? "pass" : "fail",
        score,
        hard,
        criticalFailures: [...criticalFailures],
        terminalCategory: null,
      },
      evidenceHashes: {
        brokerTrace: "b".repeat(64),
        diagnosticReceipt: "c".repeat(64),
        finalState: "d".repeat(64),
        transcript: "e".repeat(64),
      },
    });

    const summaries = summarizeCursorCells([
      cell("baseline", 40, 0),
      cell("skillopt", 80, 1),
      cell("skillopt", 70, 0),
      cell("skillopt", 90, 1, ["isolation-1"]),
    ]);
    const candidate = summaries.find((s) => s.variant === "skillopt");
    expect(candidate?.cells).toBe(3);
    expect(candidate?.hardPasses).toBe(2);
    expect(candidate?.meanScore).toBeCloseTo(80);
    expect(candidate?.securityFailures).toBe(1);

    const failed = evaluateCursorVerdict({
      phase: "development",
      qualification: passingQualification(),
      summaries,
    });
    expect(failed.verdict).toBe("incompatible");
    expect(failed.reasons).toContain("cursor:security-failures");

    const passed = evaluateCursorVerdict({
      phase: "development",
      qualification: passingQualification(),
      summaries: [
        {
          variant: "skillopt",
          cells: 4,
          hardPasses: 3,
          meanScore: 82,
          securityFailures: 0,
        },
      ],
    });
    expect(passed.verdict).toBe("compatible");

    const unqualified = evaluateCursorVerdict({
      phase: "development",
      qualification: {
        ...passingQualification(),
        verdict: "no-go",
        reasons: ["cursor_not_authenticated"],
      },
      summaries: [],
    });
    expect(unqualified.verdict).toBe("not-qualified");

    const informational = evaluateCursorVerdict({
      phase: "held-out",
      qualification: passingQualification(),
      summaries,
    });
    expect(informational.verdict).toBe("informational");
  });

  test("qualifies a healthy fake agent without recording account data", async () => {
    const agent = await fakeAgent();
    const receipt = await runCursorQualification({
      cursorExecutable: agent,
      cwd: process.cwd(),
    });

    expect(receipt.verdict).toBe("pass");
    expect(receipt.cursorVersion).toBe("2026.08.11-test");
    expect(receipt.checks.map((check) => check.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "pass",
    ]);
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain("example.com");
    expect(serialized).not.toContain("secret-identity");
  });

  test("fails closed when the Kibi MCP server awaits approval", async () => {
    const agent = await fakeAgent(true);
    const receipt = await runCursorQualification({
      cursorExecutable: agent,
      cwd: process.cwd(),
    });

    expect(receipt.verdict).toBe("no-go");
    expect(receipt.reasons).toContain("cursor_kibi_mcp_not_ready");
    const approvalCheck = receipt.checks.find(
      (check) => check.name === "kibi-mcp-ready",
    );
    expect(approvalCheck?.detail).toBe("awaiting approval");
  });

  test("parses operator arguments strictly", () => {
    expect(parseCursorArgs(["qualify"])).toMatchObject({
      command: "qualify",
      skill: "kibi-usage",
      phase: "development",
    });
    expect(
      parseCursorArgs([
        "compat",
        "--skill",
        "kibi-bootstrap",
        "--phase",
        "held-out",
        "--candidate",
        "c.md",
        "--fixture-run-root",
        "/tmp/fixtures",
      ]),
    ).toMatchObject({
      command: "compat",
      skill: "kibi-bootstrap",
      phase: "held-out",
      candidatePath: "c.md",
      fixtureRunRoot: "/tmp/fixtures",
    });
    expect(() => parseCursorArgs(["bogus"])).toThrow(CursorUsageErrorShape());
    expect(() => parseCursorArgs(["compat", "--skill", "bundle"])).toThrow(
      /--skill must be one of/,
    );
  });

  test("main returns usage error code 2 for unknown commands", async () => {
    const code = await cursorMain(["nonsense"]);
    expect(code).toBe(2);
  });

  test("gate reports not-qualified without launching cells", async () => {
    const artifactRoot = await temporaryRoot("skillopt-cursor-gate-");
    const report = await runCursorCompatibilityGate({
      runId: "gate-run",
      skill: "kibi-usage",
      phase: "development",
      fixtureRunRoot: join(artifactRoot, "missing-fixtures"),
      sourceWorktree: process.cwd(),
      artifactRoot,
      cursorExecutable: "cursor-agent",
      hostVersion: "test",
      candidates: [{ variant: "skillopt", body: "candidate body" }],
      qualification: {
        ...passingQualification(),
        verdict: "no-go",
        reasons: ["cursor_models_unavailable"],
      },
    });

    expect(report.verdict).toBe("not-qualified");
    expect(report.cells).toEqual([]);
    expect(report.productionAdoption).toBe("external-verdict-required");
  });
});

function CursorUsageErrorShape() {
  return CursorUsageError;
}
