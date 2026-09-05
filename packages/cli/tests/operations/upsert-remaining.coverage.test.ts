// implements REQ-011, REQ-014
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { OperationError } from "../../src/cli-errors.js";
import * as manifestModule from "../../src/extractors/manifest.js";
import {
  effectiveRelationships,
  executeUpsert,
  validateAppendOnlyProofReceipts,
} from "../../src/operations/mutation/upsert.js";
import * as relationshipsModule from "../../src/operations/mutation/relationships.js";
import * as sourceAuthoring from "../../src/operations/mutation/source-authoring.js";
import * as symbolRefresh from "../../src/operations/mutation/symbol-refresh.js";
import {
  isAllowedGranularityReason,
  validateUpsertInput,
} from "../../src/operations/mutation/validation.js";
import * as warningsModule from "../../src/operations/mutation/warnings.js";
import * as advisorModule from "../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import * as discoveryEntities from "../../src/public/operations/discovery-entities.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import * as shardsModule from "../../src/relationships/shards.js";
import * as branchResolver from "../../src/utils/branch-resolver.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const tempDirs: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];
let restoreEnv: (() => void) | undefined;

function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-upsert-remaining-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, ".kb"), { recursive: true });
  return dir;
}

function attachment(workspaceRoot: string, migrationRequired = false) {
  return {
    gitBranch: "develop",
    kbBranch: migrationRequired ? "legacy" : "develop",
    storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
    kind: "exact" as const,
    migrationRequired,
  };
}

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => Promise<PrologQueryResult> | PrologQueryResult,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async (goal) => query(Array.isArray(goal) ? goal.join(", ") : goal),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
    invalidateCache: extras.prolog?.invalidateCache,
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    prolog,
    branchAttachment: attachment(workspaceRoot),
    ...extras,
    prolog: extras.prolog ?? prolog,
  };
}

function commitQuery(
  changeKind = "created",
  extra?: (goal: string) => PrologQueryResult | undefined,
): (goal: string) => PrologQueryResult {
  return (goal) => {
    const override = extra?.(goal);
    if (override) return override;
    if (goal.startsWith("kb_commit_upsert(")) {
      return { success: true, bindings: { ChangeKind: changeKind } };
    }
    return { success: true, bindings: { Results: "[]" } };
  };
}

const proofReceipt = {
  version: "kibi.proof-receipt.v1",
  receipt_id: "PR-REMAIN-000001",
  test_id: "TEST-REMAIN",
  scope: "end_to_end",
  outcome: "passed",
  code_snapshot: "a".repeat(64),
  environment_hash: "b".repeat(64),
  started_at: "2026-07-21T11:55:00.000Z",
  finished_at: "2026-07-21T12:00:00.000Z",
  artifact_digest: "c".repeat(64),
  contract_hash: "d".repeat(64),
  fingerprint: "e".repeat(64),
  fingerprint_components: {
    contract: "1a".repeat(32),
    integration: "2a".repeat(32),
    command: "3a".repeat(32),
    bindings: "4a".repeat(32),
    producer: "5a".repeat(32),
  },
  integration_id: "self-proof",
  producer: { name: "kibi-command-producer" },
  command_argv: ["node", "scripts/proof.mjs"],
  run_outcome: "passed",
  proof_results: [
    {
      symbol_id: "SYM-REMAIN",
      target: "default",
      outcome: "passed",
      binding: "aggregate_run",
      attempts: { status: "unavailable" },
    },
  ],
} as const;

const analyzeSemanticAdvisorInputOriginal =
  advisorModule.analyzeSemanticAdvisorInput;

beforeEach(() => {
  restoreEnv = isolateKibiEnv();
});

afterEach(() => {
  while (spies.length > 0) {
    spies.pop()?.mockRestore();
  }
  restoreEnv?.();
  restoreEnv = undefined;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) removeTempDir(dir);
  }
});

