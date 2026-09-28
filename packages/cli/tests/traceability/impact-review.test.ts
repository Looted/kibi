import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { patchReceiptsIntoDocument } from "../../src/operations/proof/receipt-document.js";
import type { HostSourceAnalysisResultV2 } from "../../src/plugins/source-analysis-service.js";
import type { SourceChangeAnalysis } from "../../src/plugins/source-change-analysis.js";
import { nodeGit } from "../../src/public/operations/node-ports.js";
import { captureStagedSnapshot } from "../../src/traceability/git-change-snapshot.js";
import {
  createImpactReviewRecord,
  evaluateImpactReview,
  fingerprintImpactEvaluator,
  fingerprintImpactSchemaFiles,
  hasValidBaseImpactPolicy,
  loadBaseImpactPolicy,
  prepareImpactReview,
} from "../../src/traceability/impact-evaluator.js";
import {
  type Fingerprint,
  IMPACT_REVIEW_PATH,
  type ImpactDecision,
  parseImpactPolicy,
  parseImpactReviewRecord,
} from "../../src/traceability/impact-review.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const providerSet = `sha256:${"b".repeat(64)}` as Fingerprint;
const evaluator = `sha256:${"c".repeat(64)}` as Fingerprint;
const provider = "a".repeat(64);

function repo(
  options: {
    allowPartial?: boolean;
    allowUnsupported?: boolean;
    partialDiagnosticCode?: string;
    withImpactPolicy?: boolean;
  } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "kibi-impact-review-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  git("init", "-q");
  git("config", "user.name", "Impact Fixture");
  git("config", "user.email", "impact-fixture@example.invalid");
  const partial = options.allowPartial
    ? [
        {
          providerId: "test-provider",
          providerFingerprint: `sha256:${provider}`,
          diagnosticCode: options.partialDiagnosticCode ?? "dynamic_decorator",
          limitationClass: "dynamic-decorator",
        },
      ]
    : [];
  if (options.withImpactPolicy !== false)
    write(
      ".kibi/impact-policy.json",
      `${JSON.stringify(
        {
          contractVersion: "kibi.impact-policy.v1",
          id: "fixture-policy",
          version: "1",
          allowUnsupportedReview: options.allowUnsupported ?? false,
          allowedPartial: partial,
          notApplicablePaths: [],
        },
        null,
        2,
      )}\n`,
    );
  write(
    ".kb/requirements/REQ-impact.md",
    "---\nid: REQ-impact\ntitle: Preserve behavior\nstatus: open\nsemantic_source_field: semantic_text\nsemantic_text: Keep this behavior.\n---\nKeep this behavior.\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-service\n    title: Service.run\n    sourceFile: src/service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-impact\n",
  );
  write("src/service.ts", "export function run() { return 1; }\n");
  git("add", ".");
  git("commit", "-qm", "baseline");
  return { root, git, write };
}

function analysis(
  path: string,
  content: string,
  options: {
    status?: "ok" | "partial" | "unsupported" | "failed";
    code?: string;
  } = {},
): HostSourceAnalysisResultV2 {
  const status = options.status ?? "ok";
  const hash = createHash("sha256")
    .update(path)
    .update("\0")
    .update(content)
    .digest("hex");
  return {
    contractVersion: "kibi.symbol-extractor.v2" as const,
    status,
    sourceFile: path,
    language: "typescript",
    module: {
      title: "service",
      language: "typescript",
      analysisMode: "parser",
    },
    symbols: [],
    diagnostics:
      status === "ok"
        ? []
        : [
            {
              code:
                options.code ??
                (status === "partial"
                  ? "dynamic_decorator"
                  : `${status}_fixture`),
              message: "fixture diagnostic",
            },
          ],
    uncoveredRanges:
      status === "partial"
        ? [
            {
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 8,
              reason: "dynamic decorator",
            },
          ]
        : [],
    providerId: "test-provider",
    stamp: {
      pluginId: "fixture",
      pluginVersion: "1.0.0",
      capability: "kibi.symbol-extractor.v2",
      mode: "augment",
      external: false,
      network: false,
      metered: false,
    },
    inputFingerprint: hash,
    providerFingerprint: provider,
    shadowComparisons: [],
  };
}

function analysisMap(
  root: string,
  status: "ok" | "partial" | "unsupported" | "failed" = "ok",
  diagnosticCode?: string,
): Map<string, SourceChangeAnalysis> {
  void root;
  const base = "export function run() { return 1; }\n";
  const after = "export function run() { return 2; }\n";
  return new Map([
    [
      "src/service.ts",
      {
        path: "src/service.ts",
        before: analysis("src/service.ts", base),
        after: analysis("src/service.ts", after, {
          status,
          ...(diagnosticCode ? { code: diagnosticCode } : {}),
        }),
      },
    ],
  ]);
}

const stillCurrent: ImpactDecision = {
  kind: "impact",
  requirementIds: ["REQ-impact"],
  knowledge: {
    state: "still_current",
    rationale:
      "The existing requirement still accurately specifies the changed behavior.",
  },
};

function stageSource(f: ReturnType<typeof repo>) {
  f.write("src/service.ts", "export function run() { return 2; }\n");
  f.git("add", "src/service.ts");
}

function proofReceipt(testId: string, receiptId: string) {
  const hash = "a".repeat(64);
  return {
    version: "kibi.proof-receipt.v1",
    receipt_id: receiptId,
    test_id: testId,
    scope: "unit",
    outcome: "passed",
    code_snapshot: hash,
    environment_hash: hash,
    started_at: "2026-09-26T10:00:00.000Z",
    finished_at: "2026-09-26T10:00:01.000Z",
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
    integration_id: "fixture-integration",
    producer: { name: "fixture", version: "1" },
    command_argv: ["bun", "test"],
    run_outcome: "passed",
    proof_results: [],
  };
}

