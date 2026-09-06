// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { executeIngestProof } from "../../src/operations/proof/ingest-proof.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const SNAPSHOT = "a".repeat(64);
const command = ["node", "scripts/run-proof-step.mjs"];
const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-CASE-1", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

function artifact(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-command-producer" },
    integration: "self-proof",
    command_argv: command,
    code_snapshot: SNAPSHOT,
    environment: {
      os: "linux",
      arch: "x86_64",
      runtime: { name: "node", version: "v24" },
    },
    run: {
      outcome: "failed",
      exit_code: 1,
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
    },
    proof_results: [
      {
        symbol_id: "SYM-CASE-1",
        target: "default",
        outcome: "failed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
    ...overrides,
  };
}

function writeIntegrations(dir: string): void {
  mkdirSync(path.join(dir, ".kb", "proof"), { recursive: true });
  writeFileSync(
    path.join(dir, ".kb", "proof", "integrations.json"),
    JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [{ id: "self-proof", producer: "command", command }],
    }),
  );
}

function context(
  workspaceRoot: string,
  query: PrologPort["query"],
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query,
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: SNAPSHOT,
        dirty: false,
        fileCount: 1,
      }),
    },
  };
}

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("executeIngestProof remaining binding, integration, and receipt errors", () => {
  test("rejects proof_bindings rows that fail protocol validation", async () => {
    restores.push(isolateKibiEnv());
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-bind-err-"));
    roots.push(dir);
    writeIntegrations(dir);
    const bindings = [{ symbol_id: "", target: "default" }];
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact(), testIds: ["TEST-1"] },
        context(dir, async (goal) => {
          if (String(goal).includes("kb_entity('TEST-1'")) {
            return {
              success: true,
              bindings: {
                Results: `[[TEST-1,test,[id='TEST-1',title="Bad bindings",status=active,verification_scope=end_to_end,proof_contract=${JSON.stringify(JSON.stringify(contract))},proof_bindings=${JSON.stringify(JSON.stringify(bindings))}]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/symbol_id must be a non-empty/);
  });

  test("selects matching integration tests then rejects missing verification_scope receipts", async () => {
    restores.push(isolateKibiEnv());
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ingest-scope-"));
    roots.push(dir);
    writeIntegrations(dir);
    await expect(
      executeIngestProof(
        { snapshot: SNAPSHOT, artifact: artifact() },
        context(dir, async () => ({
          success: true,
          bindings: {
            Results: `[[TEST-1,test,[id='TEST-1',title="No scope",status=active,proof_contract=${JSON.stringify(JSON.stringify(contract))}]]]`,
          },
        })),
      ),
    ).rejects.toThrow(/verification_scope is required/);
  });
});