describe("validateUpsertInput remaining branches", () => {
  test("rejects missing type or id", () => {
    // implements REQ-011
    expect(() =>
      validateUpsertInput(
        { type: "", id: "REQ-1", properties: { title: "T", status: "open" } },
        new Date("2026-09-05T00:00:00.000Z"),
      ),
    ).toThrow(/'type' and 'id' are required/);
    expect(() =>
      validateUpsertInput(
        { type: "req", id: "", properties: { title: "T", status: "open" } },
        new Date("2026-09-05T00:00:00.000Z"),
      ),
    ).toThrow(/'type' and 'id' are required/);
  });

  test("defaults created_at, updated_at, and source", () => {
    // implements REQ-011
    const now = new Date("2026-09-05T00:00:00.000Z");
    const validated = validateUpsertInput(
      { type: "req", id: "REQ-DEFAULTS", properties: { title: "Defaults", status: "open" } },
      now,
    );
    expect(validated.entity.created_at).toBe(now.toISOString());
    expect(validated.entity.updated_at).toBe(now.toISOString());
    expect(validated.entity.source).toBe("mcp://kibi/upsert");
    expect(validated.relationships).toEqual([]);
  });

  test("formats additionalProperties, aliases, enums, and next-action hints", () => {
    // implements REQ-011
    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-VALUE",
          properties: { title: "Value", status: "open", value: "held" },
        },
        new Date(),
      ),
    ).toThrow(/unknown property 'value'[\s\S]*value_string[\s\S]*kb_model_requirement/);

    expect(() =>
      validateUpsertInput(
        {
          type: "fact",
          id: "FACT-ALIAS",
          properties: {
            title: "Alias",
            status: "active",
            fact_kind: "observation",
            subjectKey: "session",
          },
        },
        new Date(),
      ),
    ).toThrow(/Did you mean 'subject_key'[\s\S]*snake_case[\s\S]*kb_model_requirement/);

    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-UNKNOWN",
          properties: { title: "Unknown", status: "open", notAField: true },
        },
        new Date(),
      ),
    ).toThrow(/unknown property 'notAField'|must NOT have additional properties/);

    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-ENUM",
          properties: { title: "Enum", status: "not-a-status" },
        },
        new Date(),
      ),
    ).toThrow(/Allowed values:[\s\S]*open/);

    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-TYPE",
          properties: { title: 12, status: "open" },
        },
        new Date(),
      ),
    ).toThrow(/title: must be string/);
  });

  test("rejects invalid proof receipts and mismatched claim keys", () => {
    // implements REQ-011
    expect(() =>
      validateUpsertInput(
        {
          type: "test",
          id: "TEST-REMAIN",
          properties: {
            title: "Receipts",
            status: "active",
            verification_scope: "end_to_end",
            proof_receipts: [
              proofReceipt,
              { ...proofReceipt, receipt_id: "PR-REMAIN-000002", test_id: "TEST-OTHER" },
              "skip-me",
              null,
              ["array"],
            ],
          },
        },
        new Date(),
      ),
    ).toThrow(/Entity validation failed/);

    expect(() =>
      validateUpsertInput(
        {
          type: "test",
          id: "TEST-REMAIN",
          properties: {
            title: "Dup",
            status: "active",
            verification_scope: "end_to_end",
            proof_receipts: [proofReceipt, { ...proofReceipt, finished_at: "2026-07-21T12:05:00.000Z" }],
          },
        },
        new Date(),
      ),
    ).toThrow(/receipt_id duplicates|Entity validation failed/);

    const claimText = "Checkout requires payment before submission.";
    expect(() =>
      validateUpsertInput(
        {
          type: "fact",
          id: "FACT-CLAIM",
          properties: {
            title: "Claim",
            status: "active",
            fact_kind: "observation",
            claim_text: claimText,
            claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
          },
        },
        new Date(),
      ),
    ).toThrow(/claim_key must equal the stable key/);

    const receipts = validateUpsertInput(
      {
        type: "test",
        id: "TEST-REMAIN",
        properties: {
          title: "Receipts ok",
          status: "active",
          verification_scope: "end_to_end",
          proof_receipts: [proofReceipt],
        },
      },
      new Date(),
    );
    expect(receipts.entity.proof_receipts).toHaveLength(1);

    const matched = validateUpsertInput(
      {
        type: "fact",
        id: "FACT-CLAIM-OK",
        properties: {
          title: "Claim ok",
          status: "active",
          fact_kind: "observation",
          claim_text: claimText,
          claim_key: semanticClaimKey(claimText),
        },
      },
      new Date(),
    );
    expect(matched.entity.claim_key).toBe(semanticClaimKey(claimText));
  });

  test("rejects invalid relationships and re-exports granularity reasons", () => {
    // implements REQ-011
    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-REL",
          properties: { title: "Rel", status: "open" },
          relationships: [{ type: "not_a_type", from: "REQ-REL", to: "TEST-1" }],
        },
        new Date(),
      ),
    ).toThrow(/Relationship validation failed at index 0/);

    expect(() =>
      validateUpsertInput(
        {
          type: "req",
          id: "REQ-REL-2",
          properties: { title: "Rel", status: "open" },
          relationships: [{ type: "relates_to", from: "REQ-REL-2" }],
        },
        new Date(),
      ),
    ).toThrow(/Relationship validation failed at index 0/);

    expect(isAllowedGranularityReason("test-suite")).toBe(true);
    expect(isAllowedGranularityReason("not-a-reason")).toBe(false);
  });
});