function stageReview(
  f: ReturnType<typeof repo>,
  analyses = analysisMap(f.root),
  decision: ImpactDecision = stillCurrent,
) {
  const initial = captureStagedSnapshot(f.root);
  const prepared = prepareImpactReview(initial, {
    analyses,
    providerSetFingerprint: providerSet,
    evaluatorFingerprint: evaluator,
  });
  const decisions = new Map(
    prepared.files.map((file) => [
      file.path,
      {
        decision:
          file.path === "src/service.ts"
            ? decision
            : ({
                kind: "no_impact",
                reason: "supporting-evidence",
                rationale:
                  "This metadata path is reviewed with its scoped source impact.",
              } as ImpactDecision),
      },
    ]),
  );
  const record = createImpactReviewRecord(
    prepared,
    decisions,
    "local-reviewer",
    "2026-09-26T10:00:00Z",
  );
  f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
  f.git("add", IMPACT_REVIEW_PATH);
  return { analyses, record };
}

function evaluate(
  f: ReturnType<typeof repo>,
  analyses = analysisMap(f.root),
  providerFingerprint = providerSet,
  evaluatorFingerprint = evaluator,
) {
  const snapshot = captureStagedSnapshot(f.root);
  return evaluateImpactReview(snapshot, {
    analyses,
    providerSetFingerprint: providerFingerprint,
    evaluatorFingerprint,
  });
}

