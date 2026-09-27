import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coverageCommand } from "../../src/commands/coverage.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import { proofImpactCommand } from "../../src/commands/proof-impact.js";
import { resolveBoundSymbolScope } from "../../src/extractors/manifest.js";
import { removeFrontmatterBlock } from "../../src/operations/proof/receipt-document.js";
import { PrologProcess } from "../../src/prolog.js";
import { toPrologString } from "../../src/prolog/codec.js";
import { loadEntities } from "../../src/public/operations/discovery-entities.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import { toPrologAtom } from "../../src/public/operations/prolog-json.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import { perContractTestBindings } from "../../src/public/operations/specs/reporting.js";
import { receiptBindingHash } from "../../src/public/proof-fingerprint.js";
import { resolveBranchAttachment } from "../../src/utils/branch-resolver.js";
import { ensureBranchStoreManifest } from "../../src/utils/branch-store-locator.js";
import {
  captureIo,
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

// Regression for Looted/kibi#285: per-contract binding used to load every
// test with its full receipt history in a single findall. Once a store's
// histories crossed the 8 MiB bounded output, that answer overflowed, the
// engine's SWI session was terminated, and coverage / proof impact failed
// with "Predicate or file not found". This store is deliberately larger than
// the cap.

const TEST_COUNT = 40;
const RECEIPTS_PER_TEST = 220;

const roots: string[] = [];
const restores: Array<() => void> = [];
const processes: PrologProcess[] = [];

const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-LARGE", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

function testId(index: number): string {
  return `TEST-LARGE-${String(index).padStart(3, "0")}`;
}

function sourceDocument(id: string): string {
  return `---
id: ${id}
title: ${id} large receipt store
type: test
status: active
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-LARGE
      target: default
  success_policy: all_required_first_attempt
---

# ${id} body
`;
}

function proofReceipt(index: number, id: string): Record<string, unknown> {
  const hash = index.toString(16).padStart(64, "0");
  const timestamp = new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString();
  return {
    version: "kibi.proof-receipt.v1",
    receipt_id: `PR-${hash.slice(-16)}`,
    test_id: id,
    scope: "end_to_end",
    outcome: "passed",
    code_snapshot: hash,
    environment_hash: hash,
    started_at: timestamp,
    finished_at: timestamp,
    artifact_digest: hash,
    contract_hash: hash,
    fingerprint: hash,
    binding_hash: hash,
    fingerprint_components: {
      contract: hash,
      integration: hash,
      command: hash,
      bindings: hash,
      producer: hash,
    },
    integration_id: "self-proof",
    producer: { name: "large-store-test" },
    command_argv: ["large-store-test"],
    run_outcome: "passed",
    proof_results: [],
  };
}

async function attachedStore(root: string): Promise<PrologProcess> {
  const attachment = resolveBranchAttachment(root);
  if ("error" in attachment) throw new Error(attachment.error);
  const prolog = new PrologProcess({ oneShot: false, timeout: 120_000 });
  processes.push(prolog);
  await prolog.start();
  const attached = await prolog.query(
    `kb_attach(${toPrologString(attachment.storePath)})`,
  );
  if (!attached.success) throw new Error(attached.error ?? "kb_attach failed");
  return prolog;
}

async function closeStore(prolog: PrologProcess): Promise<void> {
  await prolog.query("kb_detach").catch(() => undefined);
  await prolog.terminate();
  const index = processes.indexOf(prolog);
  if (index >= 0) processes.splice(index, 1);
}

async function stopEngine(root: string): Promise<void> {
  try {
    await withCwd(root, () => engineStopCommand());
  } catch {
    // A command may already have closed its engine.
  }
}

function contextFor(root: string, prolog: PrologProcess): OperationContext {
  const attachment = resolveBranchAttachment(root);
  if ("error" in attachment) throw new Error(attachment.error);
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-26T00:00:00.000Z"),
    prolog: prolog as unknown as PrologPort,
    fs: nodeFilesystem,
    branchAttachment: attachment,
  };
}