describe("validateAppendOnlyProofReceipts remaining branches", () => {
  test("requires Prolog and treats non-array receipt history as empty", async () => {
    // implements REQ-011
    await expect(
      validateAppendOnlyProofReceipts(
        { id: "TEST-NOPROLOG", type: "test" },
        {
          workspaceRoot: "/tmp",
          signal: new AbortController().signal,
          clock: () => new Date(),
        },
      ),
    ).rejects.toThrow(/Prolog runtime/);

    track(
      spyOn(discoveryEntities, "loadEntities").mockResolvedValue([
        { id: "TEST-REMAIN", type: "test", proof_receipts: "not-an-array" },
      ]),
    );
    await validateAppendOnlyProofReceipts(
      { id: "TEST-REMAIN", type: "test" },
      contextFor("/tmp", async () => ({ success: true, bindings: {} })),
    );
  });

  test("filters mixed receipt records and rejects removed history", async () => {
    // implements REQ-011
    const previous = [
      null,
      "skip",
      ["array"],
      { version: "kibi.proof-receipt.v1", receipt_id: "PR-1" },
    ];
    track(
      spyOn(discoveryEntities, "loadEntities").mockResolvedValue([
        { id: "TEST-REMAIN", type: "test", proof_receipts: previous },
      ]),
    );
    await validateAppendOnlyProofReceipts(
      {
        id: "TEST-REMAIN",
        type: "test",
        proof_receipts: [
          { version: "kibi.proof-receipt.v1", receipt_id: "PR-1" },
          { version: "kibi.proof-receipt.v1", receipt_id: "PR-2" },
        ],
      },
      contextFor("/tmp", async () => ({ success: true, bindings: {} })),
    );

    await expect(
      validateAppendOnlyProofReceipts(
        { id: "TEST-REMAIN", type: "test" },
        contextFor("/tmp", async () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/append-only/);
  });
});

describe("effectiveRelationships remaining branches", () => {
  test("keeps outgoing edges and drops incoming copies", async () => {
    // implements REQ-011
    track(
      spyOn(relationshipsModule, "existingRelationships").mockResolvedValue([
        { type: "relates_to", from: "REQ-MERGE", to: "REQ-A" },
        { type: "verified_by", from: "TEST-IN", to: "REQ-MERGE" },
        {
          type: "relates_to",
          from: "REQ-MERGE",
          to: "REQ-A",
          metadata: { stale: true },
        },
      ]),
    );
    const input = {
      type: "req",
      id: "REQ-MERGE",
      properties: {},
      relationships: [
        {
          type: "relates_to",
          from: "REQ-MERGE",
          to: "REQ-A",
          metadata: { source: "explicit" },
        },
      ],
    };
    const merged = await effectiveRelationships(
      input,
      { id: "REQ-MERGE", type: "req" },
      input.relationships,
      contextFor("/tmp", async (goal) =>
        goal.includes("once(kb_entity")
          ? { success: true, bindings: {} }
          : { success: true, bindings: { Results: "[]" } },
      ),
    );
    expect(merged).toEqual([
      {
        type: "relates_to",
        from: "REQ-MERGE",
        to: "REQ-A",
        metadata: { source: "explicit" },
      },
    ]);
  });
});

describe("executeUpsert remaining runtime branches", () => {
  test("resolves branch attachment and blocks resolver-reported legacy storage", async () => {
    // implements REQ-014
    const gitRoot = createGitWorkspace();
    tempDirs.push(gitRoot);
    const created = await executeUpsert(
      {
        type: "req",
        id: "REQ-RESOLVE",
        properties: { title: "Resolve", status: "open" },
      },
      {
        workspaceRoot: gitRoot,
        signal: new AbortController().signal,
        clock: () => new Date("2026-09-05T00:00:00.000Z"),
        prolog: {
          query: async (goal) =>
            String(goal).startsWith("kb_commit_upsert(")
              ? { success: true, bindings: { ChangeKind: '"updated"' } }
              : { success: true, bindings: { Results: "[]" } },
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      },
    );
    expect(created.structuredContent?.updated).toBe(1);

    const root = makeTempDir();
    track(
      spyOn(branchResolver, "resolveBranchAttachment").mockReturnValue({
        gitBranch: "develop",
        kbBranch: "legacy",
        storePath: path.join(root, ".kb", "branches", "legacy"),
        kind: "legacy_compat",
        migrationRequired: true,
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-MIGRATE-FS",
          properties: { title: "Migrate", status: "open" },
        },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00.000Z"),
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
          fs: nodeFilesystem,
        },
      ),
    ).rejects.toThrow(/legacy branch storage/);
  });

  test("skips incomplete relationship tuples and escaped shard paths", async () => {
    // implements REQ-014
    const root = makeTempDir();
    track(
      spyOn(relationshipsModule, "validateRelationshipSources").mockImplementation(
        () => undefined,
      ),
    );
    track(
      spyOn(relationshipsModule, "validateStrictLanePairing").mockResolvedValue(undefined),
    );
    track(
      spyOn(relationshipsModule, "validateLiveRelationshipTargets").mockResolvedValue(
        undefined,
      ),
    );
    track(
      spyOn(relationshipsModule, "validateSupersedesSourceHistory").mockResolvedValue(
        undefined,
      ),
    );
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-INCOMPLETE",
        properties: { title: "Incomplete", status: "open" },
        relationships: [
          { type: "relates_to", from: "REQ-INCOMPLETE", to: "" },
          { type: "relates_to", from: "REQ-INCOMPLETE", to: "REQ-OK" },
        ],
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem, sourceFirst: false }),
    );
    expect(result.structuredContent?.relationships_created).toBe(2);

    track(
      spyOn(shardsModule, "computeShardPath").mockReturnValue("/tmp/escaped-outside.yaml"),
    );
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-ESCAPE",
          properties: { title: "Escape", status: "open" },
          relationships: [{ type: "relates_to", from: "REQ-ESCAPE", to: "REQ-TO" }],
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem, sourceFirst: false }),
      ),
    ).rejects.toThrow(/escapes the canonical workspace lane/);
  });

  test("restores an existing shard, skips drifted hashes, and swallows unlink failures", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const shardDir = path.join(root, ".kb", "relationships");
    mkdirSync(shardDir, { recursive: true });
    const shardPath = shardsModule.computeShardPath(path.join(root, ".kb"), "REQ-RESTORE");
    writeFileSync(shardPath, "relationships: []\n", "utf8");
    const original = readFileSync(shardPath, "utf8");

    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-RESTORE",
          properties: { title: "Restore", status: "open" },
          relationships: [{ type: "relates_to", from: "REQ-RESTORE", to: "REQ-TO" }],
        },
        contextFor(
          root,
          (goal) =>
            goal.startsWith("kb_commit_upsert(")
              ? { success: false, bindings: {}, error: "restore-me" }
              : { success: true, bindings: { Results: "[]" } },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/restore-me/);
    expect(readFileSync(shardPath, "utf8")).toBe(original);

    let failHash = false;
    const exists = existsSync;
    track(
      spyOn(fs, "existsSync").mockImplementation((target) => {
        if (failHash && String(target) === shardPath) {
          throw new Error("stat exploded");
        }
        return exists(target);
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-RESTORE",
          properties: { title: "Restore", status: "open" },
          relationships: [{ type: "relates_to", from: "REQ-RESTORE", to: "REQ-TO" }],
        },
        contextFor(
          root,
          (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              failHash = true;
              return { success: false, bindings: {}, error: "hash-miss" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/hash-miss/);

    failHash = false;
    const unlink = unlinkSync;
    track(
      spyOn(fs, "unlinkSync").mockImplementation((target) => {
        if (String(target) === shardPath) throw new Error("already gone");
        return unlink(target);
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-UNLINK",
          properties: { title: "Unlink", status: "open" },
          relationships: [{ type: "relates_to", from: "REQ-UNLINK", to: "REQ-TO" }],
        },
        contextFor(
          root,
          (goal) =>
            goal.startsWith("kb_commit_upsert(")
              ? { success: false, bindings: {}, error: "unlink-path" }
              : { success: true, bindings: { Results: "[]" } },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/unlink-path/);
  });

  test("swallows a second shard restore failure after commit abort", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const shardPath = shardsModule.computeShardPath(path.join(root, ".kb"), "REQ-CATCH");
    mkdirSync(path.dirname(shardPath), { recursive: true });
    writeFileSync(shardPath, "relationships: []\n", "utf8");
    let failWrite = false;
    const write = writeFileSync;
    track(
      spyOn(fs, "writeFileSync").mockImplementation(((target, data, options) => {
        if (failWrite && String(target) === shardPath) {
          throw new Error("restore write blocked");
        }
        return write(target, data, options);
      }) as typeof writeFileSync),
    );
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-CATCH",
          properties: { title: "Catch", status: "open" },
          relationships: [{ type: "relates_to", from: "REQ-CATCH", to: "REQ-TO" }],
        },
        contextFor(
          root,
          (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              failWrite = true;
              return { success: false, bindings: {}, error: "commit-then-restore" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem, sourceFirst: false },
        ),
      ),
    ).rejects.toThrow(/commit-then-restore|restore write blocked|Upsert execution failed/);
  });

  test("skips source writes that return null and authors existing mdx sources", async () => {
    // implements REQ-014
    const root = makeTempDir();
    track(spyOn(sourceAuthoring, "writeSourceForUpsert").mockResolvedValue(null));
    const skipped = await executeUpsert(
      {
        type: "req",
        id: "REQ-NULL-SRC",
        properties: { title: "Null src", status: "open" },
        document: { path: "docs/REQ-NULL-SRC.md", body: "unused\n" },
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem }),
    );
    expect(skipped.structuredContent?.sourceWrites).toBeUndefined();

    spies.pop()?.mockRestore();
    const mdx = await executeUpsert(
      {
        type: "req",
        id: "REQ-MDX",
        properties: { title: "Mdx", status: "open" },
      },
      contextFor(
        root,
        commitQuery("updated", (goal) => {
          if (goal.includes("findall(") && goal.includes("kb_entity(")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['REQ-MDX',req,[id='REQ-MDX',type=req,title='Mdx',status=open,source='docs/REQ-MDX.mdx']]]",
              },
            };
          }
          return undefined;
        }),
        { fs: nodeFilesystem },
      ),
    );
    expect(mdx.structuredContent?.updated).toBe(1);
    expect(existsSync(path.join(root, "docs", "REQ-MDX.mdx"))).toBe(true);
  });

  test("rethrows OperationError for unsupported json sources and traversal paths", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const jsonExisting = await executeUpsert(
      {
        type: "req",
        id: "REQ-JSON-EXIST",
        properties: { title: "Json exist", status: "open" },
      },
      contextFor(
        root,
        commitQuery("updated", (goal) => {
          if (goal.includes("findall(") && goal.includes("kb_entity(")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['REQ-JSON-EXIST',req,[id='REQ-JSON-EXIST',type=req,title='Json exist',status=open,source='docs/REQ-JSON-EXIST.json']]]",
              },
            };
          }
          return undefined;
        }),
        { fs: nodeFilesystem },
      ),
    );
    expect(jsonExisting.structuredContent?.updated).toBe(1);
    expect(existsSync(path.join(root, ".kb", "requirements", "REQ-JSON-EXIST.md"))).toBe(
      true,
    );

    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-JSON",
          properties: { title: "Json", status: "open" },
          document: { path: "docs/REQ-JSON.json", body: "{}\n" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toBeInstanceOf(OperationError);

    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-TRAVERSE",
          properties: { title: "Traverse", status: "open" },
          document: { path: "../outside.md", body: "nope\n" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toBeInstanceOf(OperationError);
  });

  test("publishes both document and relationship source writes", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-BOTH",
        properties: { title: "Both", status: "open" },
        document: { path: "docs/REQ-BOTH.md", body: "must keep both lanes\n" },
        relationships: [{ type: "relates_to", from: "REQ-BOTH", to: "REQ-PEER" }],
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem }),
    );
    const paths = result.structuredContent?.sourceWrites?.map((row) => row.path) ?? [];
    expect(paths).toContain("docs/REQ-BOTH.md");
    expect(paths.some((item) => item.startsWith(".kb/relationships/"))).toBe(true);
    expect(result.structuredContent?.contradictionCheck?.outcome).toBe("no-conflict");
  });

  test("skips unchanged or missing shard hashes and records modeled readiness", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const shardPath = shardsModule.computeShardPath(path.join(root, ".kb"), "REQ-SAME");
    mkdirSync(path.dirname(shardPath), { recursive: true });
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "relates_to",
      from: "REQ-SAME",
      to: "REQ-PEER",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://same",
    });
    const unchanged = await executeUpsert(
      {
        type: "req",
        id: "REQ-SAME",
        properties: { title: "Same", status: "open" },
        relationships: [{ type: "relates_to", from: "REQ-SAME", to: "REQ-PEER" }],
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem, sourceFirst: false }),
    );
    expect(
      unchanged.structuredContent?.sourceWrites?.some((row) =>
        row.path.startsWith(".kb/relationships/"),
      ),
    ).toBeFalsy();

    track(
      spyOn(warningsModule, "scenarioCoverageWarnings").mockImplementation(async () => {
        const relDir = path.join(root, ".kb", "relationships");
        if (existsSync(relDir)) {
          for (const name of readdirSync(relDir)) {
            if (name.endsWith(".yaml")) unlinkSync(path.join(relDir, name));
          }
        }
        return ["coverage note"];
      }),
    );
    const missing = await executeUpsert(
      {
        type: "req",
        id: "REQ-MISSING-HASH",
        properties: { title: "Missing hash", status: "open" },
        relationships: [{ type: "relates_to", from: "REQ-MISSING-HASH", to: "REQ-PEER" }],
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem, sourceFirst: false }),
    );
    expect(missing.structuredContent?.warnings).toContain("coverage note");

    track(
      spyOn(advisorModule, "analyzeSemanticAdvisorInput").mockImplementation((input) => {
        const base = analyzeSemanticAdvisorInputOriginal(input);
        return {
          ...base,
          receipt: { ...base.receipt, logic_readiness: "modeled" },
        };
      }),
    );
    const modeled = await executeUpsert(
      {
        type: "req",
        id: "REQ-MODELED",
        properties: { title: "Modeled", status: "open" },
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem, sourceFirst: false }),
    );
    expect(modeled.structuredContent?.contradictionCheck?.strict_readiness).toBe(
      "modeled",
    );
  });

  test("invalidates the Prolog cache and wraps non-Error failures", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const invalidateCache = spyOn({ fn: () => undefined }, "fn").mockImplementation(
      () => undefined,
    );
    const result = await executeUpsert(
      {
        type: "scenario",
        id: "SCEN-CACHE",
        properties: { title: "Cache", status: "open" },
      },
      contextFor(root, commitQuery(), {
        prolog: {
          query: async (goal) =>
            String(goal).startsWith("kb_commit_upsert(")
              ? { success: true, bindings: { ChangeKind: "created" } }
              : { success: true, bindings: { Results: "[]" } },
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
          invalidateCache,
        },
      }),
    );
    expect(result.structuredContent?.created).toBe(1);
    expect(invalidateCache).toHaveBeenCalled();

    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-NONERR",
          properties: { title: "Nonerr", status: "open" },
        },
        contextFor(root, () => {
          throw "bare-string";
        }),
      ),
    ).rejects.toThrow(/Upsert execution failed: bare-string/);
  });

  test("returns committed_with_repairs when a post-commit effect throws a non-Error", async () => {
    // implements REQ-014
    const root = makeTempDir();
    track(
      spyOn(warningsModule, "scenarioCoverageWarnings").mockRejectedValue("post-commit"),
    );
    const repaired = await executeUpsert(
      {
        type: "req",
        id: "REQ-POST",
        properties: { title: "Post", status: "open" },
      },
      contextFor(root, commitQuery("updated")),
    );
    expect(repaired.structuredContent?.status).toBe("committed_with_repairs");
    expect(repaired.structuredContent?.updated).toBe(1);
    expect(repaired.structuredContent?.warnings).toContain("post-commit");
  });

  test("refreshes canonical symbols and reports missing or unreadable manifests", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const publication = {
      path: path.join(root, ".kb", "symbol-coordinates.yaml"),
      beforeHash: null,
      afterHash: "aa".repeat(32),
      rollback() {},
    };
    track(
      spyOn(symbolRefresh, "refreshSymbolCoordinatesForManifest").mockResolvedValue({
        refreshed: true,
        found: true,
        outcome: "updated",
        publication,
      }),
    );
    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockReturnValue([
        { id: "SYM-OK", title: "Ok" },
      ]),
    );
    track(
      spyOn(manifestModule, "extractManifestSymbolRecords").mockReturnValue([
        {
          entity: {
            id: "SYM-OK",
            type: "symbol",
            title: "Ok",
            status: "active",
          },
          relationships: [],
          sourceFile: "src/ok.ts",
        },
      ] as never),
    );
    const created = await executeUpsert(
      {
        type: "symbol",
        id: "SYM-OK",
        properties: { title: "Ok", status: "active", sourceFile: "src/ok.ts" },
        document: { path: ".kb/symbols.yaml" },
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem }),
    );
    expect(created.structuredContent?.created).toBe(1);
    expect(existsSync(path.join(root, ".kb", ".symbol-compiler.lock"))).toBe(false);

    track(
      spyOn(symbolRefresh, "refreshSymbolCoordinatesForManifest").mockResolvedValue({
        refreshed: false,
        found: false,
        outcome: "not_found",
        publication,
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: "SYM-MISS",
          properties: { title: "Miss", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toThrow(/could not find SYM-MISS/);

    track(
      spyOn(symbolRefresh, "refreshSymbolCoordinatesForManifest").mockResolvedValue({
        refreshed: true,
        found: true,
        outcome: "removed",
        publication,
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: "SYM-REMOVED",
          properties: { title: "Removed", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toThrow(/could not find SYM-REMOVED/);
  });

  test("rethrows manifest compile failures and missing re-extracted records", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const publication = {
      path: path.join(root, ".kb", "symbol-coordinates.yaml"),
      beforeHash: null,
      afterHash: "bb".repeat(32),
      rollback() {},
    };
    track(
      spyOn(symbolRefresh, "refreshSymbolCoordinatesForManifest").mockResolvedValue({
        refreshed: true,
        found: true,
        outcome: "updated",
        publication,
      }),
    );
    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockImplementation(() => {
        throw new Error("overlay exploded");
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: "SYM-OVERLAY",
          properties: { title: "Overlay", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toThrow(/could not be compiled after coordinate refresh: overlay exploded/);

    spies.pop()?.mockRestore();
    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockImplementation(() => {
        throw "overlay-bare";
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: "SYM-OVERLAY-BARE",
          properties: { title: "Overlay bare", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toThrow(/overlay-bare/);

    spies.pop()?.mockRestore();
    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockReturnValue([
        { id: "SYM-OTHER", title: "Other" },
      ]),
    );
    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: "SYM-GONE",
          properties: { title: "Gone", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toThrow(/no longer contains SYM-GONE/);

    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockReturnValue([
        { id: "SYM-EMPTY", title: "Empty" },
      ]),
    );
    track(spyOn(manifestModule, "extractManifestSymbolRecords").mockReturnValue([]));
    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: "SYM-EMPTY",
          properties: { title: "Empty", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      ),
    ).rejects.toThrow(/no longer contains SYM-EMPTY/);
  });

  test("aggregates coordinate rollback failures and swallows source rollback errors", async () => {
    // implements REQ-014
    const root = makeTempDir();
    track(
      spyOn(symbolRefresh, "refreshSymbolCoordinatesForManifest").mockResolvedValue({
        refreshed: true,
        found: true,
        outcome: "updated",
        publication: {
          path: path.join(root, ".kb", "symbol-coordinates.yaml"),
          beforeHash: null,
          afterHash: "cc".repeat(32),
          rollback() {
            throw new Error("coordinate rollback blocked");
          },
        },
      }),
    );
    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockReturnValue([]),
    );
    let rollbackFailure: unknown;
    try {
      await executeUpsert(
        {
          type: "symbol",
          id: "SYM-ROLL",
          properties: { title: "Roll", status: "active" },
          document: { path: ".kb/symbols.yaml" },
        },
        contextFor(root, commitQuery(), { fs: nodeFilesystem }),
      );
    } catch (error) {
      rollbackFailure = error;
    }
    expect(rollbackFailure).toBeInstanceOf(AggregateError);
    expect(String(rollbackFailure)).toMatch(/coordinate artifact rollback failed/);

    track(
      spyOn(sourceAuthoring, "writeSourceForUpsert").mockResolvedValue({
        receipt: {
          path: "docs/REQ-ROLL.md",
          mode: "write",
          beforeHash: null,
          afterHash: "dd".repeat(32),
          created: true,
        },
        rollback: async () => {
          throw new Error("source rollback blocked");
        },
      }),
    );
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-ROLL-SRC",
          properties: { title: "Roll src", status: "open" },
          document: { path: "docs/REQ-ROLL.md", body: "body\n" },
        },
        contextFor(
          root,
          (goal) => {
            if (goal.startsWith("kb_commit_upsert(")) {
              return { success: false, bindings: {}, error: "commit-after-source" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem },
        ),
      ),
    ).rejects.toThrow(/source rollback blocked/);
  });

  test("re-extracts a canonical symbol without a sourceFile overlay", async () => {
    // implements REQ-014
    const root = makeTempDir();
    track(
      spyOn(symbolRefresh, "refreshSymbolCoordinatesForManifest").mockResolvedValue({
        refreshed: true,
        found: true,
        outcome: "updated",
        publication: {
          path: path.join(root, ".kb", "symbol-coordinates.yaml"),
          beforeHash: null,
          afterHash: "ee".repeat(32),
          rollback() {},
        },
      }),
    );
    track(
      spyOn(manifestModule, "readManifestWithCoordinateOverlay").mockReturnValue([
        { id: "SYM-NOSF", title: "No source file" },
      ]),
    );
    track(
      spyOn(manifestModule, "extractManifestSymbolRecords").mockReturnValue([
        {
          entity: {
            id: "SYM-NOSF",
            type: "symbol",
            title: "No source file",
            status: "active",
          },
          relationships: [],
        },
      ] as never),
    );
    const result = await executeUpsert(
      {
        type: "symbol",
        id: "SYM-NOSF",
        properties: { title: "No source file", status: "active" },
        document: { path: ".kb/symbols.yaml" },
      },
      contextFor(root, commitQuery(), { fs: nodeFilesystem }),
    );
    expect(result.structuredContent?.created).toBe(1);
  });
});