describe("content-bound file impact review", () => {
  test("preparation and evaluation share successful parser depth promotion", () => {
    const f = repo();
    stageSource(f);
    const analyses = analysisMap(f.root);
    const initial = captureStagedSnapshot(f.root);
    const initialSource = initial.inventory.find(
      (file) => file.path === "src/service.ts",
    );
    expect(initialSource).toBeDefined();
    if (!initialSource) throw new Error("fixture source is missing");
    initialSource.analysisDepth = "file";
    initialSource.disposition = "advisory";

    const prepared = prepareImpactReview(initial, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const preparedSource = prepared.files.find(
      (file) => file.path === "src/service.ts",
    );
    expect(preparedSource?.analysisDepth).toBe("symbol");
    expect(preparedSource?.disposition).toBe("checked");
    const scopePayload = prepared.scopePayload;
    if (
      !scopePayload ||
      typeof scopePayload !== "object" ||
      !("files" in scopePayload) ||
      !Array.isArray(scopePayload.files)
    ) {
      throw new Error("prepared scope payload has no file inventory");
    }
    const scopeSource = scopePayload.files.find(
      (file) =>
        file && typeof file === "object" && file.path === "src/service.ts",
    ) as {
      analysisDepth?: string;
      disposition?: string;
    };
    expect(scopeSource.analysisDepth).toBe("symbol");
    expect(scopeSource.disposition).toBe("checked");
    const record = createImpactReviewRecord(
      prepared,
      new Map([["src/service.ts", { decision: stillCurrent }]]),
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    const finalSnapshot = captureStagedSnapshot(f.root);
    const finalSource = finalSnapshot.inventory.find(
      (file) => file.path === "src/service.ts",
    );
    expect(finalSource).toBeDefined();
    if (!finalSource) throw new Error("fixture source is missing");
    finalSource.analysisDepth = "file";
    finalSource.disposition = "advisory";

    expect(
      evaluateImpactReview(finalSnapshot, {
        analyses,
        providerSetFingerprint: providerSet,
        evaluatorFingerprint: evaluator,
      }).passed,
    ).toBe(true);
  });

  test("evaluator closure binds the entity normalization schema", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-impact-schema-closure-"));
    roots.push(root);
    const srcTraceability = join(root, "src/traceability");
    const srcSchemas = join(root, "src/schemas");
    const distSchemas = join(root, "dist/schemas");
    for (const directory of [srcTraceability, srcSchemas, distSchemas])
      mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(srcTraceability, "impact-policy.v1.schema.json"),
      "{}\n",
    );
    writeFileSync(join(srcTraceability, "impact-review.schema.json"), "{}\n");
    writeFileSync(
      join(srcSchemas, "entity.schema.json"),
      '{"title":"before"}\n',
    );
    writeFileSync(
      join(distSchemas, "entity.schema.json"),
      '{"title":"before"}\n',
    );
    const before = fingerprintImpactSchemaFiles([
      {
        label: "src",
        traceabilityDirectory: srcTraceability,
        schemaDirectory: srcSchemas,
      },
      {
        label: "dist",
        schemaDirectory: distSchemas,
      },
    ]);
    writeFileSync(
      join(distSchemas, "entity.schema.json"),
      '{"title":"after"}\n',
    );
    const after = fingerprintImpactSchemaFiles([
      {
        label: "src",
        traceabilityDirectory: srcTraceability,
        schemaDirectory: srcSchemas,
      },
      {
        label: "dist",
        schemaDirectory: distSchemas,
      },
    ]);
    expect(
      after.find((row) => row.path === "dist/schemas/entity.schema.json")
        ?.sha256,
    ).not.toBe(
      before.find((row) => row.path === "dist/schemas/entity.schema.json")
        ?.sha256,
    );
    expect(fingerprintImpactEvaluator()).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("baseline -> missing review blocks -> still_current review passes without cosmetic knowledge edits", () => {
    const f = repo();
    stageSource(f);
    expect(evaluate(f).passed).toBe(false);
    stageReview(f);
    const result = evaluate(f);
    expect(result.passed).toBe(true);
    expect(result.reviewerAuthority).toBe("self-claimed-local");
  });

  test("only the exact receipt path is excluded from scope", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    const receipt = JSON.parse(
      readFileSync(join(f.root, IMPACT_REVIEW_PATH), "utf8"),
    );
    receipt.reviewer.id = "a-second-local-self-claim";
    receipt.files[0].decision.knowledge.rationale =
      "Re-reviewed the whole changed source and its linked requirement.";
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f).passed).toBe(true);
    f.write(".kibi/adjacent.json", "{}\n");
    f.git("add", ".kibi/adjacent.json");
    const analyses = new Map(analysisMap(f.root));
    analyses.set(".kibi/adjacent.json", {
      path: ".kibi/adjacent.json",
      before: null,
      after: analysis(".kibi/adjacent.json", "{}\n"),
    });
    expect(evaluate(f, analyses).passed).toBe(false);
  });

  test("renaming another file into the receipt path cannot hide its removal", () => {
    const f = repo();
    f.write("src/review-seed.json", '{"seed":"do not exclude me"}\n');
    f.git("add", "src/review-seed.json");
    f.git("commit", "-qm", "seed review-looking file");
    f.git("mv", "src/review-seed.json", IMPACT_REVIEW_PATH);
    const snapshot = captureStagedSnapshot(f.root);
    const receipt = snapshot.inventory.find(
      (file) => file.path === IMPACT_REVIEW_PATH,
    );
    expect(receipt?.status).toBe("R");
    expect(() =>
      prepareImpactReview(snapshot, {
        analyses: new Map(),
        providerSetFingerprint: providerSet,
        evaluatorFingerprint: evaluator,
      }),
    ).toThrow("rename/copy cannot hide another changed path");
  });

  test("canonical proof receipt append preserves review and workspace snapshot", async () => {
    const f = repo();
    f.write(
      ".kb/tests/TEST-impact.md",
      "---\nid: TEST-impact\ntitle: Impact fixture\nverification_scope: unit\nproof_receipts: []\n---\nAuthored test evidence.\n",
    );
    f.git("add", ".kb/tests/TEST-impact.md");
    f.git("commit", "-qm", "add authored proof document");
    stageSource(f);
    stageReview(f);
    const takeWorkspaceSnapshot = nodeGit.workspaceSnapshot;
    if (!takeWorkspaceSnapshot)
      throw new Error("Node Git adapter lacks workspace snapshots");
    const before = await takeWorkspaceSnapshot(f.root);
    const path = join(f.root, ".kb/tests/TEST-impact.md");
    const prior = readFileSync(path, "utf8");
    const patched = patchReceiptsIntoDocument(prior, [
      proofReceipt("TEST-impact", "PR-impact1234"),
    ]);
    if (patched === null) throw new Error("Receipt patcher rejected fixture");
    f.write(".kb/tests/TEST-impact.md", patched);
    f.git("add", ".kb/tests/TEST-impact.md");
    const after = await takeWorkspaceSnapshot(f.root);
    expect(after.hash).toBe(before.hash);
    expect(evaluate(f).passed).toBe(true);

    f.write(
      ".kb/tests/TEST-impact.md",
      patched.replace(
        "Authored test evidence.",
        "Changed authored test evidence.",
      ),
    );
    f.git("add", ".kb/tests/TEST-impact.md");
    expect(evaluate(f).passed).toBe(false);
  });

  test("receipt appends preserve real authored KB hunk evidence", async () => {
    const f = repo();
    f.write(
      ".kb/tests/TEST-impact.md",
      "---\nid: TEST-impact\ntitle: Impact fixture\nverification_scope: unit\nproof_receipts: []\n---\nAuthored test evidence.\n",
    );
    f.git("add", ".kb/tests/TEST-impact.md");
    f.git("commit", "-qm", "add authored proof document");
    stageSource(f);
    const path = ".kb/tests/TEST-impact.md";
    const base = readFileSync(join(f.root, path), "utf8");
    const firstReceipt = proofReceipt("TEST-impact", "PR-impact1234");
    const first = patchReceiptsIntoDocument(base, [firstReceipt]);
    if (first === null) throw new Error("Receipt patcher rejected fixture");
    f.write(
      path,
      first.replace(
        "Authored test evidence.",
        "Revised authored test evidence.",
      ),
    );
    f.git("add", path);
    const analyses = analysisMap(f.root);
    const initial = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(initial, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const knowledgeFile = prepared.files.find((file) => file.path === path);
    expect(knowledgeFile?.oldHunkRanges.length).toBeGreaterThan(0);
    expect(knowledgeFile?.newHunkRanges.length).toBeGreaterThan(0);
    const record = createImpactReviewRecord(
      prepared,
      new Map(
        prepared.files.map((file) => [
          file.path,
          {
            decision:
              file.path === "src/service.ts"
                ? stillCurrent
                : ({
                    kind: "no_impact",
                    reason: "supporting-evidence",
                    rationale:
                      "The authored test description does not change requirements.",
                  } as ImpactDecision),
          },
        ]),
      ),
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);

    const takeWorkspaceSnapshot = nodeGit.workspaceSnapshot;
    if (!takeWorkspaceSnapshot)
      throw new Error("Node Git adapter lacks workspace snapshots");
    const before = await takeWorkspaceSnapshot(f.root);
    const secondReceipt = {
      ...proofReceipt("TEST-impact", "PR-impact5678"),
      started_at: "2026-09-26T10:01:00.000Z",
      finished_at: "2026-09-26T10:01:01.000Z",
    };
    const appended = patchReceiptsIntoDocument(
      first.replace(
        "Authored test evidence.",
        "Revised authored test evidence.",
      ),
      [firstReceipt, secondReceipt],
    );
    if (appended === null) throw new Error("Receipt patcher rejected fixture");
    f.write(path, appended);
    f.git("add", path);
    const after = await takeWorkspaceSnapshot(f.root);
    expect(after.hash).toBe(before.hash);
    expect(evaluate(f, analyses).passed).toBe(true);
  });

  test("changed source bytes invalidate the previously valid record", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    const valid = evaluate(f);
    expect(valid.passed).toBe(true);
    f.write("src/service.ts", "export function run() { return 3; }\n");
    f.git("add", "src/service.ts");
    const staleAnalyses = analysisMap(f.root);
    const next = new Map(staleAnalyses);
    next.set("src/service.ts", {
      path: "src/service.ts",
      before: analysis(
        "src/service.ts",
        "export function run() { return 1; }\n",
      ),
      after: analysis(
        "src/service.ts",
        "export function run() { return 3; }\n",
      ),
    });
    const result = evaluate(f, next);
    expect(result.passed).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("fingerprint");
  });

  test("provider closure mismatch invalidates the record", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    expect(
      evaluate(
        f,
        analysisMap(f.root),
        `sha256:${"d".repeat(64)}` as Fingerprint,
      ).passed,
    ).toBe(false);
  });

  test("evaluator fingerprint mismatch invalidates the record", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    expect(
      evaluate(
        f,
        analysisMap(f.root),
        providerSet,
        `sha256:${"e".repeat(64)}` as Fingerprint,
      ).passed,
    ).toBe(false);
  });

  test("captured knowledge bytes and relationships invalidate the record", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    expect(evaluate(f).passed).toBe(true);
    f.write(
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-service\n    title: Service.changed\n    sourceFile: src/service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-impact\n",
    );
    f.git("add", ".kb/symbols.yaml");
    expect(evaluate(f).passed).toBe(false);
  });

  test("Git executable mode is bound independently from source bytes", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    expect(evaluate(f).passed).toBe(true);
    f.git("update-index", "--chmod=+x", "--", "src/service.ts");
    expect(evaluate(f).passed).toBe(false);
  });

  test("provider output fingerprint is bound even when source bytes are unchanged", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    const changed = new Map(analysisMap(f.root));
    const sourceChange = changed.get("src/service.ts");
    if (!sourceChange?.after)
      throw new Error("Fixture analysis is missing the after side");
    changed.set("src/service.ts", {
      ...sourceChange,
      after: {
        ...sourceChange.after,
        symbols: [
          {
            name: "other",
            kind: "function",
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
    });
    expect(evaluate(f, changed).passed).toBe(false);
  });

  test("omitted, duplicated and extraneous files are rejected", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    const original = JSON.parse(
      readFileSync(join(f.root, IMPACT_REVIEW_PATH), "utf8"),
    );
    for (const files of [
      [],
      [original.files[0], original.files[0]],
      [...original.files, { ...original.files[0], path: "extra.ts" }],
    ]) {
      f.write(
        IMPACT_REVIEW_PATH,
        `${JSON.stringify({ ...original, files }, null, 2)}\n`,
      );
      f.git("add", IMPACT_REVIEW_PATH);
      expect(evaluate(f).passed).toBe(false);
    }
  });

  test("semantically updated requirement must resolve and match exact before/after semantics", () => {
    const f = repo();
    stageSource(f);
    f.write(
      ".kb/requirements/REQ-impact.md",
      "---\nid: REQ-impact\ntitle: Preserve updated behavior\nstatus: open\nsemantic_source_field: semantic_text\nsemantic_text: Keep this updated behavior.\n---\nKeep this behavior.\n",
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    const snapshot = captureStagedSnapshot(f.root);
    const analyses = analysisMap(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const before = prepared.baseEntities.get("REQ-impact");
    const after = prepared.headEntities.get("REQ-impact");
    if (!before || !after)
      throw new Error("Fixture requirement is missing on a captured side");
    const update: ImpactDecision = {
      kind: "impact",
      requirementIds: ["REQ-impact"],
      knowledge: {
        state: "updated",
        entities: [
          {
            entityId: "REQ-impact",
            artifactPath: ".kb/requirements/REQ-impact.md",
            beforeFingerprint: before.fingerprint,
            afterFingerprint: after.fingerprint,
          },
        ],
      },
    };
    const decisions = new Map(
      prepared.files.map((file) => [file.path, { decision: update }]),
    );
    const record = createImpactReviewRecord(
      prepared,
      decisions,
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    const updatedResult = evaluate(f, analyses);
    expect(updatedResult.passed).toBe(true);
  });

  test("updated knowledge accounts for every scoped requirement with a repairable acknowledgment", () => {
    const f = repo();
    f.write(
      ".kb/requirements/REQ-second.md",
      "---\nid: REQ-second\ntitle: Preserve related behavior\nstatus: open\nsemantic_source_field: semantic_text\nsemantic_text: Keep the related behavior.\n---\nKeep the related behavior.\n",
    );
    f.write(
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-service\n    title: Service.run\n    sourceFile: src/service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-impact\n      - type: implements\n        target: REQ-second\n",
    );
    f.git("add", ".kb/requirements/REQ-second.md", ".kb/symbols.yaml");
    f.git("commit", "-qm", "link a second scoped requirement");
    stageSource(f);
    f.write(
      ".kb/requirements/REQ-impact.md",
      "---\nid: REQ-impact\ntitle: Preserve updated behavior\nstatus: open\nsemantic_source_field: semantic_text\nsemantic_text: Keep this updated behavior.\n---\nKeep this behavior.\n",
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    const analyses = analysisMap(f.root);
    const snapshot = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const before = prepared.baseEntities.get("REQ-impact");
    const after = prepared.headEntities.get("REQ-impact");
    if (!before || !after)
      throw new Error("Fixture requirement is missing on a captured side");
    const update: ImpactDecision = {
      kind: "impact",
      requirementIds: ["REQ-impact"],
      knowledge: {
        state: "updated",
        entities: [
          {
            entityId: "REQ-impact",
            artifactPath: ".kb/requirements/REQ-impact.md",
            beforeFingerprint: before.fingerprint,
            afterFingerprint: after.fingerprint,
          },
        ],
      },
    };
    const sourceDecision: ImpactDecision = {
      kind: "impact",
      requirementIds: ["REQ-impact", "REQ-second"],
      knowledge: update.knowledge,
    };
    const decisions = new Map(
      prepared.files.map((file) => [
        file.path,
        {
          decision:
            file.path === "src/service.ts"
              ? sourceDecision
              : file.path === ".kb/requirements/REQ-impact.md"
                ? update
                : ({
                    kind: "no_impact",
                    reason: "supporting-evidence",
                    rationale: "This metadata path has no linked requirements.",
                  } as ImpactDecision),
        },
      ]),
    );
    const record = createImpactReviewRecord(
      prepared,
      decisions,
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);

    const repaired = JSON.parse(
      readFileSync(join(f.root, IMPACT_REVIEW_PATH), "utf8"),
    );
    const sourceFile = repaired.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    );
    sourceFile.decision.knowledge.stillCurrent = [
      {
        requirementId: "REQ-second",
        rationale: "The related behavior requirement remains accurate.",
      },
    ];
    const schema = JSON.parse(
      readFileSync(
        new URL(
          "../../src/traceability/impact-review.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const validateRecord = new Ajv2020({
      allErrors: true,
      strict: false,
    }).compile(schema);
    expect(validateRecord(repaired)).toBe(true);
    expect(parseImpactReviewRecord(repaired)).toBeDefined();
    const blankRationale = JSON.parse(JSON.stringify(repaired));
    blankRationale.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    ).decision.knowledge.stillCurrent[0].rationale = "   ";
    expect(validateRecord(blankRationale)).toBe(false);
    expect(() => parseImpactReviewRecord(blankRationale)).toThrow(
      "requires an ID and rationale",
    );
    const extraNestedField = JSON.parse(JSON.stringify(repaired));
    extraNestedField.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    ).decision.knowledge.stillCurrent[0].unexpected = true;
    expect(validateRecord(extraNestedField)).toBe(false);
    expect(() => parseImpactReviewRecord(extraNestedField)).toThrow(
      "unknown or missing fields",
    );
    const duplicateAcknowledgment = JSON.parse(JSON.stringify(repaired));
    const duplicateSource = duplicateAcknowledgment.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    );
    duplicateSource.decision.knowledge.stillCurrent.push(
      duplicateSource.decision.knowledge.stillCurrent[0],
    );
    expect(validateRecord(duplicateAcknowledgment)).toBe(false);
    expect(() => parseImpactReviewRecord(duplicateAcknowledgment)).toThrow(
      "stillCurrent duplicates acknowledgment",
    );

    const duplicateIdDifferentRationale = JSON.parse(JSON.stringify(repaired));
    const duplicateIdSource = duplicateIdDifferentRationale.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    );
    duplicateIdSource.decision.knowledge.stillCurrent.push({
      requirementId: "REQ-second",
      rationale:
        "A second rationale does not acknowledge a second requirement.",
    });
    expect(validateRecord(duplicateIdDifferentRationale)).toBe(true);
    expect(
      parseImpactReviewRecord(duplicateIdDifferentRationale),
    ).toBeDefined();
    f.write(
      IMPACT_REVIEW_PATH,
      `${JSON.stringify(duplicateIdDifferentRationale, null, 2)}\n`,
    );
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);

    const overlap = JSON.parse(JSON.stringify(repaired));
    const overlapSource = overlap.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    );
    overlapSource.decision.knowledge.stillCurrent.push({
      requirementId: "REQ-impact",
      rationale: "This conflicts with the updated requirement entry.",
    });
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(overlap, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);

    const extraneous = JSON.parse(JSON.stringify(repaired));
    const extraneousSource = extraneous.files.find(
      (file: { path: string }) => file.path === "src/service.ts",
    );
    extraneousSource.decision.knowledge.stillCurrent.push({
      requirementId: "REQ-outside-scope",
      rationale: "This requirement is not linked to the changed source.",
    });
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(extraneous, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);

    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(repaired, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(true);
  });

  test("no_impact cannot omit a requirement mapped to a changed source file", () => {
    const f = repo();
    stageSource(f);
    stageReview(f, analysisMap(f.root), {
      kind: "no_impact",
      reason: "supposedly-no-impact",
      rationale: "The linked requirement was not considered.",
    });
    const result = evaluate(f);
    expect(result.passed).toBe(false);
    expect(result.diagnostics[0]?.message).toContain(
      "no_impact cannot omit scoped requirements",
    );
  });

  test("review-only semantic-inventory metadata cannot claim requirement meaning changed", () => {
    const f = repo();
    const requirement = (options: {
      status: "modeled" | "ambiguous";
      start: number;
      end: number;
      reason: string;
      payloadHash: string;
    }) =>
      `---\nid: REQ-impact\ntitle: Preserve behavior\nstatus: open\nsemantic_source_field: semantic_text\nsemantic_text: Keep this behavior.\nsemantic_inventory_version: kibi.semantic-inventory.v1\nsemantic_inventory:\n  - claim_key: CLAIM-AAAAAAAAAAAAAAAA\n    claim_text: Keep this behavior.\n    role: normative\n    status: ${options.status}\n    span: { start: ${options.start}, end: ${options.end} }\n    semantic_key: preserve_behavior\n    payload_hash: ${options.payloadHash}\n    reason: ${options.reason}\n---\nKeep this behavior.\n`;
    f.write(
      ".kb/requirements/REQ-impact.md",
      requirement({
        status: "modeled",
        start: 0,
        end: 20,
        reason: "base note",
        payloadHash: "a".repeat(64),
      }),
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    f.git("commit", "-qm", "add semantic inventory baseline");
    stageSource(f);
    f.write(
      ".kb/requirements/REQ-impact.md",
      requirement({
        status: "ambiguous",
        start: 4,
        end: 24,
        reason: "review note changed",
        payloadHash: "b".repeat(64),
      }),
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    const analyses = analysisMap(f.root);
    const snapshot = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const before = prepared.baseEntities.get("REQ-impact");
    const after = prepared.headEntities.get("REQ-impact");
    if (!before || !after)
      throw new Error("Fixture requirement is missing on a captured side");
    const decision: ImpactDecision = {
      kind: "impact",
      requirementIds: ["REQ-impact"],
      knowledge: {
        state: "updated",
        entities: [
          {
            entityId: "REQ-impact",
            artifactPath: ".kb/requirements/REQ-impact.md",
            beforeFingerprint: before.fingerprint,
            afterFingerprint: after.fingerprint,
          },
        ],
      },
    };
    const record = createImpactReviewRecord(
      prepared,
      new Map(prepared.files.map((file) => [file.path, { decision }])),
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);
  });

  test("title-only requirement edits cannot claim semantic requirement updates", () => {
    const f = repo();
    stageSource(f);
    f.write(
      ".kb/requirements/REQ-impact.md",
      "---\nid: REQ-impact\ntitle: A cosmetic heading change\nstatus: open\n---\nKeep this behavior.\n",
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    const snapshot = captureStagedSnapshot(f.root);
    const analyses = analysisMap(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const before = prepared.baseEntities.get("REQ-impact");
    const after = prepared.headEntities.get("REQ-impact");
    if (!before || !after)
      throw new Error("Fixture requirement is missing on a captured side");
    const decision: ImpactDecision = {
      kind: "impact",
      requirementIds: ["REQ-impact"],
      knowledge: {
        state: "updated",
        entities: [
          {
            entityId: "REQ-impact",
            artifactPath: ".kb/requirements/REQ-impact.md",
            beforeFingerprint: before.fingerprint,
            afterFingerprint: after.fingerprint,
          },
        ],
      },
    };
    const record = createImpactReviewRecord(
      prepared,
      new Map(prepared.files.map((file) => [file.path, { decision }])),
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);
  });

  test("a title change counts when title is the configured semantic source", () => {
    const f = repo();
    const requirement = (title: string) =>
      `---\nid: REQ-impact\ntitle: ${title}\nstatus: open\nsemantic_source_field: title\nsemantic_text: Keep this behavior.\n---\nKeep this behavior.\n`;
    f.write(".kb/requirements/REQ-impact.md", requirement("Preserve behavior"));
    f.git("add", ".kb/requirements/REQ-impact.md");
    f.git("commit", "-qm", "configure title as semantic source");
    stageSource(f);
    f.write(
      ".kb/requirements/REQ-impact.md",
      requirement("Preserve the updated behavior"),
    );
    f.git("add", ".kb/requirements/REQ-impact.md");
    const analyses = analysisMap(f.root);
    const snapshot = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const before = prepared.baseEntities.get("REQ-impact");
    const after = prepared.headEntities.get("REQ-impact");
    if (!before || !after)
      throw new Error("Fixture requirement is missing on a captured side");
    const decision: ImpactDecision = {
      kind: "impact",
      requirementIds: ["REQ-impact"],
      knowledge: {
        state: "updated",
        entities: [
          {
            entityId: "REQ-impact",
            artifactPath: ".kb/requirements/REQ-impact.md",
            beforeFingerprint: before.fingerprint,
            afterFingerprint: after.fingerprint,
          },
        ],
      },
    };
    const record = createImpactReviewRecord(
      prepared,
      new Map(prepared.files.map((file) => [file.path, { decision }])),
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(true);
  });

  test("known partial result passes only with trusted provider allowance and exact range review", () => {
    const f = repo({ allowPartial: true });
    stageSource(f);
    const analyses = analysisMap(f.root, "partial");
    const first = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(first, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const review = {
      kind: "partial_review" as const,
      side: "after" as const,
      limitationClass: "dynamic-decorator",
      ranges: [
        {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 8,
          reason: "dynamic decorator",
        },
      ],
      rationale:
        "Reviewed the exact dynamic-decorator range; symbol coverage remains partial.",
    };
    const decisions = new Map(
      prepared.files.map((file) => [
        file.path,
        { decision: stillCurrent, analysisReviews: [review] },
      ]),
    );
    const record = createImpactReviewRecord(
      prepared,
      decisions,
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(true);
    const tampered = JSON.parse(
      readFileSync(join(f.root, IMPACT_REVIEW_PATH), "utf8"),
    );
    tampered.files[0].analysisReviews[0].ranges[0].endColumn += 1;
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(tampered, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);
  });

  test("nested partial range fields must match the published strict schema", () => {
    const f = repo({ allowPartial: true });
    stageSource(f);
    const analyses = analysisMap(f.root, "partial");
    const snapshot = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const record = createImpactReviewRecord(
      prepared,
      new Map(
        prepared.files.map((file) => [
          file.path,
          {
            decision: stillCurrent,
            analysisReviews: [
              {
                kind: "partial_review" as const,
                side: "after" as const,
                limitationClass: "dynamic-decorator",
                ranges: [
                  {
                    startLine: 1,
                    startColumn: 0,
                    endLine: 1,
                    endColumn: 8,
                    reason: "dynamic decorator",
                  },
                ],
                rationale: "Reviewed the exact residual range.",
              },
            ],
          },
        ]),
      ),
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    const tampered = JSON.parse(JSON.stringify(record));
    tampered.files[0].analysisReviews[0].ranges[0].unrecognized = true;
    const reviewSchema = JSON.parse(
      readFileSync(
        new URL(
          "../../src/traceability/impact-review.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(
      new Ajv2020({ allErrors: true, strict: false }).compile(reviewSchema)(
        tampered,
      ),
    ).toBe(false);
    expect(() => parseImpactReviewRecord(tampered)).toThrow(
      "unknown or missing fields",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(tampered, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(false);
  });

  test("syntax partial remains blocked even if a provider diagnostic is allowlisted", () => {
    for (const code of [
      "TREESITTER_SYNTAX_ERROR",
      "TREESITTER_ANALYSIS_TIMEOUT",
      "SOURCE_ANALYZER_INTEGRITY_MISMATCH",
      "provider_failed",
    ]) {
      const f = repo({ allowPartial: true, partialDiagnosticCode: code });
      stageSource(f);
      const snapshot = captureStagedSnapshot(f.root);
      expect(() =>
        prepareImpactReview(snapshot, {
          analyses: analysisMap(f.root, "partial", code),
          providerSetFingerprint: providerSet,
          evaluatorFingerprint: evaluator,
        }),
      ).toThrow("Non-waivable parser, provider, timeout, integrity, or syntax");
    }
  });

  test("failed provider result remains blocking even when declarations are present", () => {
    const f = repo();
    stageSource(f);
    stageReview(f);
    expect(evaluate(f, analysisMap(f.root, "failed")).passed).toBe(false);
  });

  test("unsupported files require both policy approval and whole-file review", () => {
    const f = repo({ allowUnsupported: true });
    f.write("src/service.ts", "export function run() { return 2; }\n");
    f.git("add", "src/service.ts");
    const analyses = analysisMap(f.root, "unsupported");
    const snapshot = captureStagedSnapshot(f.root);
    const prepared = prepareImpactReview(snapshot, {
      analyses,
      providerSetFingerprint: providerSet,
      evaluatorFingerprint: evaluator,
    });
    const decisions = new Map(
      prepared.files.map((file) => [
        file.path,
        {
          decision: stillCurrent,
          analysisReviews: [
            {
              kind: "unsupported_review" as const,
              side: "after" as const,
              wholeFile: true as const,
              rationale: "Reviewed the complete current-side file.",
            },
          ],
        },
      ]),
    );
    const record = createImpactReviewRecord(
      prepared,
      decisions,
      "local-reviewer",
      "2026-09-26T10:00:00Z",
    );
    f.write(IMPACT_REVIEW_PATH, `${JSON.stringify(record, null, 2)}\n`);
    f.git("add", IMPACT_REVIEW_PATH);
    expect(evaluate(f, analyses).passed).toBe(true);
  });

  test("policy is loaded from the immutable base, not a changed head policy", () => {
    const f = repo();
    stageSource(f);
    f.write(".kibi/impact-policy.json", '{"contractVersion":"unknown"}\n');
    f.git("add", ".kibi/impact-policy.json");
    const snapshot = captureStagedSnapshot(f.root);
    expect(loadBaseImpactPolicy(snapshot).id).toBe("fixture-policy");
    const policyBefore = execFileSync(
      "git",
      ["show", "HEAD:.kibi/impact-policy.json"],
      { cwd: f.root, encoding: "utf8" },
    );
    const policyAfter = readFileSync(
      join(f.root, ".kibi/impact-policy.json"),
      "utf8",
    );
    const analyses = new Map(analysisMap(f.root));
    analyses.set(".kibi/impact-policy.json", {
      path: ".kibi/impact-policy.json",
      before: analysis(".kibi/impact-policy.json", policyBefore),
      after: analysis(".kibi/impact-policy.json", policyAfter),
    });
    expect(
      prepareImpactReview(snapshot, {
        analyses,
        providerSetFingerprint: providerSet,
        evaluatorFingerprint: evaluator,
      }).policy.version,
    ).toBe("1");
  });

  test("staged policy addition does not enable review until it reaches the base", () => {
    const f = repo({ withImpactPolicy: false });
    stageSource(f);
    f.write(
      ".kibi/impact-policy.json",
      `${JSON.stringify({
        contractVersion: "kibi.impact-policy.v1",
        id: "fixture-policy",
        version: "1",
        allowUnsupportedReview: false,
        allowedPartial: [],
        notApplicablePaths: [],
      })}\n`,
    );
    f.git("add", ".kibi/impact-policy.json");
    expect(hasValidBaseImpactPolicy(captureStagedSnapshot(f.root))).toBe(false);
  });

  test("a present malformed base policy fails closed", () => {
    const f = repo({ withImpactPolicy: false });
    f.write(".kibi/impact-policy.json", '{"contractVersion":"unknown"}\n');
    f.git("add", ".kibi/impact-policy.json");
    f.git("commit", "-qm", "add malformed impact policy");
    stageSource(f);
    expect(() =>
      hasValidBaseImpactPolicy(captureStagedSnapshot(f.root)),
    ).toThrow("Impact policy has unknown or missing fields");
  });

  test("a present non-regular base policy fails closed", () => {
    const f = repo({ withImpactPolicy: false });
    mkdirSync(join(f.root, ".kibi"), { recursive: true });
    symlinkSync(
      "missing-policy-target",
      join(f.root, ".kibi/impact-policy.json"),
    );
    f.git("add", ".kibi/impact-policy.json");
    f.git("commit", "-qm", "add non-regular impact policy");
    stageSource(f);
    expect(() =>
      hasValidBaseImpactPolicy(captureStagedSnapshot(f.root)),
    ).toThrow("Trusted base policy missing or not a regular file");
  });

  test("a base policy directory cannot substitute a valid JSON child", () => {
    const f = repo({ withImpactPolicy: false });
    f.write(
      ".kibi/impact-policy.json/child.json",
      JSON.stringify({
        contractVersion: "kibi.impact-policy.v1",
        id: "fixture-policy",
        version: "1",
        allowUnsupportedReview: false,
        allowedPartial: [],
        notApplicablePaths: [],
      }),
    );
    f.git("add", ".kibi");
    f.git("commit", "-qm", "base policy path is a directory");
    stageSource(f);
    const snapshot = captureStagedSnapshot(f.root);
    expect(() => hasValidBaseImpactPolicy(snapshot)).toThrow(
      "Trusted base policy missing or not a regular file",
    );
    expect(() => loadBaseImpactPolicy(snapshot)).toThrow(
      "Trusted base policy missing or not a regular file",
    );
  });

  test("an empty base policy tree is present and must fail closed", () => {
    const f = repo({ withImpactPolicy: false });
    const makeTree = (input: string) =>
      execFileSync("git", ["mktree"], {
        cwd: f.root,
        input,
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
    const emptyTree = makeTree("");
    const configTree = makeTree(
      `040000 tree ${emptyTree}\timpact-policy.json\n`,
    );
    const rootTree = makeTree(
      `${f.git("ls-tree", "HEAD").toString("utf8")}040000 tree ${configTree}\t.kibi\n`,
    );
    const commit = f
      .git("commit-tree", rootTree, "-p", "HEAD", "-m", "empty policy tree")
      .toString("utf8")
      .trim();
    f.git("update-ref", "HEAD", commit);
    stageSource(f);
    const snapshot = captureStagedSnapshot(f.root);
    expect(() => hasValidBaseImpactPolicy(snapshot)).toThrow(
      "Trusted base policy missing or not a regular file",
    );
    expect(() => loadBaseImpactPolicy(snapshot)).toThrow(
      "Trusted base policy missing or not a regular file",
    );
  });

  test("deleting a base policy in the candidate does not disable review", () => {
    const f = repo();
    stageSource(f);
    f.git("rm", ".kibi/impact-policy.json");
    expect(hasValidBaseImpactPolicy(captureStagedSnapshot(f.root))).toBe(true);
  });

  test("unknown impact policy versions fail closed", () => {
    expect(() =>
      parseImpactPolicy({
        contractVersion: "kibi.impact-policy.v99",
        id: "future-policy",
        version: "99",
        allowUnsupportedReview: true,
        allowedPartial: [],
        notApplicablePaths: [],
      }),
    ).toThrow("Unknown impact policy version");
  });

  test("partial policy selectors cannot map to conflicting limitation classes", () => {
    expect(() =>
      parseImpactPolicy({
        contractVersion: "kibi.impact-policy.v1",
        id: "duplicate-selector",
        version: "1",
        allowUnsupportedReview: false,
        allowedPartial: [
          {
            providerId: "provider",
            providerFingerprint: `sha256:${provider}`,
            diagnosticCode: "known_dynamic_limit",
            limitationClass: "first-class",
          },
          {
            providerId: "provider",
            providerFingerprint: `sha256:${provider}`,
            diagnosticCode: "known_dynamic_limit",
            limitationClass: "conflicting-class",
          },
        ],
        notApplicablePaths: [],
      }),
    ).toThrow("conflicting or duplicate partial allowance selectors");
  });

  test("published JSON Schemas accept the generated policy and review record", () => {
    const f = repo();
    stageSource(f);
    const { record } = stageReview(f);
    const policySchema = JSON.parse(
      readFileSync(
        new URL(
          "../../src/traceability/impact-policy.v1.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const reviewSchema = JSON.parse(
      readFileSync(
        new URL(
          "../../src/traceability/impact-review.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validatePolicy = ajv.compile(policySchema);
    const validateRecord = ajv.compile(reviewSchema);
    expect(
      validatePolicy(
        JSON.parse(
          readFileSync(join(f.root, ".kibi/impact-policy.json"), "utf8"),
        ),
      ),
    ).toBe(true);
    expect(validateRecord(record)).toBe(true);
    const nestedUnknown = JSON.parse(JSON.stringify(record));
    nestedUnknown.files[0].before.untrustedExtra = "not in schema";
    expect(validateRecord(nestedUnknown)).toBe(false);
    expect(() => parseImpactReviewRecord(nestedUnknown)).toThrow(
      "unknown or missing fields",
    );
  });
});
