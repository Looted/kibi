import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeDelete } from "../../src/operations/mutation/delete.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

function attachment(workspaceRoot: string, migrationRequired = false) {
  return {
    gitBranch: "develop",
    kbBranch: "develop",
    storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
    kind: "exact" as const,
    migrationRequired,
  };
}

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => PrologQueryResult,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async (goal) => query(Array.isArray(goal) ? goal.join(", ") : goal),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    prolog,
    branchAttachment: attachment(workspaceRoot),
    ...extras,
  };
}

describe("executeDelete guards and relationship preflight", () => {
  test("requires exactly one of ids or relationships and a Prolog runtime", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-del-cov-"));
    workspaces.push(root);
    await expect(
      executeDelete(
        { ids: [] },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00.000Z"),
          branchAttachment: attachment(root),
        },
      ),
    ).rejects.toThrow(/Prolog runtime/);
    await expect(
      executeDelete({ ids: [] }, contextFor(root, () => ({ success: true, bindings: {} }))),
    ).rejects.toThrow(/exactly one non-empty input/);
    await expect(
      executeDelete(
        {
          ids: ["REQ-1"],
          relationships: [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
        },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/exactly one non-empty input/);
    await expect(
      executeDelete(
        { relationships: [{ type: "verified_by", from: "REQ-1", to: "  " }] },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/type, from, and to/);
    await expect(
      executeDelete(
        { ids: ["REQ-1"] },
        contextFor(root, () => ({ success: true, bindings: {} }), {
          fs: nodeFilesystem,
          branchAttachment: attachment(root, true),
        }),
      ),
    ).rejects.toThrow(/legacy branch storage/);
    await expect(
      executeDelete(
        { ids: ["REQ-1"] },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00.000Z"),
          branchAttachment: { error: "no git" } as never,
        },
      ),
    ).rejects.toThrow(/Unable to resolve KB branch/);
  });

  test("skips missing entities, inspection failures, and loadEntity errors", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-del-skip-"));
    workspaces.push(root);
    const result = await executeDelete(
      { ids: ["REQ-MISS", "REQ-DEP"] },
      contextFor(root, (goal) => {
        if (goal === "once(kb_entity('REQ-MISS', _, _))") {
          return { success: false, bindings: {} };
        }
        if (goal.startsWith("once(kb_entity(")) {
          return { success: true, bindings: {} };
        }
        if (goal.includes("Dependents")) {
          return { success: false, bindings: {}, error: "inspect failed" };
        }
        return { success: true, bindings: { Results: "[]" } };
      }),
    );
    expect(result.structuredContent?.errors.join(" ")).toContain(
      "REQ-MISS does not exist",
    );
    expect(result.structuredContent?.errors.join(" ")).toContain(
      "Failed to inspect dependents",
    );
    await expect(
      executeDelete(
        { ids: ["REQ-LOAD"] },
        contextFor(root, (goal) => {
          if (goal.startsWith("once(kb_entity(")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['REQ-LOAD'")) {
            return { success: false, bindings: {}, error: "store down" };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/Failed to load metadata/);
  });

  test("applies compiled deletion when sourcePlanApplication is set", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-del-apply-"));
    workspaces.push(root);
    const result = await executeDelete(
      { ids: ["FACT-PLAN"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['FACT-PLAN'")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['FACT-PLAN',fact,[id='FACT-PLAN',title=\"Fact\",source=\"test://fact\"]]]",
              },
            };
          }
          if (goal.startsWith("rdf_transaction(")) {
            return { success: true, bindings: {} };
          }
          return { success: false, bindings: {} };
        },
        { sourcePlanApplication: true },
      ),
    );
    expect(result.structuredContent).toMatchObject({
      deleted: 1,
      skipped: 0,
    });
  });

  test("relationship delete reports unsupported, duplicate, inspect, and missing selectors", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-rel-del-"));
    workspaces.push(root);
    const payload = await executeDelete(
      {
        relationships: [
          { type: "not_a_rel", from: "REQ-1", to: "TEST-1" },
          { type: "verified_by", from: "REQ-1", to: "TEST-1" },
          { type: "verified_by", from: "REQ-1", to: "TEST-1" },
          { type: "specified_by", from: "REQ-1", to: "SCEN-1" },
          { type: "covered_by", from: "SYM-1", to: "TEST-2" },
        ],
      },
      contextFor(root, (goal) => {
        if (goal.includes("kb_relationship(specified_by")) {
          return { success: false, bindings: {}, error: "query exploded" };
        }
        return { success: false, bindings: {} };
      }),
    );
    const codes = (payload.structuredContent?.error_codes ?? []).map(
      (row) => row.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "unsupported_relationship_type",
        "duplicate_relationship_selector",
        "relationship_preflight_failed",
        "relationship_not_found",
      ]),
    );
  });

  test("patches authored markdown relationship declarations before retracting", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-md-rel-"));
    workspaces.push(root);
    const relative = ".kb/requirements/REQ-MD.md";
    const absolute = path.join(root, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(
      absolute,
      [
        "---",
        "id: REQ-MD",
        "type: req",
        "relationships:",
        "  - type: verified_by",
        "    target: TEST-MD",
        "---",
        "",
        "body",
        "",
      ].join("\n"),
    );
    const result = await executeDelete(
      {
        relationships: [
          { type: "verified_by", from: "REQ-MD", to: "TEST-MD" },
        ],
      },
      contextFor(
        root,
        (goal) => {
          if (goal.includes("findall(['REQ-MD'")) {
            return {
              success: true,
              bindings: {
                Results: `[['REQ-MD',req,[id='REQ-MD',source="${relative}"]]]`,
              },
            };
          }
          if (goal.includes("kb_relationship(verified_by")) {
            return { success: false, bindings: {} };
          }
          if (goal.includes("kb_retract_relationship")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("kb_save") || goal.startsWith("rdf_transaction")) {
            return { success: true, bindings: {} };
          }
          return { success: false, bindings: {} };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent?.relationships_deleted).toBe(0);
    expect(await readFile(absolute, "utf8")).not.toContain("TEST-MD");
  });
});
