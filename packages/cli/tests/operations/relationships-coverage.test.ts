// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  classifySupersedesHistory,
  dependentRelationshipsGoal,
  existingRelationships,
  firstGitAdditionCommit,
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
  formatRelationshipSourceMismatch,
  RELATIONSHIP_TYPES,
  validateLiveRelationshipTargets,
  validateRelationshipSources,
  validateStrictLanePairing,
  validateSupersedesSourceHistory,
} from "../../src/operations/mutation/relationships.js";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";
import { createGitWorkspace, removeTempDir } from "../helpers/in-process-workspace.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function prolog(
  query: (goal: string) => Promise<unknown>,
  extras: Partial<PrologPort> = {},
): PrologPort {
  return {
    query: query as unknown as PrologPort["query"],
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
    ...extras,
  };
}

describe("relationship recipes and source guards", () => {
  test("formats typed recipes and source mismatches", () => {
    expect(
      formatInvalidRelationshipTuple({
        relType: "verified_by",
        fromType: "fact",
        toType: "test",
      }),
    ).toContain("Facts are not directly verified");
    expect(
      formatInvalidRelationshipTuple({
        relType: "validates",
        fromType: "test",
        toType: "fact",
      }),
    ).toContain("Tests validate requirements");
    expect(
      formatInvalidRelationshipTuple({
        relType: "verified_by",
        fromType: "req",
        toType: "scenario",
      }),
    ).toContain("req/scenario -> test");
    expect(
      formatInvalidRelationshipTuple({
        relType: "validates",
        fromType: "scenario",
        toType: "req",
      }),
    ).toContain("test -> req/scenario");
    expect(
      formatInvalidRelationshipTuple({
        relType: "relates_to",
        fromType: "req",
        toType: "req",
      }),
    ).toContain("escape hatch");
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship: verified_by from req to scenario",
      ),
    ).toContain("verified_by");
    expect(
      formatInvalidRelationshipError(
        "Invalid relationship: ~w from ~w to ~w-[validates,test,fact]",
      ),
    ).toContain("validates");
    expect(formatInvalidRelationshipError("unrelated")).toBeNull();
    expect(() =>
      validateRelationshipSources("REQ-1", [
        { type: "verified_by", from: "REQ-2", to: "TEST-1" },
      ]),
    ).toThrow(/upsert REQ-2/);
    expect(
      formatRelationshipSourceMismatch("REQ-1", {
        type: "verified_by",
        from: "REQ-2",
        to: "TEST-1",
      }),
    ).toContain("from=REQ-2");
    expect(() =>
      formatRelationshipSourceMismatch("REQ-1", {
        type: "verified_by",
        from: "  ",
        to: "TEST-1",
      }),
    ).toThrow(/from must be a non-empty string/);
    expect(dependentRelationshipsGoal("REQ-1")).toContain(RELATIONSHIP_TYPES[0]);
  });
});