async function seedLargeStore(root: string): Promise<void> {
  mkdirSync(join(root, ".kb", "tests"), { recursive: true });
  for (let index = 0; index < TEST_COUNT; index += 1) {
    const id = testId(index);
    writeFileSync(join(root, ".kb", "tests", `${id}.md`), sourceDocument(id));
  }
  mkdirSync(join(root, "proof"), { recursive: true });
  writeFileSync(
    join(root, "proof", "baseline.json"),
    `${JSON.stringify({ version: "kibi.proof-baseline.v2", mode: "equality", currentRequirements: 0, proofProven: 0, currentUnproven: 0, trackedGaps: {}, requirements: {} }, null, 2)}\n`,
  );
  git(root, "add .kb/tests proof/baseline.json");
  git(root, "commit -m 'large receipt store sources'");

  const prolog = await attachedStore(root);
  try {
    for (let index = 0; index < TEST_COUNT; index += 1) {
      const id = testId(index);
      const receipts = Array.from({ length: RECEIPTS_PER_TEST }, (_, n) =>
        proofReceipt(index * RECEIPTS_PER_TEST + n, id),
      );
      const fields = [
        `id=${toPrologAtom(id)}`,
        `title=${toPrologString(`${id} large receipt store`)}`,
        "status=active",
        `created_at=${toPrologString("2026-09-26T00:00:00.000Z")}`,
        `updated_at=${toPrologString("2026-09-26T00:00:00.000Z")}`,
        `source=${toPrologString(`.kb/tests/${id}.md`)}`,
        "verification_scope=end_to_end",
        `proof_contract=${toPrologString(JSON.stringify(contract))}`,
        `proof_bindings=${toPrologString(JSON.stringify([{ symbol_id: "SYM-LARGE" }]))}`,
        `proof_receipts=${toPrologString(JSON.stringify(receipts))}`,
      ];
      const asserted = await prolog.query(
        `kb_assert_entity(test, [${fields.join(", ")}])`,
      );
      if (!asserted.success)
        throw new Error(asserted.error ?? "kb_assert_entity failed");
    }
    const saved = await prolog.query("kb_save");
    if (!saved.success) throw new Error(saved.error ?? "kb_save failed");
  } finally {
    await closeStore(prolog);
  }
}

afterEach(async () => {
  for (const prolog of processes.splice(0)) {
    await prolog.terminate().catch(() => undefined);
  }
  restoreWorkspaceCwd();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    await stopEngine(root);
    removeTempDir(root);
  }
});

describe("proof reporting on a receipt store larger than the Prolog output cap", () => {
  test("coverage and proof impact succeed and per-contract bindings match full entities", async () => {
    const root = createGitWorkspace("main");
    roots.push(root);
    restores.push(isolateKibiEnv());
    await withCwd(root, () => initCommand({}));
    ensureBranchStoreManifest(root, "main");
    await seedLargeStore(root);

    // The pre-fix binding goal: every test with its full receipt history.
    const probe = await attachedStore(root);
    const unbounded = await probe.query(
      "findall([Id,'test',Props], kb_entity(Id,'test',Props), Results)",
    );
    expect(unbounded.success).toBe(false);
    expect(unbounded.error).toContain("ENOBUFS");
    await probe.terminate();
    processes.splice(processes.indexOf(probe), 1);

    const io = captureIo({ stdio: true });
    restores.push(io.restore);
    await withCwd(root, () => coverageCommand({ format: "json", limit: "3" }));
    const impact = await withCwd(root, () =>
      proofImpactCommand({ json: true }),
    );
    expect(impact.exitCode).toBe(0);
    const output = io.stdout.join("") + io.stderr.join("");
    expect(output).not.toMatch(/Predicate or file not found|ENOBUFS/);
    await stopEngine(root);

    const prolog = await attachedStore(root);
    const context = contextFor(root, prolog);
    const projected = await perContractTestBindings(context);

    // Expected: the pre-fix algorithm over full entities, paged so that the
    // reference computation itself stays under the cap.
    const manifestPath = join(root, ".kb", "symbols.yaml");
    const entries: string[] = [];
    const full: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 4) {
      const page = await loadEntities(prolog as unknown as PrologPort, {
        type: "test",
        limit: 4,
        offset,
      });
      full.push(...page);
      if (page.length < 4) break;
    }
    expect(full).toHaveLength(TEST_COUNT);
    for (const entity of full) {
      const id = String(entity.id);
      const source = String(entity.source);
      const authored = await nodeFilesystem.readFile(join(root, source));
      const stripped = removeFrontmatterBlock(authored, "proof_receipts");
      const bound = (entity.proof_bindings as { symbol_id: string }[]).map(
        (binding) => binding.symbol_id,
      );
      const binding = receiptBindingHash(
        entity.proof_contract as never,
        stripped ?? authored,
        resolveBoundSymbolScope(manifestPath, bound),
      );
      entries.push(`${toPrologAtom(id)}: ${toPrologAtom(binding)}`);
    }
    const sortEntries = (dict: string | null): string[] =>
      (dict ?? "")
        .replace(/^_\{|\}$/g, "")
        .split(", ")
        .sort();
    expect(projected).not.toBeNull();
    expect(sortEntries(projected)).toEqual(
      sortEntries(`_{${entries.join(", ")}}`),
    );
    expect(sortEntries(projected)).toHaveLength(TEST_COUNT);
  }, 300_000);
});
