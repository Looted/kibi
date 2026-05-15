/// <reference types="bun-types" />
// implements REQ-opencode-kibi-briefing-v2

import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RepoPosture } from "../src/repo-posture";
import type { RiskClass } from "../src/risk-classifier";

type BriefIntentParams = {
  riskClass: RiskClass;
  posture: RepoPosture;
  maintenanceDegraded: boolean;
  workspaceRoot: string;
  branch: string;
  sourceFiles: string[];
  focusFilePath?: string;
  seedIds?: string[];
};

type BriefIntentResult = {
  eligible: boolean;
  reason: string;
  fingerprint: string;
  sourceFiles: string[];
  seedIds: string[];
};

type BriefingContextResult = {
  sourceFiles: string[];
  seedIds: string[];
};

type BriefIntentModule = {
  deriveBriefIntent?: (params: BriefIntentParams) => BriefIntentResult;
  buildBriefingContext?: (params: {
    sourceFiles: string[];
    seedIds?: string[];
    changedEntityIds?: string[];
  }) => BriefingContextResult;
};

function makeParams(
  overrides: Partial<BriefIntentParams> = {},
): BriefIntentParams {
  return {
    riskClass: "behavior_candidate",
    posture: "root_active",
    maintenanceDegraded: false,
    workspaceRoot: "/workspace",
    branch: "feature/task-3",
    sourceFiles: ["/workspace/src/foo.ts"],
    ...overrides,
  };
}

async function loadModule(): Promise<BriefIntentModule> {
  try {
    return (await import(
      "../src/brief-intent.js"
    )) as unknown as BriefIntentModule;
  } catch {
    return {};
  }
}

async function derive(
  overrides: Partial<BriefIntentParams> = {},
): Promise<BriefIntentResult> {
  const mod = await loadModule();
  const deriveBriefIntent = mod.deriveBriefIntent;
  assert.equal(
    typeof deriveBriefIntent,
    "function",
    "Expected brief-intent.ts to export deriveBriefIntent(params)",
  );
  if (typeof deriveBriefIntent !== "function") {
    throw new Error("deriveBriefIntent export missing");
  }
  return deriveBriefIntent(makeParams(overrides));
}

async function buildContext(params: {
  sourceFiles: string[];
  seedIds?: string[];
  changedEntityIds?: string[];
}): Promise<BriefingContextResult> {
  const mod = await loadModule();
  const buildBriefingContext = mod.buildBriefingContext;
  assert.equal(
    typeof buildBriefingContext,
    "function",
    "Expected brief-intent.ts to export buildBriefingContext(params)",
  );
  if (typeof buildBriefingContext !== "function") {
    throw new Error("buildBriefingContext export missing");
  }
  return buildBriefingContext(params);
}

