import { afterEach, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkGeneratedManifests } from "../../src/commands/check-generated.js";
import { refreshManifestCoordinates } from "../../src/commands/sync/manifest.js";
import { enrichSymbolCoordinates } from "../../src/extractors/symbols-coordinator.js";
import * as maintenance from "../../src/plugins/maintenance-source-analysis.js";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import { SourceAnalysisService } from "../../src/plugins/source-analysis-service.js";
import { analyzeSourceChanges } from "../../src/plugins/source-change-analysis.js";
import { captureStagedSnapshot } from "../../src/traceability/git-change-snapshot.js";
import * as evaluatorModule from "../../src/traceability/impact-evaluator.js";
import {
  createImpactReviewRecord,
  prepareImpactReview,
} from "../../src/traceability/impact-evaluator.js";
import type { Fingerprint } from "../../src/traceability/impact-review.js";
import { createReviewedDecoratorCoordinateVerifier } from "../../src/traceability/reviewed-coordinate-refresh.js";

const roots: string[] = [];
const restores: (() => void)[] = [];
afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
const bindings = {
  providerSetFingerprint: `sha256:${"b".repeat(64)}` as Fingerprint,
  evaluatorFingerprint: `sha256:${"c".repeat(64)}` as Fingerprint,
};
const provider = "a".repeat(64);
const span = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 12 };
const code = "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE";
function policy(allowed = true) {
  return {
    contractVersion: "kibi.impact-policy.v1",
    id: "coordinate-fixture",
    version: "1",
    allowUnsupportedReview: false,
    allowedPartial: allowed
      ? [
          {
            providerId: "kibi-plugin-treesitter.tree-sitter.v2",
            providerFingerprint: `sha256:${provider}`,
            diagnosticCode: code,
            limitationClass: "python-decorator-expansion",
          },
        ]
      : [],
    notApplicablePaths: [],
  };
}
async function fixture(allowed = true, record = true) {
  const root = mkdtempSync(join(tmpdir(), "kibi-reviewed-coordinate-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  git("init", "-q");
  git("config", "user.name", "Coordinate Fixture");
  git("config", "user.email", "coordinate@example.invalid");
  write(".kibi/impact-policy.json", JSON.stringify(policy(allowed)));
  write(
    ".kb/requirements/REQ-impact.md",
    "---\nid: REQ-impact\ntitle: Preserve behavior\nstatus: open\nsemantic_source_field: semantic_text\nsemantic_text: Keep this behavior.\n---\nKeep this behavior.\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-run\n    title: run\n    sourceFile: src/service.py\n    relationships:\n      - type: implements\n        target: REQ-impact\n  - id: SYM-funding\n    title: funding\n    sourceFile: src/funding.py\n    relationships:\n      - type: implements\n        target: REQ-impact\n",
  );
  write("src/service.py", "@decorator\ndef run():\n    return 1\n");
  write("src/funding.py", "@decorator\ndef funding():\n    return 1\n");
  git("add", ".");
  git(
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "-qm",
    "base policy and sources",
  );
  const service = new SourceAnalysisService({
    registry: new CapabilityRegistry({ workspaceRoot: root }),
    providerFingerprints: { "kibi-plugin-treesitter": provider },
    resolveExtractorsV2: async () => ({
      builtin: {
        pluginId: "kibi-plugin-treesitter",
        pluginVersion: "0.1.2",
        packageName: null,
        mode: "builtin",
        external: false,
        permissions: { network: false, metered: false, secrets: [] },
        capability: {
          id: "kibi-plugin-treesitter.tree-sitter.v2",
          supports: ({ path }) => path.endsWith(".py"),
          analyze: async ({ path }) => ({
            contractVersion: "kibi.symbol-extractor.v2",
            status: "partial",
            sourceFile: path,
            language: "python",
            module: {
              title: "fixture",
              language: "python",
              analysisMode: "parser",
            },
            symbols: [
              {
                name: path.includes("funding") ? "funding" : "run",
                kind: "function",
                startLine: 2,
                startColumn: 0,
                endLine: 3,
                endColumn: 12,
              },
            ],
            diagnostics: [
              {
                code,
                message: "Decorators may synthesize declarations.",
                range: span,
              },
            ],
            uncoveredRanges: [
              { ...span, reason: "decorator-may-alter-or-create-declarations" },
            ],
          }),
        },
        stamp: {
          pluginId: "kibi-plugin-treesitter",
          pluginVersion: "0.1.2",
          capability: "kibi.symbol-extractor.v2",
          mode: "augment",
          external: false,
          network: false,
          metered: false,
        },
      },
      replace: null,
      augment: [],
      shadow: [],
    }),
  });
  write(
    "src/service.py",
    "@decorator\ndef run():\n    return 1\n# reviewed comment\n",
  );
  git("add", "src/service.py");
  if (record) await stageReceipt(root, service, write, git);
  const entries = [
    { id: "SYM-run", title: "run", sourceFile: "src/service.py" },
    { id: "SYM-funding", title: "funding", sourceFile: "src/funding.py" },
  ];
  return { root, git, write, service, entries };
}
async function stageReceipt(
  root: string,
  service: SourceAnalysisService,
  write: (file: string, content: string) => void,
  git: (...args: string[]) => Buffer,
) {
  const snapshot = captureStagedSnapshot(root);
  const analyses = await analyzeSourceChanges(snapshot.inventory, service);
  const prepared = prepareImpactReview(snapshot, { ...bindings, analyses });
  const receipt = createImpactReviewRecord(
    prepared,
    new Map(
      prepared.files.map((file) => [
        file.path,
        {
          decision:
            (prepared.scopedRequirementIdsByPath.get(file.path)?.length ?? 0) >
            0
              ? {
                  kind: "impact" as const,
                  requirementIds: [
                    ...(prepared.scopedRequirementIdsByPath.get(file.path) ??
                      []),
                  ],
                  knowledge: {
                    state: "still_current" as const,
                    rationale:
                      "The comment leaves executable statements and owner requirement unchanged.",
                  },
                }
              : {
                  kind: "no_impact" as const,
                  reason: "supporting-evidence" as const,
                  rationale:
                    "This generated metadata preserves the authored symbol identities and bindings.",
                },
          analysisReviews: (["before", "after"] as const).flatMap((side) =>
            file[side]?.analysis?.status === "partial"
              ? [
                  {
                    kind: "partial_review" as const,
                    side,
                    limitationClass: "python-decorator-expansion",
                    ranges: file[side]?.analysis?.uncoveredRanges ?? [],
                    rationale:
                      "The exact decorator omission is reviewed; completeness is not claimed.",
                  },
                ]
              : [],
          ),
        },
      ]),
    ),
    "local-coordinate-review",
  );
  write(".kibi/impact-review.json", JSON.stringify(receipt));
  git("add", ".kibi/impact-review.json");
}

function isolateLocalContext() {
  const before = process.env.CI;
  Reflect.deleteProperty(process.env, "CI");
  restores.push(() =>
    before === undefined
      ? Reflect.deleteProperty(process.env, "CI")
      : Reflect.set(process.env, "CI", before),
  );
}

test("content-bound changed-source review permits only lexical coordinates including unchanged decorated source", async () => {
  isolateLocalContext();
  const f = await fixture();
  const snapshot = captureStagedSnapshot(f.root);
  const originalInventory = JSON.stringify(snapshot.inventory);
  const verifier = createReviewedDecoratorCoordinateVerifier(
    snapshot,
    f.service,
    bindings,
  );
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  restores.push(() => warn.mockRestore());
  await expect(
    enrichSymbolCoordinates(f.entries, f.root, {
      sourceAnalysisService: f.service,
    }),
  ).rejects.toThrow("incomplete source analysis");
  const out = await enrichSymbolCoordinates(f.entries, f.root, {
    sourceAnalysisService: f.service,
    allowPythonDecoratorCoordinates: true,
    verifyPythonDecoratorCoordinates: verifier,
  });
  expect(out.map((entry) => entry.sourceLine)).toEqual([2, 2]);
  expect(warn).toHaveBeenCalledTimes(2);
  expect(
    warn.mock.calls.every((call) =>
      String(call[0]).includes("remains partial"),
    ),
  ).toBe(true);
  expect(JSON.stringify(snapshot.inventory)).toBe(originalInventory);
  const analysis = await f.service.analyzeTextV2(
    "src/funding.py",
    "@decorator\ndef funding():\n    return 1\n",
  );
  expect(analysis.status).toBe("partial");
  expect(analysis.uncoveredRanges).toHaveLength(1);
  await expect(
    verifier("src/funding.py", {
      ...analysis,
      providerFingerprint: "d".repeat(64),
    }),
  ).rejects.toThrow("base policy");
  await expect(
    verifier("src/funding.py", {
      ...analysis,
      diagnostics: [
        { code: "TREESITTER_SYNTAX_ERROR", message: "syntax", range: span },
      ],
    }),
  ).rejects.toThrow("base policy");
  f.write("extra.txt", "index changed\n");
  f.git("add", "extra.txt");
  await expect(verifier("src/funding.py", analysis)).rejects.toThrow();
});

test("missing and stale exact staged receipts fail before partial coordinates", async () => {
  isolateLocalContext();
  for (const missing of [true, false]) {
    const f = await fixture(true, !missing);
    if (!missing) {
      f.write(
        "src/service.py",
        "@decorator\ndef run():\n    return 1\n# stale review\n",
      );
      f.git("add", "src/service.py");
    }
    const snapshot = captureStagedSnapshot(f.root);
    const verifier = createReviewedDecoratorCoordinateVerifier(
      snapshot,
      f.service,
      bindings,
    );
    await expect(
      enrichSymbolCoordinates(f.entries, f.root, {
        sourceAnalysisService: f.service,
        allowPythonDecoratorCoordinates: true,
        verifyPythonDecoratorCoordinates: verifier,
      }),
    ).rejects.toThrow("Reviewed coordinate migration failed");
  }
});

test("a staged policy allowance cannot authorize itself from the candidate tree", async () => {
  isolateLocalContext();
  const f = await fixture(false, false);
  f.write(".kibi/impact-policy.json", JSON.stringify(policy(true)));
  f.git("add", ".kibi/impact-policy.json");
  const verifier = createReviewedDecoratorCoordinateVerifier(
    captureStagedSnapshot(f.root),
    f.service,
    bindings,
  );
  await expect(
    enrichSymbolCoordinates(f.entries, f.root, {
      sourceAnalysisService: f.service,
      allowPythonDecoratorCoordinates: true,
      verifyPythonDecoratorCoordinates: verifier,
    }),
  ).rejects.toThrow("captured base policy");
});

test("local staged migration cannot be used as protected target policy authority in CI", async () => {
  isolateLocalContext();
  const f = await fixture();
  process.env.CI = "true";
  expect(() =>
    createReviewedDecoratorCoordinateVerifier(
      captureStagedSnapshot(f.root),
      f.service,
      bindings,
    ),
  ).toThrow("protected target-base snapshot");
});

test("the generated-byte gate accepts a valid reviewed migration and rejects a stale receipt", async () => {
  isolateLocalContext();
  const f = await fixture(true, false);
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  restores.push(() => warn.mockRestore());
  await refreshManifestCoordinates(join(f.root, ".kb/symbols.yaml"), f.root, {
    refreshSymbolCoordinates: true,
    enrichSymbolCoordinates: (entries, root, options) =>
      enrichSymbolCoordinates(entries, root, {
        ...options,
        sourceAnalysisService: f.service,
      }),
  });
  f.git("add", ".kb/symbols.yaml", ".kb/symbol-coordinates.yaml");
  await stageReceipt(f.root, f.service, f.write, f.git);
  const serviceSpy = spyOn(
    maintenance,
    "createMaintenanceSourceAnalysisService",
  ).mockReturnValue(f.service);
  const providerSpy = spyOn(
    maintenance,
    "fingerprintMaintenanceSourceSet",
  ).mockReturnValue(bindings.providerSetFingerprint);
  const evaluatorSpy = spyOn(
    evaluatorModule,
    "fingerprintImpactEvaluator",
  ).mockReturnValue(bindings.evaluatorFingerprint);
  restores.push(() => {
    serviceSpy.mockRestore();
    providerSpy.mockRestore();
    evaluatorSpy.mockRestore();
  });
  const originalCwd = process.cwd();
  process.chdir(f.root);
  try {
    expect((await checkGeneratedManifests()).exitCode).toBe(0);
    f.write(
      "src/service.py",
      "@decorator\ndef run():\n    return 1\n# receipt became stale\n",
    );
    f.git("add", "src/service.py");
    expect((await checkGeneratedManifests()).exitCode).toBe(1);
  } finally {
    process.chdir(originalCwd);
  }
});
