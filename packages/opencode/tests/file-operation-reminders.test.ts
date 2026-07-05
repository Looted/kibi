// implements REQ-opencode-file-context-guidance-v1
import { describe, expect, test } from "bun:test";
import { deriveFileOperationReminder } from "../src/file-operation-reminders.js";
import type { PathKind } from "../src/path-kind.js";
import type { RiskClass } from "../src/risk-classifier.js";

function derivePolicyReminder(overrides: Record<string, unknown> = {}) {
  return deriveFileOperationReminder({
    normalizedPath: "packages/opencode/src/existing.ts",
    lifecycle: "edited",
    pathKind: "code",
    linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
    e2eSignal: { level: "none", evidence: [], reminderText: null },
    currentSemanticRisk: "behavior_candidate",
    posture: "root_active",
    ...overrides,
  } as Parameters<typeof deriveFileOperationReminder>[0]);
}

describe("deriveFileOperationReminder", () => {
  describe("created lifecycle", () => {
    test("created code file returns new file reminder and kibi_write kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/new-file.ts",
        lifecycle: "created",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "traceability_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- New file detected. Add or update the necessary Kibi entities and traceability before completing this task.",
      );
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_write"]);
    });

    test("created requirement doc does NOT return new file reminder (not a code file)", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "documentation/requirements/REQ-001.md",
        lifecycle: "created",
        pathKind: "requirement",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "req_policy_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBeNull();
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual([]);
    });

    test("created code file in non-authoritative posture returns no reminder", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/new-file.ts",
        lifecycle: "created",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "traceability_candidate",
        posture: "root_uninitialized",
      });

      expect(result.lifecycleReminder).toBeNull();
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual([]);
    });

    test("created code file in hybrid_root_plus_vendored posture returns reminder", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/new-file.ts",
        lifecycle: "created",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "traceability_candidate",
        posture: "hybrid_root_plus_vendored",
      });

      expect(result.lifecycleReminder).toBe(
        "- New file detected. Add or update the necessary Kibi entities and traceability before completing this task.",
      );
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_write"]);
    });
  });

  describe("edited lifecycle", () => {
    test("edited risky code file returns advisory lifecycle guidance", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/existing.ts",
        lifecycle: "edited",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_active",
      });

      expect(result.policyDecision).toBe("advisory_guidance");
      expect(result.lifecycleReminder).toContain("Edited source file detected");
      expect(result.lifecycleReminder).toContain("kb_check");
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_write"]);
    });

    test("edited risky code file prompts impact-enabled kb_check guidance", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/existing.ts",
        lifecycle: "edited",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_active",
      });

      const reminder = result.lifecycleReminder ?? "";
      expect(reminder).toContain("kb_check");
      expect(reminder).toContain("includeImpactDiagnostics");
      expect(reminder).toContain("includeWorkingTreeDiff");
      expect(reminder).toContain("packages/opencode/src/existing.ts");
      expect(reminder).toContain("semantic review");
      expect(reminder).toContain("linked requirements/tests");
    });

    test("edited safe_docs_only file returns no lifecycle reminder", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "README.md",
        lifecycle: "edited",
        pathKind: "unknown",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "safe_docs_only",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBeNull();
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual([]);
    });
  });

  describe("hard enforcement policy", () => {
    test("edited relevant file with authoritative hard mode and no checkpoint evidence returns hard block", () => {
      const result = derivePolicyReminder({
        effectiveMode: "hard",
        checkpointEvidence: false,
      });

      expect(result.policyDecision).toBe("hard_block");
      expect(result.lifecycleReminder).toContain(
        "Hard Kibi checkpoint required",
      );
      expect(result.lifecycleReminder).toContain(
        "packages/opencode/src/existing.ts",
      );
      expect(result.lifecycleReminder).toContain("kb_check");
      expect(result.reminderKindsToMark).toContain("kibi_write");
    });

    test("deleted file with no linked IDs in hard mode hard-blocks with sourceFile cleanup guidance", () => {
      const result = derivePolicyReminder({
        normalizedPath: "packages/opencode/src/no-links.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        currentSemanticRisk: "safe_docs_only",
        effectiveMode: "hard",
        checkpointEvidence: false,
      });

      expect(result.policyDecision).toBe("hard_block");
      expect(result.lifecycleReminder).toContain("kb_search");
      expect(result.lifecycleReminder).toContain("kb_query");
      expect(result.lifecycleReminder).toContain("sourceFile");
      expect(result.lifecycleReminder).toContain(
        "packages/opencode/src/no-links.ts",
      );
      expect(result.lifecycleReminder).toContain("kb_upsert");
      expect(result.reminderKindsToMark).toContain("kibi_delete");
    });

    test("created test file in hard mode returns hard block", () => {
      const result = derivePolicyReminder({
        normalizedPath: "packages/opencode/tests/new-policy.test.ts",
        lifecycle: "created",
        pathKind: "test" satisfies PathKind,
        linkedEntityResult: { ids: [], source: "none" },
        currentSemanticRisk: "safe_test_only" satisfies RiskClass,
        effectiveMode: "hard",
        checkpointEvidence: false,
      });

      expect(result.policyDecision).toBe("hard_block");
      expect(result.lifecycleReminder).toContain(
        "packages/opencode/tests/new-policy.test.ts",
      );
      expect(result.reminderKindsToMark).toContain("kibi_write");
    });

    test("created config and symbol-manifest files in hard mode return hard blocks", () => {
      const configResult = derivePolicyReminder({
        normalizedPath: "bunfig.toml",
        lifecycle: "created",
        pathKind: "unknown" satisfies PathKind,
        linkedEntityResult: { ids: [], source: "none" },
        currentSemanticRisk: "safe_docs_only" satisfies RiskClass,
        effectiveMode: "hard",
        checkpointEvidence: false,
      });
      const symbolManifestResult = derivePolicyReminder({
        normalizedPath: "documentation/symbols.yaml",
        lifecycle: "created",
        pathKind: "symbol" satisfies PathKind,
        linkedEntityResult: { ids: [], source: "none" },
        currentSemanticRisk: "kb_doc_structural" satisfies RiskClass,
        effectiveMode: "hard",
        checkpointEvidence: false,
      });

      expect(configResult.policyDecision).toBe("hard_block");
      expect(configResult.lifecycleReminder).toContain("bunfig.toml");
      expect(symbolManifestResult.policyDecision).toBe("hard_block");
      expect(symbolManifestResult.lifecycleReminder).toContain(
        "documentation/symbols.yaml",
      );
    });

    test("non-authoritative vendored root in hard mode skips lifecycle enforcement", () => {
      const result = derivePolicyReminder({
        effectiveMode: "hard",
        posture: "vendored_only",
        workContext: {
          worktreeRoot: "/repo/vendor/kibi",
          kibiAuthorityRoot: "/repo",
          branch: "main",
          repoRelativePath: "vendor/kibi/packages/opencode/src/file.ts",
          posture: "vendored_only",
          isAuthoritative: false,
          isLinkedWorktree: false,
          sessionId: undefined,
          agentIdentity: "test",
        },
        checkpointEvidence: false,
      });

      expect(result.policyDecision).toBe("skip_non_authoritative");
      expect(result.lifecycleReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual([]);
    });

    test("advisory mode with edited file returns advisory guidance instead of hard block", () => {
      const result = derivePolicyReminder({
        effectiveMode: "advisory",
        checkpointEvidence: false,
      });

      expect(result.policyDecision).toBe("advisory_guidance");
      expect(result.lifecycleReminder).toContain("Edited source file detected");
      expect(result.lifecycleReminder).toContain("kb_check");
      expect(result.lifecycleReminder).not.toContain(
        "Hard Kibi checkpoint required",
      );
    });

    test("multiple dirty files aggregate into one hard block with five shown paths and remaining count", () => {
      const result = derivePolicyReminder({
        lifecycleEvents: [
          { normalizedPath: "src/one.ts", lifecycle: "edited" },
          { normalizedPath: "src/two.ts", lifecycle: "created" },
          { normalizedPath: "tests/three.test.ts", lifecycle: "created" },
          { normalizedPath: "docs/four.md", lifecycle: "edited" },
          { normalizedPath: "documentation/symbols.yaml", lifecycle: "edited" },
          { normalizedPath: "src/six.ts", lifecycle: "deleted" },
          { normalizedPath: "src/seven.ts", lifecycle: "edited" },
        ],
        pathKinds: [
          "code",
          "code",
          "test",
          "unknown",
          "symbol",
          "code",
          "code",
        ],
        linkedEntityResults: [
          { ids: ["REQ-1"], source: "symbols" },
          { ids: [], source: "none" },
          { ids: [], source: "none" },
          { ids: [], source: "none" },
          { ids: ["SYM-1"], source: "doc-path" },
          { ids: [], source: "none" },
          { ids: [], source: "none" },
        ],
        effectiveMode: "hard",
        checkpointEvidence: false,
      });

      const hardBlock = result.lifecycleReminder ?? "";
      const shownPathBullets = hardBlock.match(/^- `[^`]+`/gm) ?? [];
      expect(result.policyDecision).toBe("hard_block");
      expect(shownPathBullets).toHaveLength(5);
      expect(hardBlock).toContain("+2 more dirty files");
      expect(hardBlock).not.toContain("src/six.ts` (deleted)");
    });
  });

  describe("deleted lifecycle", () => {
    test("deleted file with linked IDs returns reminder with IDs and kibi_delete kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/deleted.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: {
          ids: ["REQ-001", "TEST-002"],
          source: "symbols",
        },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- Deleted file had linked Kibi entities: REQ-001, TEST-002. Update Kibi to keep traceability accurate.",
      );
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_delete"]);
    });

    test("deleted file with doc-path identity returns reminder with ID and kibi_delete kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "documentation/requirements/REQ-001.md",
        lifecycle: "deleted",
        pathKind: "requirement",
        linkedEntityResult: { ids: ["REQ-001"], source: "doc-path" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "req_policy_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- Deleted file had linked Kibi entities: REQ-001. Update Kibi to keep traceability accurate.",
      );
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_delete"]);
    });

    test("deleted file without linked IDs returns reminder without IDs and kibi_delete kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/no-links.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "safe_docs_only",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- Deleted file had no linked Kibi entities. Update Kibi if this removal changes documented behavior or traceability.",
      );
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_delete"]);
    });

    test("deleted file in non-authoritative posture returns no reminder", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/deleted.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: {
          ids: ["REQ-001"],
          source: "symbols",
        },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_partial",
      });

      expect(result.lifecycleReminder).toBeNull();
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual([]);
    });
  });

  describe("e2e reminders", () => {
    test("exact e2e with non-delete lifecycle returns e2e reminder and e2e_write kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/existing.ts",
        lifecycle: "edited",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: {
          level: "exact",
          evidence: ["TEST-001"],
          reminderText:
            "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
        },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toContain("Edited source file detected");
      expect(result.lifecycleReminder).toContain("kb_check");
      expect(result.e2eReminder).toBe(
        "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
      );
      expect(result.reminderKindsToMark).toEqual(["kibi_write", "e2e_write"]);
    });

    test("exact e2e with delete lifecycle returns e2e reminder and e2e_delete kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/deleted.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: {
          level: "exact",
          evidence: ["TEST-001"],
          reminderText:
            "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
        },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- Deleted file had linked Kibi entities: REQ-001. Update Kibi to keep traceability accurate.",
      );
      expect(result.e2eReminder).toBe(
        "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
      );
      expect(result.reminderKindsToMark).toEqual(["kibi_delete", "e2e_delete"]);
    });

    test("heuristic e2e with non-delete lifecycle returns e2e reminder and e2e_write kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/existing.ts",
        lifecycle: "edited",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: {
          level: "heuristic",
          evidence: ["TEST-001 (doc names path: ...)"],
          reminderText:
            "- This file may have related e2e coverage. Check linked e2e tests if this change affects behavior.",
        },
        currentSemanticRisk: "traceability_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toContain("Edited source file detected");
      expect(result.lifecycleReminder).toContain("kb_check");
      expect(result.e2eReminder).toBe(
        "- This file may have related e2e coverage. Check linked e2e tests if this change affects behavior.",
      );
      expect(result.reminderKindsToMark).toEqual(["kibi_write", "e2e_write"]);
    });

    test("heuristic e2e with delete lifecycle returns e2e reminder and e2e_delete kind", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/deleted.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: {
          level: "heuristic",
          evidence: ["TEST-001 (doc names path: ...)"],
          reminderText:
            "- This file may have related e2e coverage. Check linked e2e tests if this change affects behavior.",
        },
        currentSemanticRisk: "traceability_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- Deleted file had linked Kibi entities: REQ-001. Update Kibi to keep traceability accurate.",
      );
      expect(result.e2eReminder).toBe(
        "- This file may have related e2e coverage. Check linked e2e tests if this change affects behavior.",
      );
      expect(result.reminderKindsToMark).toEqual(["kibi_delete", "e2e_delete"]);
    });

    test("no e2e signal returns no e2e reminder", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/existing.ts",
        lifecycle: "edited",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: { level: "none", evidence: [], reminderText: null },
        currentSemanticRisk: "behavior_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toContain("Edited source file detected");
      expect(result.lifecycleReminder).toContain("kb_check");
      expect(result.e2eReminder).toBeNull();
      expect(result.reminderKindsToMark).toEqual(["kibi_write"]);
    });

    test("e2e reminders are NOT posture-gated (emitted even in non-authoritative posture)", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/existing.ts",
        lifecycle: "edited",
        pathKind: "code",
        linkedEntityResult: { ids: ["REQ-001"], source: "symbols" },
        e2eSignal: {
          level: "exact",
          evidence: ["TEST-001"],
          reminderText:
            "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
        },
        currentSemanticRisk: "behavior_candidate",
        posture: "vendored_only",
      });

      expect(result.lifecycleReminder).toBeNull();
      expect(result.e2eReminder).toBe(
        "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
      );
      expect(result.reminderKindsToMark).toEqual(["e2e_write"]);
    });
  });

  describe("combined reminders", () => {
    test("created code file with exact e2e returns both lifecycle and e2e reminders", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/new.ts",
        lifecycle: "created",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: {
          level: "exact",
          evidence: ["TEST-001"],
          reminderText:
            "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
        },
        currentSemanticRisk: "traceability_candidate",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- New file detected. Add or update the necessary Kibi entities and traceability before completing this task.",
      );
      expect(result.e2eReminder).toBe(
        "- This file has existing e2e coverage. Check whether e2e tests and linked TEST entities need updates.",
      );
      expect(result.reminderKindsToMark).toEqual(["kibi_write", "e2e_write"]);
    });

    test("deleted file with no linked IDs and heuristic e2e returns both lifecycle and e2e reminders", () => {
      const result = deriveFileOperationReminder({
        normalizedPath: "packages/opencode/src/deleted.ts",
        lifecycle: "deleted",
        pathKind: "code",
        linkedEntityResult: { ids: [], source: "none" },
        e2eSignal: {
          level: "heuristic",
          evidence: ["TEST-001 (doc names path: ...)"],
          reminderText:
            "- This file may have related e2e coverage. Check linked e2e tests if this change affects behavior.",
        },
        currentSemanticRisk: "safe_docs_only",
        posture: "root_active",
      });

      expect(result.lifecycleReminder).toBe(
        "- Deleted file had no linked Kibi entities. Update Kibi if this removal changes documented behavior or traceability.",
      );
      expect(result.e2eReminder).toBe(
        "- This file may have related e2e coverage. Check linked e2e tests if this change affects behavior.",
      );
      expect(result.reminderKindsToMark).toEqual(["kibi_delete", "e2e_delete"]);
    });
  });
});