describe("deriveBriefIntent", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-brief-intent-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  function writeSymbolsYaml(
    entries: Array<{
      id: string;
      sourceFile: string;
      links?: string[];
      relationships?: Array<{ type: string; target: string }>;
    }>,
  ) {
    const documentationDir = path.join(tmpDir, "documentation");
    fs.mkdirSync(documentationDir, { recursive: true });
    const yaml = entries
      .map((entry) => {
        let content = `  - id: ${entry.id}\n    sourceFile: ${entry.sourceFile}\n`;
        if (entry.links?.length) {
          content += "    links:\n";
          for (const link of entry.links) {
            content += `      - ${link}\n`;
          }
        }
        if (entry.relationships?.length) {
          content += "    relationships:\n";
          for (const relationship of entry.relationships) {
            content += `      - type: ${relationship.type}\n        target: ${relationship.target}\n`;
          }
        }
        return content;
      })
      .join("\n");
    fs.writeFileSync(path.join(documentationDir, "symbols.yaml"), yaml);
  }

  test("returns eligible for behavior_candidate in root_active posture", async () => {
    const result = await derive();

    assert.equal(result.eligible, true);
    assert.equal(result.reason, "Eligible for auto-briefing");
    assert.equal(
      Object.prototype.hasOwnProperty.call(result, "keepManualCue"),
      false,
    );
    assert.deepEqual(result.sourceFiles, ["/workspace/src/foo.ts"]);
    assert.deepEqual(result.seedIds, []);
  });

  test("buildBriefingContext sorts source files and combines changed entity IDs before source-linked seed IDs", async () => {
    const result = await buildContext({
      sourceFiles: [
        "/workspace/src/z.ts",
        "/workspace/src/a.ts",
        "/workspace/src/a.ts",
      ],
      seedIds: ["REQ-SRC-3", "REQ-SRC-1", "REQ-SRC-2", "REQ-SRC-4"],
      changedEntityIds: ["TEST-002", "REQ-001", "REQ-002", "REQ-003"],
    });

    assert.deepEqual(result.sourceFiles, [
      "/workspace/src/a.ts",
      "/workspace/src/z.ts",
    ]);
    assert.deepEqual(result.seedIds, [
      "REQ-001",
      "REQ-002",
      "REQ-SRC-1",
      "REQ-SRC-3",
      "TEST-002",
    ]);
  });

  test("returns eligible for traceability_candidate in hybrid_root_plus_vendored posture", async () => {
    const result = await derive({
      riskClass: "traceability_candidate",
      posture: "hybrid_root_plus_vendored",
    });

    assert.equal(result.eligible, true);
    assert.equal(result.reason, "Eligible for auto-briefing");
  });

  test("returns ineligible for vendored_only posture", async () => {
    const result = await derive({ posture: "vendored_only" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("posture"));
    assert.ok(result.reason.includes("vendored_only"));
  });

  test("returns ineligible for root_partial posture", async () => {
    const result = await derive({ posture: "root_partial" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("root_partial"));
  });

  test("returns ineligible for root_uninitialized posture", async () => {
    const result = await derive({ posture: "root_uninitialized" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("root_uninitialized"));
  });

  test("returns ineligible when maintenance is degraded", async () => {
    const result = await derive({ maintenanceDegraded: true });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("degraded"));
  });

  test("returns ineligible for safe_docs_only", async () => {
    const result = await derive({ riskClass: "safe_docs_only" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("safe_docs_only"));
  });

  test("returns ineligible for safe_test_only", async () => {
    const result = await derive({ riskClass: "safe_test_only" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("safe_test_only"));
  });

  test("returns ineligible for req_policy_candidate", async () => {
    const result = await derive({ riskClass: "req_policy_candidate" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("req_policy_candidate"));
  });

  test("returns ineligible for kb_doc_structural", async () => {
    const result = await derive({ riskClass: "kb_doc_structural" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("kb_doc_structural"));
  });

  test("returns ineligible for manual_kb_edit", async () => {
    const result = await derive({ riskClass: "manual_kb_edit" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("manual_kb_edit"));
  });

  test("returns ineligible when sourceFiles is empty", async () => {
    const result = await derive({ sourceFiles: [], seedIds: ["REQ-001"] });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("no source files"));
    assert.deepEqual(result.sourceFiles, []);
    assert.deepEqual(result.seedIds, []);
  });

  test("returns ineligible when the only source files are operational artifacts", async () => {
    const result = await derive({
      sourceFiles: ["/workspace/.sisyphus/boulder.json", "/workspace/.sisyphus/notes/state.json"],
      seedIds: ["REQ-001"],
    });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.length > 0);
    assert.deepEqual(result.sourceFiles, [
      "/workspace/.sisyphus/boulder.json",
      "/workspace/.sisyphus/notes/state.json",
    ]);
  });

  test("returns eligible with sourceFiles stripped of operational paths for mixed sessions", async () => {
    const result = await derive({
      sourceFiles: [
        "/workspace/.sisyphus/boulder.json",
        "/workspace/src/foo.ts",
        "/workspace/.sisyphus/notes/state.json",
        "/workspace/src/bar.ts",
      ],
      seedIds: ["REQ-001"],
    });

    assert.equal(result.eligible, true);
    assert.equal(result.reason, "Eligible for auto-briefing");
    assert.deepEqual(result.sourceFiles, [
      "/workspace/src/bar.ts",
      "/workspace/src/foo.ts",
    ]);
  });

  test("produces identical fingerprint for the same params twice", async () => {
    const files = ["/repo/packages/opencode/src/prompt.ts"];
    const first = await derive({
      workspaceRoot: "/repo",
      branch: "feature/brief",
      sourceFiles: files,
      riskClass: "traceability_candidate",
    });
    const second = await derive({
      workspaceRoot: "/repo",
      branch: "feature/brief",
      sourceFiles: files,
      riskClass: "traceability_candidate",
    });

    assert.equal(first.fingerprint, second.fingerprint);
  });

  test("uses the exact fingerprint serialization pattern", async () => {
    const result = await derive({
      workspaceRoot: "/repo",
      branch: "feature/brief",
      sourceFiles: ["/repo/src/feature.ts"],
      riskClass: "behavior_candidate",
    });

    assert.equal(
      result.fingerprint,
      "brief:/repo\0feature/brief\0behavior_candidate\0/repo/src/feature.ts",
    );
  });

  test("fingerprint is stable across sourceFiles reordering", async () => {
    const first = await derive({
      workspaceRoot: "/repo",
      branch: "main",
      sourceFiles: ["/repo/src/b.ts", "/repo/src/a.ts", "/repo/src/c.ts"],
      riskClass: "behavior_candidate",
    });
    const second = await derive({
      workspaceRoot: "/repo",
      branch: "main",
      sourceFiles: ["/repo/src/c.ts", "/repo/src/a.ts", "/repo/src/b.ts"],
      riskClass: "behavior_candidate",
    });

    assert.equal(first.fingerprint, second.fingerprint);
    // Both should produce sorted order
    assert.deepEqual(first.sourceFiles, [
      "/repo/src/a.ts",
      "/repo/src/b.ts",
      "/repo/src/c.ts",
    ]);
    assert.deepEqual(second.sourceFiles, [
      "/repo/src/a.ts",
      "/repo/src/b.ts",
      "/repo/src/c.ts",
    ]);
  });

  test("sourceFiles are deduped", async () => {
    const result = await derive({
      sourceFiles: [
        "/workspace/src/foo.ts",
        "/workspace/src/bar.ts",
        "/workspace/src/foo.ts",
      ],
    });

    assert.deepEqual(result.sourceFiles, [
      "/workspace/src/bar.ts",
      "/workspace/src/foo.ts",
    ]);
  });

  test("sourceFiles are sorted", async () => {
    const result = await derive({
      sourceFiles: [
        "/workspace/src/z.ts",
        "/workspace/src/a.ts",
        "/workspace/src/m.ts",
      ],
    });

    assert.deepEqual(result.sourceFiles, [
      "/workspace/src/a.ts",
      "/workspace/src/m.ts",
      "/workspace/src/z.ts",
    ]);
  });

  test("does not expose keepManualCue even when result is ineligible", async () => {
    const result = await derive({ posture: "vendored_only" });

    assert.equal(
      Object.prototype.hasOwnProperty.call(result, "keepManualCue"),
      false,
    );
  });

  test("uses pre-fetched seedIds directly and truncates to three", async () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo",
        sourceFile: "src/foo.ts",
        relationships: [{ type: "implements", target: "REQ-from-disk" }],
      },
    ]);

    const result = await derive({
      workspaceRoot: tmpDir,
      sourceFiles: [path.join(tmpDir, "src/foo.ts")],
      seedIds: ["REQ-001", "REQ-002", "REQ-003", "REQ-004"],
    });

    assert.deepEqual(result.seedIds, ["REQ-001", "REQ-002", "REQ-003"]);
  });

  test("prefers pre-fetched seedIds over focusFilePath derivation", async () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo",
        sourceFile: "src/foo.ts",
        relationships: [{ type: "implements", target: "REQ-DISK" }],
      },
    ]);

    const result = await derive({
      workspaceRoot: tmpDir,
      sourceFiles: [path.join(tmpDir, "src/foo.ts")],
      focusFilePath: path.join(tmpDir, "src/foo.ts"),
      seedIds: ["REQ-PREFETCHED"],
    });

    assert.deepEqual(result.seedIds, ["REQ-PREFETCHED"]);
  });

  test("derives seedIds from focusFilePath when no seedIds provided", async () => {
    writeSymbolsYaml([
      {
        id: "SYM-focus",
        sourceFile: "src/focus.ts",
        relationships: [
          { type: "implements", target: "REQ-FOCUS-1" },
          { type: "implements", target: "REQ-FOCUS-2" },
        ],
      },
    ]);

    const result = await derive({
      workspaceRoot: tmpDir,
      sourceFiles: [path.join(tmpDir, "src/other.ts")],
      focusFilePath: path.join(tmpDir, "src/focus.ts"),
    });

    assert.deepEqual(result.seedIds, ["REQ-FOCUS-1", "REQ-FOCUS-2"]);
  });

  test("derives seedIds from sourceFiles[0] when no focusFilePath and no seedIds", async () => {
    writeSymbolsYaml([
      {
        id: "SYM-first",
        sourceFile: "src/first.ts",
        relationships: [{ type: "implements", target: "REQ-FIRST-1" }],
      },
    ]);

    const result = await derive({
      workspaceRoot: tmpDir,
      sourceFiles: [path.join(tmpDir, "src/first.ts")],
    });

    assert.deepEqual(result.seedIds, ["REQ-FIRST-1"]);
  });

  test("derives seedIds from source-linked guidance when not pre-fetched", async () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo",
        sourceFile: "src/foo.ts",
        relationships: [
          { type: "implements", target: "REQ-001" },
          { type: "implements", target: "REQ-002" },
          { type: "implements", target: "REQ-003" },
          { type: "implements", target: "REQ-004" },
        ],
      },
    ]);

    const result = await derive({
      workspaceRoot: tmpDir,
      sourceFiles: [path.join(tmpDir, "src/foo.ts")],
    });

    assert.deepEqual(result.seedIds, ["REQ-001", "REQ-002", "REQ-003"]);
  });

  test("returns eligible when source-linked guidance finds no requirement IDs", async () => {
    writeSymbolsYaml([
      {
        id: "SYM-other",
        sourceFile: "src/other.ts",
        relationships: [{ type: "implements", target: "REQ-999" }],
      },
    ]);

    const result = await derive({
      workspaceRoot: tmpDir,
      sourceFiles: [path.join(tmpDir, "src/foo.ts")],
    });

    assert.equal(result.eligible, true);
    assert.deepEqual(result.seedIds, []);
    assert.deepEqual(result.sourceFiles, [path.join(tmpDir, "src/foo.ts")]);
  });

  test("multi-file fingerprint includes sorted source files", async () => {
    const result = await derive({
      workspaceRoot: "/repo",
      branch: "develop",
      sourceFiles: ["/repo/src/b.ts", "/repo/src/a.ts"],
      riskClass: "traceability_candidate",
    });

    assert.equal(
      result.fingerprint,
      "brief:/repo\0develop\0traceability_candidate\0/repo/src/a.ts\0/repo/src/b.ts",
    );
    assert.deepEqual(result.sourceFiles, ["/repo/src/a.ts", "/repo/src/b.ts"]);
  });

  test("focusFilePath does not appear in fingerprint or sourceFiles", async () => {
    const result = await derive({
      workspaceRoot: "/repo",
      branch: "main",
      sourceFiles: ["/repo/src/main.ts"],
      focusFilePath: "/repo/src/main.ts",
      riskClass: "behavior_candidate",
    });

    assert.equal(
      result.fingerprint,
      "brief:/repo\0main\0behavior_candidate\0/repo/src/main.ts",
    );
    assert.deepEqual(result.sourceFiles, ["/repo/src/main.ts"]);
  });
});
