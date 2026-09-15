import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import { proofMigrateLegacyCommand } from "../../src/commands/proof-migrate-legacy.js";
import { proofPruneCommand } from "../../src/commands/proof-prune.js";
import { syncCommand } from "../../src/commands/sync.js";
import { executeMigrateLegacyReceipts } from "../../src/operations/proof/migrate-legacy-receipts.js";
import { PrologProcess } from "../../src/prolog.js";
import { toPrologString } from "../../src/prolog/codec.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
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

const roots: string[] = [];
const restores: Array<() => void> = [];
const processes: PrologProcess[] = [];

const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-MAINTENANCE", target: "default" }],
  success_policy: "all_required_first_attempt",
} as const;

function sourceDocument(
  id: string,
  options: { readonly legacy?: boolean; readonly receipts?: boolean } = {},
): string {
  return `---
id: ${id}
title: ${id} maintenance test
type: test
status: active
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-MAINTENANCE
      target: default
  success_policy: all_required_first_attempt
${options.legacy ? "verification_receipts:\n  - legacy: true\n" : ""}${options.receipts ? "proof_receipts: []\n" : ""}---

# ${id} body
`;
}

function proofReceipt(index: number, testId: string): Record<string, unknown> {
  const timestamp = `2026-09-0${index}T00:00:00.000Z`;
  const hash = "a".repeat(64);
  return {
    version: "kibi.proof-receipt.v1",
    receipt_id: `PR-MAINT-${String(index).padStart(8, "0")}`,
    test_id: testId,
    scope: "end_to_end",
    outcome: "passed",
    code_snapshot: hash,
    environment_hash: hash,
    started_at: timestamp,
    finished_at: timestamp,
    artifact_digest: hash,
    contract_hash: hash,
    fingerprint: hash,
    fingerprint_components: {
      contract: hash,
      integration: hash,
      command: hash,
      bindings: hash,
      producer: hash,
    },
    integration_id: "maintenance-test",
    producer: { name: "maintenance-test" },
    command_argv: ["maintenance-test"],
    run_outcome: "passed",
    proof_results: [],
  };
}

function atom(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function attachedStore(root: string): Promise<PrologProcess> {
  const attachment = resolveBranchAttachment(root);
  if ("error" in attachment) throw new Error(attachment.error);
  const prolog = new PrologProcess({ oneShot: false, timeout: 30_000 });
  processes.push(prolog);
  await prolog.start();
  const attached = await prolog.query(
    `kb_attach(${toPrologString(attachment.storePath)})`,
  );
  if (!attached.success) throw new Error(attached.error ?? "kb_attach failed");
  return prolog;
}

async function closeStore(prolog: PrologProcess): Promise<void> {
  try {
    await prolog.query("kb_detach");
  } catch {
    // Cleanup is best-effort after a failed query.
  }
  await prolog.terminate();
  const index = processes.indexOf(prolog);
  if (index >= 0) processes.splice(index, 1);
}

async function seedEntity(
  root: string,
  input: {
    readonly id: string;
    readonly source: string;
    readonly legacy?: boolean;
    readonly receipts?: readonly Record<string, unknown>[];
  },
): Promise<void> {
  const prolog = await attachedStore(root);
  try {
    const fields = [
      `id=${atom(input.id)}`,
      `title=${toPrologString(`${input.id} maintenance test`)}`,
      "status=active",
      `created_at=${toPrologString("2026-09-07T00:00:00.000Z")}`,
      `updated_at=${toPrologString("2026-09-07T00:00:00.000Z")}`,
      `source=${toPrologString(input.source)}`,
      "verification_scope=end_to_end",
      `proof_contract=${toPrologString(JSON.stringify(contract))}`,
      ...(input.receipts !== undefined
        ? [`proof_receipts=${toPrologString(JSON.stringify(input.receipts))}`]
        : []),
    ];
    const asserted = await prolog.query(
      `kb_assert_entity(test, [${fields.join(", ")}])`,
    );
    if (!asserted.success)
      throw new Error(
        asserted.error ??
          `kb_assert_entity failed: ${JSON.stringify(asserted)}`,
      );
    if (input.legacy) {
      const legacy = await prolog.query(
        `kb:kb_graph(Graph), kb:entity_id_to_uri(${atom(input.id)}, URI), kb:store_property(URI, verification_receipts, ${toPrologString(JSON.stringify([{ legacy: true }]))}, Graph)`,
      );
      if (!legacy.success)
        throw new Error(legacy.error ?? "legacy receipt assertion failed");
    }
    const saved = await prolog.query("kb_save");
    if (!saved.success) throw new Error(saved.error ?? "kb_save failed");
  } finally {
    await closeStore(prolog);
  }
}

async function queryEntityProps(root: string, id: string): Promise<string> {
  const prolog = await attachedStore(root);
  try {
    const result = await prolog.query(`kb_entity(${atom(id)}, test, Props)`);
    if (!result.success) throw new Error(result.error ?? "kb_entity failed");
    return result.bindings.Props ?? "";
  } finally {
    await closeStore(prolog);
  }
}

async function workspace(): Promise<string> {
  const root = createGitWorkspace("main");
  roots.push(root);
  restores.push(isolateKibiEnv());
  await withCwd(root, () => initCommand({}));
  ensureBranchStoreManifest(root, "main");
  return root;
}

async function stopEngine(root: string): Promise<void> {
  try {
    await withCwd(root, () => engineStopCommand());
  } catch {
    // A command may already have closed its engine.
  }
}

function contextFor(
  root: string,
  prolog: PrologProcess,
  fs: FilesystemPort = nodeFilesystem,
): OperationContext {
  const attachment = resolveBranchAttachment(root);
  if ("error" in attachment) throw new Error(attachment.error);
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-07T00:00:00.000Z"),
    prolog: prolog as unknown as PrologPort,
    fs,
    branchAttachment: attachment,
  };
}

