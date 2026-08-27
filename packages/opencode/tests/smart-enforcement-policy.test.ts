import { describe, expect, test } from "bun:test";
import type { CheckpointEvidence } from "../src/enforcement-policy";
import { computeEnforcementPolicy } from "../src/enforcement-policy";
import type { KbFreshnessEvidence } from "../src/kb-freshness-state";
import type { PathKind } from "../src/path-kind";
import { buildPrompt } from "../src/prompt";
import type { WorkContext } from "../src/work-context-resolver";

describe("smart enforcement policy", () => {
  test("authoritative risky edits use generic Kibi guidance without briefing cues", () => {
    const prompt = buildPrompt({
      recentEdits: [{ path: "src/app.ts", kind: "code" }],
      focusEdit: { path: "src/app.ts", kind: "code" },
      posture: "root_active",
      riskClass: "behavior_candidate",
      workspaceRoot: process.cwd(),
      branch: "main",
    });

    expect(prompt).toContain("Code changes detected");
    expect(prompt).not.toContain("/brief-kibi");
    expect(prompt).not.toContain("kb_briefing_generate");
    expect(prompt).not.toContain("Kibi briefing available");
  });

  test("hard mode treats non-boolean checkpoint evidence without freshness as unresolved", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "edited" }],
      pathKinds: ["code"],
      checkpointEvidence: {},
      posture: "root_active",
    });

    expect(result.kind).toBe("hard_block");
    expect(result.affectedPaths).toEqual(["src/app.ts"]);
    expect(result.dirtyFileCount).toBe(1);
    expect(result.text).toContain("Hard Kibi checkpoint required");
    expect(result.text).toContain("typed Kibi status");
    expect(result.text).toContain("kibi-usage");
    expect(result.text).toContain("kibi-freshness");
    expect(result.text).toContain("kibi-traceability");
    expect(result.text).toContain("Never read or edit `.kb/` files directly");
  });

  test("hard mode accepts checkpoint evidence when freshness evaluation allows completion", () => {
    const freshness: KbFreshnessEvidence = {
      agentIdentity: "agent",
      worktree: "/repo",
      branch: "main",
      fingerprint: "fingerprint",
      changedFiles: ["src/app.ts"],
      kbStatus: true,
      sourceLinkedDiscovery: true,
      kbMutation: true,
      kbCheck: true,
      decision: "updated",
    };

    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "edited" }],
      pathKinds: ["code"],
      checkpointEvidence: { freshness },
      posture: "root_active",
    });

    expect(result).toMatchObject({
      kind: "checkpoint_passed",
      affectedPaths: ["src/app.ts"],
      dirtyFileCount: 1,
      text: null,
    });
  });

  test("hard mode accepts each legacy boolean checkpoint evidence field", () => {
    const legacyEvidenceCases: CheckpointEvidence[] = [
      { hasCheckpoint: true },
      { hasCheckpoint: false, kbSearch: true },
      { hasCheckpoint: false, kbSearch: false, sourceFileQuery: true },
      {
        hasCheckpoint: false,
        kbSearch: false,
        sourceFileQuery: false,
        kbStatus: true,
      },
      {
        hasCheckpoint: false,
        kbSearch: false,
        sourceFileQuery: false,
        kbStatus: false,
        kbCheck: true,
      },
      {
        hasCheckpoint: false,
        kbSearch: false,
        sourceFileQuery: false,
        kbStatus: false,
        kbCheck: false,
        kbUpsert: true,
      },
    ];

    for (const checkpointEvidence of legacyEvidenceCases) {
      const result = computeEnforcementPolicy({
        effectiveMode: "hard",
        lifecycleEvents: [
          { normalizedPath: "src/app.ts", lifecycle: "edited" },
        ],
        pathKinds: ["code"],
        checkpointEvidence,
        posture: "root_active",
      });

      expect(result.kind).toBe("checkpoint_passed");
      expect(result.dirtyFileCount).toBe(1);
    }
  });

  test("normalizes linkedEntityIds when an aligned index is undefined", () => {
    const linkedEntityIds: Array<string[] | undefined> = [
      undefined,
      ["REQ-linked"],
    ];

    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [
        { normalizedPath: "src/without-link.ts", lifecycle: "edited" },
        { normalizedPath: "src/with-link.ts", lifecycle: "edited" },
      ],
      pathKinds: ["code", "code"],
      linkedEntityIds: linkedEntityIds as string[][],
      posture: "root_active",
    });

    expect(result.kind).toBe("hard_block");
    expect(result.text).toContain("`src/without-link.ts` (edited, code)");
    expect(result.text).toContain(
      "`src/with-link.ts` (edited, code; linked: REQ-linked)",
    );
    expect(result.text).toContain("Linked IDs detected: REQ-linked.");
  });

  test("normalizes deleted and edited e2e signals into reminder kinds and evidence text", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [
        { normalizedPath: "src/removed.ts", lifecycle: "deleted" },
        { normalizedPath: "src/changed.ts", lifecycle: "edited" },
      ],
      pathKinds: ["code", "code"],
      e2eSignals: [
        {
          level: "exact",
          evidence: ["tests/e2e/remove.spec.ts"],
          reminderText: "Update delete e2e coverage.",
        },
        {
          level: "heuristic",
          evidence: ["tests/e2e/change.spec.ts"],
          reminderText: "Update write e2e coverage.",
        },
      ],
      posture: "root_active",
    });

    expect(result.kind).toBe("hard_block");
    expect(result.e2eReminder).toBe("Update delete e2e coverage.");
    expect(result.reminderKindsToMark).toEqual([
      "kibi_delete",
      "e2e_delete",
      "kibi_write",
      "e2e_write",
    ]);
    expect(result.text).toContain(
      "Existing e2e evidence: tests/e2e/remove.spec.ts, tests/e2e/change.spec.ts.",
    );
  });

  test("ignores lifecycle events whose path kind is ignored", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [{ normalizedPath: "dist/app.js", lifecycle: "edited" }],
      pathKinds: ["ignored" as PathKind],
      posture: "root_active",
    });

    expect(result).toMatchObject({
      kind: "checkpoint_passed",
      affectedPaths: [],
      dirtyFileCount: 0,
      e2eReminder: null,
      reminderKindsToMark: [],
      text: null,
    });
  });

  test("hard mode returns checkpoint_passed immediately when checkpoint evidence is true", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "deleted" }],
      pathKinds: ["code"],
      linkedEntityResults: [{ ids: ["REQ-001"], source: "symbols" }],
      checkpointEvidence: true,
      posture: "root_active",
    });

    expect(result).toMatchObject({
      kind: "checkpoint_passed",
      affectedPaths: ["src/app.ts"],
      dirtyFileCount: 1,
      reminderKindsToMark: ["kibi_delete"],
      text: null,
    });
  });

  test("advisory mode passes checkpoint when no lifecycle events are relevant", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [
        { normalizedPath: "tests/unit/app.test.ts", lifecycle: "created" },
      ],
      pathKinds: ["test"],
      posture: "root_active",
    });

    expect(result).toMatchObject({
      kind: "checkpoint_passed",
      affectedPaths: [],
      dirtyFileCount: 0,
      text: null,
    });
  });

  test("advisory text describes created files", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: "src/new.ts", lifecycle: "created" }],
      pathKinds: ["code"],
      posture: "root_active",
    });

    expect(result.kind).toBe("advisory_guidance");
    expect(result.text).toContain("New file detected");
  });

  test("advisory text describes edited files", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [
        { normalizedPath: "src/existing.ts", lifecycle: "edited" },
      ],
      pathKinds: ["code"],
      posture: "root_active",
    });

    expect(result.kind).toBe("advisory_guidance");
    expect(result.text).toContain("Edited source file detected");
    expect(result.text).toContain("kb_check");
    expect(result.text).toContain("includeImpactDiagnostics");
    expect(result.text).toContain("src/existing.ts");
  });

  test("advisory text describes deleted files with and without linked ids", () => {
    const withoutLinks = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: "src/old.ts", lifecycle: "deleted" }],
      pathKinds: ["code"],
      posture: "root_active",
    });
    const withLinks = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [
        { normalizedPath: "src/linked.ts", lifecycle: "deleted" },
      ],
      pathKinds: ["code"],
      linkedEntityResults: [{ ids: ["REQ-123"], source: "symbols" }],
      posture: "root_active",
    });

    expect(withoutLinks.kind).toBe("advisory_guidance");
    expect(withoutLinks.text).toContain(
      "Deleted file had no linked Kibi entities",
    );
    expect(withLinks.kind).toBe("advisory_guidance");
    expect(withLinks.text).toContain(
      "Deleted file had linked Kibi entities: REQ-123",
    );
  });

  test("uses resolved context authoritativeness instead of posture fallback", () => {
    const authoritativeContext: WorkContext = {
      worktreeRoot: "/repo/vendor/pkg",
      kibiAuthorityRoot: "/repo",
      branch: "main",
      repoRelativePath: "vendor/pkg/src/app.ts",
      posture: "vendored_only",
      isAuthoritative: true,
      isLinkedWorktree: false,
      sessionId: undefined,
      agentIdentity: "agent",
    };
    const nonAuthoritativeContext: WorkContext = {
      worktreeRoot: "/repo",
      kibiAuthorityRoot: "/repo",
      branch: "main",
      repoRelativePath: "src/app.ts",
      posture: "root_active",
      isAuthoritative: false,
      isLinkedWorktree: false,
      sessionId: undefined,
      agentIdentity: "agent",
    };

    const authoritativeResult = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "edited" }],
      pathKinds: ["code"],
      posture: "vendored_only",
      resolvedContext: authoritativeContext,
    });
    const nonAuthoritativeResult = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "edited" }],
      pathKinds: ["code"],
      posture: "root_active",
      resolvedContext: nonAuthoritativeContext,
    });

    expect(authoritativeResult.kind).toBe("advisory_guidance");
    expect(nonAuthoritativeResult.kind).toBe("skip_non_authoritative");
  });

  test("hard mode skips non-authoritative postures", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "edited" }],
      pathKinds: ["code"],
      posture: "vendored_only",
    });

    expect(result).toMatchObject({
      kind: "skip_non_authoritative",
      reason: "Hard enforcement only applies to authoritative Kibi roots.",
      affectedPaths: ["src/app.ts"],
      dirtyFileCount: 1,
      e2eReminder: null,
      reminderKindsToMark: [],
      text: null,
    });
  });

  test("advisory mode skips non-authoritative postures", () => {
    const result = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: "src/app.ts", lifecycle: "edited" }],
      pathKinds: ["code"],
      posture: "vendored_only",
    });

    expect(result).toMatchObject({
      kind: "skip_non_authoritative",
      reason: "Lifecycle guidance is skipped outside authoritative Kibi roots.",
      affectedPaths: ["src/app.ts"],
      dirtyFileCount: 1,
      e2eReminder: null,
      reminderKindsToMark: [],
      text: null,
    });
  });

  test("hard block describes created files and summarizes remaining dirty files", () => {
    const lifecycleEvents = [
      { normalizedPath: "src/created-0.ts", lifecycle: "created" },
      { normalizedPath: "src/edited-1.ts", lifecycle: "edited" },
      { normalizedPath: "src/edited-2.ts", lifecycle: "edited" },
      { normalizedPath: "src/edited-3.ts", lifecycle: "edited" },
      { normalizedPath: "src/edited-4.ts", lifecycle: "edited" },
      { normalizedPath: "src/edited-5.ts", lifecycle: "edited" },
      { normalizedPath: "src/edited-6.ts", lifecycle: "edited" },
    ] as const;

    const result = computeEnforcementPolicy({
      effectiveMode: "hard",
      lifecycleEvents: [...lifecycleEvents],
      pathKinds: lifecycleEvents.map(() => "code"),
      posture: "root_active",
    });

    expect(result.kind).toBe("hard_block");
    if (result.kind !== "hard_block") {
      throw new Error(`Expected hard_block, got ${result.kind}`);
    }
    expect(result.shownPaths).toEqual([
      "src/created-0.ts",
      "src/edited-1.ts",
      "src/edited-2.ts",
      "src/edited-3.ts",
      "src/edited-4.ts",
    ]);
    expect(result.remainingCount).toBe(2);
    expect(result.text).toContain("`src/created-0.ts` (created, code)");
    expect(result.text).toContain("- +2 more dirty files");
  });

  test("advisory mode emits guidance for relevant events when resolved context is authoritative", () => {
    const resolvedContext: WorkContext = {
      worktreeRoot: "/repo/vendor/pkg",
      kibiAuthorityRoot: "/repo",
      branch: "main",
      repoRelativePath: "vendor/pkg/src/new.ts",
      posture: "vendored_only",
      isAuthoritative: true,
      isLinkedWorktree: false,
      sessionId: undefined,
      agentIdentity: "agent",
    };

    const result = computeEnforcementPolicy({
      effectiveMode: "advisory",
      lifecycleEvents: [{ normalizedPath: "src/new.ts", lifecycle: "created" }],
      pathKinds: ["code"],
      posture: "vendored_only",
      resolvedContext,
    });

    expect(result.kind).toBe("advisory_guidance");
    expect(result.affectedPaths).toEqual(["src/new.ts"]);
    expect(result.dirtyFileCount).toBe(1);
    expect(result.text).toContain("New file detected");
  });
});
