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
  editedFilePath: string | undefined;
  seedIds?: string[];
};

type BriefIntentResult = {
  eligible: boolean;
  reason: string;
  fingerprint: string;
  sourceFiles: string[];
  seedIds: string[];
  keepManualCue: boolean;
};

type BriefIntentModule = {
  deriveBriefIntent?: (params: BriefIntentParams) => BriefIntentResult;
};

function makeParams(overrides: Partial<BriefIntentParams> = {}): BriefIntentParams {
  return {
    riskClass: "behavior_candidate",
    posture: "root_active",
    maintenanceDegraded: false,
    workspaceRoot: "/workspace",
    branch: "feature/task-3",
    editedFilePath: "/workspace/src/foo.ts",
    ...overrides,
  };
}

async function loadModule(): Promise<BriefIntentModule> {
  try {
    return (await import("../src/brief-intent.js")) as unknown as BriefIntentModule;
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
    assert.equal(result.keepManualCue, true);
    assert.deepEqual(result.sourceFiles, ["/workspace/src/foo.ts"]);
    assert.deepEqual(result.seedIds, []);
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

  test("returns ineligible when editedFilePath is undefined", async () => {
    const result = await derive({ editedFilePath: undefined, seedIds: ["REQ-001"] });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("edited file"));
    assert.deepEqual(result.sourceFiles, []);
    assert.deepEqual(result.seedIds, []);
  });

  test("returns ineligible when editedFilePath is empty", async () => {
    const result = await derive({ editedFilePath: "" });

    assert.equal(result.eligible, false);
    assert.ok(result.reason.includes("edited file"));
    assert.deepEqual(result.sourceFiles, []);
    assert.deepEqual(result.seedIds, []);
  });

  test("produces identical fingerprint for the same params twice", async () => {
    const first = await derive({
      workspaceRoot: "/repo",
      branch: "feature/brief",
      editedFilePath: "/repo/packages/opencode/src/prompt.ts",
      riskClass: "traceability_candidate",
    });
    const second = await derive({
      workspaceRoot: "/repo",
      branch: "feature/brief",
      editedFilePath: "/repo/packages/opencode/src/prompt.ts",
      riskClass: "traceability_candidate",
    });

    assert.equal(first.fingerprint, second.fingerprint);
  });

  test("uses the exact fingerprint serialization pattern", async () => {
    const result = await derive({
      workspaceRoot: "/repo",
      branch: "feature/brief",
      editedFilePath: "/repo/src/feature.ts",
      riskClass: "behavior_candidate",
    });

    assert.equal(
      result.fingerprint,
      "brief:/repo\0feature/brief\0/repo/src/feature.ts\0behavior_candidate",
    );
  });

  test("keeps keepManualCue true even when result is ineligible", async () => {
    const result = await derive({ posture: "vendored_only" });

    assert.equal(result.keepManualCue, true);
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
      editedFilePath: path.join(tmpDir, "src/foo.ts"),
      seedIds: ["REQ-001", "REQ-002", "REQ-003", "REQ-004"],
    });

    assert.deepEqual(result.seedIds, ["REQ-001", "REQ-002", "REQ-003"]);
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
      editedFilePath: path.join(tmpDir, "src/foo.ts"),
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
      editedFilePath: path.join(tmpDir, "src/foo.ts"),
    });

    assert.equal(result.eligible, true);
    assert.deepEqual(result.seedIds, []);
    assert.deepEqual(result.sourceFiles, [path.join(tmpDir, "src/foo.ts")]);
  });
});
