import { describe, expect, test } from "bun:test";
import type { SourceRepair } from "../../../src/operations/migration/source-paths.js";
import {
  SOURCE_PATH_DANGLING_RULE,
  sourcePathDanglingViolations,
} from "../../../src/public/operations/source-path-dangling.js";

const base = {
  entityId: "REQ-1",
  file: ".kb/requirements/REQ-1.md",
  dangling: true,
} as const;

function repair(extra: Record<string, unknown>): SourceRepair {
  return { ...base, ...extra } as unknown as SourceRepair;
}

describe("sourcePathDanglingViolations", () => {
  test("a text_ref that moved, and one that cannot be repaired", () => {
    const [moved, refused] = sourcePathDanglingViolations([
      repair({
        field: "text_ref",
        value: "docs/old.md",
        fix: { kind: "rewrite", to: "docs/new.md" },
      }),
      repair({
        field: "text_ref",
        value: "docs/gone.md",
        fix: { kind: "remove", reason: "dangling" },
        refused: "multi-line",
      }),
    ]);
    expect(moved).toStrictEqual({
      rule: SOURCE_PATH_DANGLING_RULE,
      entityId: "REQ-1",
      description:
        "REQ-1 names text_ref 'docs/old.md', a file path that does not exist in the workspace",
      suggestion:
        "The file moved to docs/new.md; kibi migrate rewrites the text_ref field there (source_path_rewrite).",
      source: ".kb/requirements/REQ-1.md",
      evidence: {
        field: "text_ref",
        value: "docs/old.md",
        file: ".kb/requirements/REQ-1.md",
        rewrite: "docs/new.md",
      },
    });
    expect(refused?.suggestion).toBe(
      "kibi migrate cannot repair this text_ref (multi-line), so it plans a review_source_path_dangling action. Point text_ref at the evidence file's current path, or clear it when the evidence is gone: kb_upsert with the entity's title, status and text_ref \"\".",
    );
    expect(refused?.evidence).toStrictEqual({
      field: "text_ref",
      value: "docs/gone.md",
      file: ".kb/requirements/REQ-1.md",
      remove: "dangling",
      refused: "multi-line",
    });
    const [kept] = sourcePathDanglingViolations([
      repair({
        field: "text_ref",
        value: "docs/x.md",
        fix: { kind: "remove", reason: "dangling" },
      }),
    ]);
    expect(kept?.suggestion).toBe(
      "The file moved to .kb/requirements/REQ-1.md; kibi migrate rewrites the text_ref field there (source_path_rewrite).",
    );
  });

  test("source fields: refused, rewritten, self and unmapped", () => {
    const compiled =
      "The compiled source is always the entity's own file (.kb/requirements/REQ-1.md), so the field carries nothing Kibi compiles.";
    const violations = sourcePathDanglingViolations([
      repair({
        field: "source",
        value: ["a"],
        fix: { kind: "remove", reason: "dangling" },
        refused: "multi-line",
      }),
      repair({
        field: "source",
        value: "old/x.ts",
        fix: { kind: "rewrite", to: "new/x.ts" },
      }),
      repair({
        field: "source",
        value: "REQ-1.md",
        fix: { kind: "remove", reason: "self" },
      }),
      repair({
        field: "source",
        value: "nowhere",
        fix: { kind: "remove", reason: "dangling" },
      }),
    ]);
    expect(violations.map((violation) => violation.suggestion)).toStrictEqual([
      `kibi migrate cannot edit this source field safely (multi-line), so it plans a review_source_path_dangling action for a person. ${compiled}`,
      `The file moved to new/x.ts; kibi migrate rewrites the source field there (source_path_rewrite). ${compiled}`,
      `kibi migrate removes this source field (source_path_rewrite) because it names the entity's own file. ${compiled}`,
      `kibi migrate removes this source field (source_path_rewrite) because nothing it names can be mapped. ${compiled}`,
    ]);
    expect(violations[0]?.description).toBe(
      `REQ-1 names source '["a"]', which is not an existing workspace path, an entity id or an http(s) URL`,
    );
    expect(violations[3]?.evidence).toStrictEqual({
      value: "nowhere",
      file: ".kb/requirements/REQ-1.md",
      remove: "dangling",
    });
  });
});
