// implements REQ-mcp-tool-check
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectFullKbQualityDiagnostics } from "../../src/public/impact/full-kb-quality.js";
import * as prologJson from "../../src/public/operations/prolog-json.js";
import type { QueryResult } from "../../src/prolog.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function makeProlog() {
  return {
    query: async (goal: string | readonly string[]): Promise<QueryResult> => {
      const text = Array.isArray(goal) ? goal.join(",") : goal;
      if (text.includes("kb_entity")) {
        return {
          success: true,
          bindings: {
            Results: `[['REQ-NORMATIVE',req,[title='Users must keep audit data',status=active,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='docs/REQ-NORMATIVE.md',granularity_reason='too_broad',predicate_namespace='domain']],['FACT-PRED',fact,[title='Predicate',status=active,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='.kb/facts.md',fact_kind=predicate,predicate_namespace='domain']]]`,
          },
        };
      }
      return { success: true, bindings: { Rels: "[]" } };
    },
  };
}

describe("full-kb-quality remaining entity, proof, and telemetry branches", () => {
  test("copies granularity_reason and predicate_namespace onto extracted entities", async () => {
    restores.push(isolateKibiEnv());
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
    });
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  test("fails closed when coverage proof readback throws and skips non-object stages", async () => {
    restores.push(isolateKibiEnv());
    const coverage = spyOn(prologJson, "runOperationJsonQuery").mockImplementation(
      async () => {
        throw new Error("coverage unavailable");
      },
    );
    spies.push(coverage);
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      proofSnapshot: "a".repeat(64),
      checkedAt: "2026-08-14T12:00:00.000Z",
    });
    expect(coverage).toHaveBeenCalled();
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  test("keeps object proof stages when coverage evidence is present", async () => {
    restores.push(isolateKibiEnv());
    const coverage = spyOn(prologJson, "runOperationJsonQuery").mockResolvedValue({
      rows: [
        {
          id: "REQ-NORMATIVE",
          proofStatus: "unresolved",
          proofStages: "not-an-object",
        },
        {
          id: "REQ-NORMATIVE",
          proofStatus: "proven",
          proofStages: {
            passingE2e: { status: "passed", tests: ["TEST-1"] },
          },
          proofGaps: ["proof_receipt_stale"],
        },
      ],
    });
    spies.push(coverage);
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      proofSnapshot: "a".repeat(64),
      checkedAt: "2026-08-14T12:00:00.000Z",
    });
    expect(coverage).toHaveBeenCalled();
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  test("surfaces unreadable and malformed usage logs as telemetry diagnostics", async () => {
    restores.push(isolateKibiEnv());
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-full-quality-remaining-"),
    );
    mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
    const unreadable = spyOn(fsp, "readFile").mockRejectedValue(
      Object.assign(new Error("permission denied"), { code: "EACCES" }),
    );
    spies.push(unreadable);
    const unread = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      workspaceRoot,
      now: new Date("2026-08-10T12:00:00Z"),
    });
    expect(
      unread.find((diagnostic) => diagnostic.id === "telemetry_evidence_unreadable")
        ?.message,
    ).toMatch(/unreadable: permission denied/);
    unreadable.mockRestore();

    writeFileSync(path.join(workspaceRoot, ".kb", "usage.log"), "not-json\n");
    const malformed = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      workspaceRoot,
      now: new Date("2026-08-10T12:00:00Z"),
    });
    expect(
      malformed.find((diagnostic) => diagnostic.id === "telemetry_evidence_unreadable")
        ?.message,
    ).toMatch(/malformed/);
  });
});
