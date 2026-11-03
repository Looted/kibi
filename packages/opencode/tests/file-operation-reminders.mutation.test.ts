import { describe, expect, test } from "bun:test";
import type { E2eCoverageSignal } from "../src/e2e-coverage-signals";
import { deriveFileOperationReminder } from "../src/file-operation-reminders";

function e2eKinds(
  e2eSignal: E2eCoverageSignal,
  lifecycle: "created" | "edited" | "deleted" = "edited",
) {
  const result = deriveFileOperationReminder({
    normalizedPath: "src/app.ts",
    lifecycle,
    pathKind: "code",
    linkedEntityResult: { ids: [], source: "none" },
    e2eSignal,
    currentSemanticRisk: "safe_docs_only",
    posture: "root_active",
  });
  return {
    kinds: result.reminderKindsToMark.filter((kind) => kind.startsWith("e2e")),
    e2eReminder: result.e2eReminder,
  };
}

describe("deriveFileOperationReminder e2e reminders", () => {
  test("a none-level signal adds no e2e reminder even with text", () => {
    expect(
      e2eKinds({ level: "none", evidence: [], reminderText: "run e2e" }).kinds,
    ).toStrictEqual([]);
  });

  test("a signal without reminder text adds no e2e reminder", () => {
    expect(
      e2eKinds({ level: "exact", evidence: ["x"], reminderText: null }).kinds,
    ).toStrictEqual([]);
  });

  test("an edit with an e2e signal marks e2e_write", () => {
    expect(
      e2eKinds({ level: "exact", evidence: ["x"], reminderText: "run e2e" }),
    ).toStrictEqual({ kinds: ["e2e_write"], e2eReminder: "run e2e" });
  });

  test("a delete with an e2e signal marks e2e_delete", () => {
    expect(
      e2eKinds(
        { level: "heuristic", evidence: ["x"], reminderText: "run e2e" },
        "deleted",
      ),
    ).toStrictEqual({ kinds: ["e2e_delete"], e2eReminder: "run e2e" });
  });
});

describe("deriveFileOperationReminder focus e2e kind", () => {
  test("marks e2e_delete for a deleted focus file the policy did not cover", () => {
    const result = deriveFileOperationReminder({
      normalizedPath: "src/app.ts",
      lifecycle: "deleted",
      pathKind: "code",
      linkedEntityResult: { ids: [], source: "none" },
      e2eSignal: { level: "exact", evidence: ["x"], reminderText: "run e2e" },
      currentSemanticRisk: "safe_docs_only",
      posture: "root_active",
      lifecycleEvents: [{ normalizedPath: "docs/a.md", lifecycle: "edited" }],
      pathKinds: ["unknown"],
      e2eSignals: [{ level: "none", evidence: [], reminderText: null }],
    });
    expect(
      result.reminderKindsToMark.filter((kind) => kind.startsWith("e2e")),
    ).toStrictEqual(["e2e_delete"]);
  });
});