afterEach(async () => {
  for (const prolog of processes.splice(0)) {
    try {
      await prolog.query("kb_detach");
    } catch {
      // The process may already have stopped after a failed test.
    }
    await prolog.terminate();
  }
  restoreWorkspaceCwd();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Runtime-owned engines are best-effort cleanup after command failures.
    }
    removeTempDir(root);
  }
});

describe("proof maintenance real source and graph integration", () => {
  test("runs the migration command against a persisted graph and reloads its source", async () => {
    const root = await workspace();
    const id = "TEST-MAINT-COMMAND";
    const relative = `.kb/tests/${id}.md`;
    mkdirSync(`${root}/.kb/tests`, { recursive: true });
    writeFileSync(`${root}/${relative}`, sourceDocument(id, { legacy: true }));
    git(root, `add ${relative}`);
    git(root, "commit -m 'maintenance source'");
    await seedEntity(root, { id, source: relative, legacy: true });
    const io = captureIo({ stdio: true });
    restores.push(io.restore);

    await withCwd(root, () => proofMigrateLegacyCommand({ test: id }));
    await stopEngine(root);

    const after = readFileSync(`${root}/${relative}`, "utf8");
    expect(after).not.toContain("verification_receipts:");
    expect(after).toContain("# TEST-MAINT-COMMAND body");
    expect(io.stdout.join("")).toContain(
      `${id}: legacy verification_receipts removed`,
    );
    const synced = await withCwd(root, () =>
      syncCommand({ workspaceRoot: root }),
    );
    await stopEngine(root);
    expect(synced.success).toBe(true);
    expect(await queryEntityProps(root, id)).not.toContain(
      "verification_receipts",
    );
  }, 30_000);

  test("prunes persisted receipt history, preserves source body, and reloads the graph", async () => {
    const root = await workspace();
    const id = "TEST-MAINT-PRUNE";
    const relative = `.kb/tests/${id}.md`;
    mkdirSync(`${root}/.kb/tests`, { recursive: true });
    writeFileSync(
      `${root}/${relative}`,
      sourceDocument(id, { receipts: true }),
    );
    git(root, `add ${relative}`);
    git(root, "commit -m 'receipt source'");
    const receipts = [
      proofReceipt(1, id),
      proofReceipt(2, id),
      proofReceipt(3, id),
    ];
    await seedEntity(root, { id, source: relative, receipts });
    const io = captureIo({ stdio: true });
    restores.push(io.restore);

    await withCwd(root, () => proofPruneCommand({ test: id, keep: "1" }));
    await stopEngine(root);

    const after = readFileSync(`${root}/${relative}`, "utf8");
    expect(after).toContain("PR-MAINT-00000003");
    expect(after).not.toContain("PR-MAINT-00000001");
    expect(after).not.toContain("PR-MAINT-00000002");
    expect(after).toContain(`# ${id} body`);
    const synced = await withCwd(root, () =>
      syncCommand({ workspaceRoot: root }),
    );
    await stopEngine(root);
    expect(synced.success).toBe(true);
    const props = await queryEntityProps(root, id);
    expect(props).toContain("PR-MAINT-00000003");
    expect(props).not.toContain("PR-MAINT-00000001");
  }, 30_000);

  test("rolls back only the interrupted second source write after a real first migration commit", async () => {
    const root = await workspace();
    const firstId = "TEST-MAINT-FIRST";
    const secondId = "TEST-MAINT-SECOND";
    const firstSource = `.kb/tests/${firstId}.md`;
    const secondSource = `.kb/tests/${secondId}.md`;
    mkdirSync(`${root}/.kb/tests`, { recursive: true });
    writeFileSync(
      `${root}/${firstSource}`,
      sourceDocument(firstId, { legacy: true }),
    );
    writeFileSync(
      `${root}/${secondSource}`,
      sourceDocument(secondId, { legacy: true }),
    );
    git(root, `add ${firstSource} ${secondSource}`);
    git(root, "commit -m 'interruption sources'");
    await seedEntity(root, { id: firstId, source: firstSource, legacy: true });
    await seedEntity(root, {
      id: secondId,
      source: secondSource,
      legacy: true,
    });
    const prolog = await attachedStore(root);
    const publicationAttempts: string[] = [];
    const failingFs: FilesystemPort = {
      ...nodeFilesystem,
      writeFile: async (filePath, data) => {
        if (filePath.includes(".md.kibi-source-")) {
          publicationAttempts.push(filePath);
          if (publicationAttempts.length === 2) {
            throw new Error("maintenance interrupted");
          }
        }
        await nodeFilesystem.writeFile(filePath, data);
      },
    };

    await expect(
      executeMigrateLegacyReceipts({}, contextFor(root, prolog, failingFs)),
    ).rejects.toThrow(/maintenance interrupted/);
    await closeStore(prolog);
    expect(publicationAttempts).toHaveLength(2);
    const sourcePathFromPublication = (temporaryPath: string): string => {
      const marker = temporaryPath.indexOf(".md.kibi-source-");
      if (marker < 0)
        throw new Error(`unexpected publication path: ${temporaryPath}`);
      return temporaryPath.slice(0, marker + ".md".length);
    };
    const firstPublishedSource = sourcePathFromPublication(
      publicationAttempts[0] ?? "",
    );
    const interruptedSource = sourcePathFromPublication(
      publicationAttempts[1] ?? "",
    );
    expect(firstPublishedSource).not.toBe(interruptedSource);
    const firstPublishedId = firstPublishedSource.endsWith(`${firstId}.md`)
      ? firstId
      : secondId;
    const interruptedId = firstPublishedId === firstId ? secondId : firstId;
    expect(readFileSync(firstPublishedSource, "utf8")).not.toContain(
      "verification_receipts:",
    );
    expect(readFileSync(interruptedSource, "utf8")).toContain(
      "verification_receipts:",
    );
    expect(await queryEntityProps(root, firstPublishedId)).not.toContain(
      "verification_receipts",
    );
    expect(await queryEntityProps(root, interruptedId)).toContain(
      "verification_receipts",
    );
  }, 30_000);
});