describe("supersedes history and live targets", () => {
  test("classifies ancestor, reversed, and unknown history", () => {
    expect(classifySupersedesHistory("/tmp", null, "abc")).toBe("unknown");
    expect(classifySupersedesHistory("/tmp", "abc", "abc")).toBe("valid");
    expect(
      classifySupersedesHistory("/tmp", "new", "old", {
        isAncestor: (_root, ancestor) => ancestor === "old",
      }),
    ).toBe("valid");
    expect(
      classifySupersedesHistory("/tmp", "old", "new", {
        isAncestor: (_root, ancestor, descendant) =>
          ancestor === "old" && descendant === "new",
      }),
    ).toBe("reversed");
    expect(
      classifySupersedesHistory("/tmp", "a", "b", {
        isAncestor: () => null,
      }),
    ).toBe("unknown");
  });

  test("firstGitAdditionCommit returns null for protocol sources and git failures", () => {
    expect(firstGitAdditionCommit("/tmp", "mcp://kibi/upsert")).toBeNull();
    expect(firstGitAdditionCommit("/tmp", "")).toBeNull();
    const cwd = createGitWorkspace();
    tempDirs.push(cwd);
    try {
      expect(firstGitAdditionCommit(cwd, "docs/missing.md")).toBeNull();
    } finally {
      removeTempDir(cwd);
    }
  });

  test("validateSupersedesSourceHistory uses indexed sources and Prolog fallbacks", async () => {
    await validateSupersedesSourceHistory(
      prolog(async () => ({ success: true, bindings: {} }), {
        queryEntities: async () => ({
          entities: [{ source: "docs/old.md" }],
          count: 1,
        }),
      }),
      { id: "REQ-NEW", source: "docs/new.md" },
      [{ type: "supersedes", from: "REQ-NEW", to: "REQ-OLD" }],
      "/tmp",
      {
        firstAdditionCommit: (root, source) =>
          source.includes("new") ? "aaa" : source.includes("old") ? "bbb" : null,
        isAncestor: (_root, ancestor) => ancestor === "bbb",
      },
    );

    await expect(
      validateSupersedesSourceHistory(
        prolog(async () => ({
          success: true,
          bindings: { TargetSource: "'docs/new.md'" },
        })),
        { id: "REQ-OLD", source: "docs/old.md" },
        [{ type: "supersedes", from: "REQ-OLD", to: "REQ-NEW" }],
        "/tmp",
        {
          firstAdditionCommit: (_root, source) =>
            source.includes("old") ? "old" : source.includes("new") ? "new" : null,
          isAncestor: (_root, ancestor, descendant) =>
            ancestor === "old" && descendant === "new",
        },
      ),
    ).rejects.toThrow(/predates/);

    await validateSupersedesSourceHistory(
      prolog(async () => ({ success: false, bindings: {} })),
      { id: "REQ-NEW" },
      [{ type: "relates_to", from: "REQ-NEW", to: "REQ-OTHER" }],
      "/tmp",
    );
  });

  test("validateLiveRelationshipTargets skips missing endpoints and rejects invalid tuples", async () => {
    await validateLiveRelationshipTargets(
      prolog(async (goal) => {
        if (goal.includes("kb_entity('TEST-1'")) {
          throw new Error("lookup failed");
        }
        if (goal.includes("kb:validate_relationship")) {
          return { success: false, bindings: {} };
        }
        return { success: true, bindings: { Type: "'req'" } };
      }),
      { id: "REQ-1", type: "req" },
      [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
    );

    await expect(
      validateLiveRelationshipTargets(
        prolog(async (goal) => {
          if (goal.includes("kb_entity('TEST-1'")) {
            return { success: true, bindings: { Type: "test" } };
          }
          if (goal.includes("kb:validate_relationship")) {
            return { success: false, bindings: {} };
          }
          return { success: true, bindings: { Type: "req" } };
        }),
        { id: "REQ-1", type: "req" },
        [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
      ),
    ).rejects.toThrow(/Invalid relationship/);

    await expect(
      validateLiveRelationshipTargets(
        prolog(async () => {
          throw "not-an-error";
        }),
        { id: "REQ-1", type: "req" },
        [{ type: "verified_by", from: "REQ-1", to: "TEST-MISSING" }],
      ),
    ).rejects.toBe("not-an-error");
  });

  test("validateStrictLanePairing rejects wrong fact kinds", async () => {
    await expect(
      validateStrictLanePairing(
        prolog(async () => ({ success: false, bindings: {} })),
        [{ type: "requires_rule", from: "REQ-1", to: "FACT-1" }],
      ),
    ).rejects.toThrow(/fact_kind=rule/);
    await expect(
      validateStrictLanePairing(
        prolog(async () => ({ success: true, bindings: {} })),
        [{ type: "constrains", from: "REQ-1", to: "FACT-PROP" }],
      ),
    ).rejects.toThrow(/subject/);
    await expect(
      validateStrictLanePairing(
        prolog(async () => ({ success: true, bindings: {} })),
        [{ type: "requires_property", from: "REQ-1", to: "FACT-SUB" }],
      ),
    ).rejects.toThrow(/property_value/);
    await validateStrictLanePairing(
      prolog(async () => ({ success: false, bindings: {} })),
      [{ type: "relates_to", from: "REQ-1", to: "REQ-2" }],
    );
  });

  test("existingRelationships collects forward and reverse edges", async () => {
    const rows = await existingRelationships(
      prolog(async (goal) => {
        if (goal.includes("findall(To") && goal.includes("verified_by")) {
          return { success: true, bindings: { Targets: "['TEST-1']" } };
        }
        if (goal.includes("findall(From") && goal.includes("implements")) {
          return { success: true, bindings: { Sources: "['SYM-1']" } };
        }
        return { success: true, bindings: { Targets: "[]", Sources: "[]" } };
      }),
      "REQ-1",
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        { type: "verified_by", from: "REQ-1", to: "TEST-1" },
        { type: "implements", from: "SYM-1", to: "REQ-1" },
      ]),
    );
  });
});
