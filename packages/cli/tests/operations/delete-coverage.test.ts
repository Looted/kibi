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

  test("returns a supersession plan for authored requirements and a delete plan for other authored entities", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-del-plan-"));
    workspaces.push(root);
    const reqPath = ".kb/requirements/REQ-AUTH.md";
    await mkdir(path.join(root, ".kb", "requirements"), { recursive: true });
    await writeFile(
      path.join(root, reqPath),
      "---\nid: REQ-AUTH\ntype: req\n---\nbody\n",
    );
    const req = await executeDelete(
      { ids: ["REQ-AUTH"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) return { success: true, bindings: { Dependents: "[]" } };
          if (goal.includes("findall(['REQ-AUTH'")) {
            return {
              success: true,
              bindings: {
                Results: `[['REQ-AUTH',req,[id='REQ-AUTH',type=req,source="${reqPath}"]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(req.structuredContent?.deletionPlan?.supersessionRequired).toBe(true);
    expect(req.structuredContent?.errors[0]).toContain("supersession");

    const factPath = ".kb/facts/FACT-AUTH.md";
    await mkdir(path.join(root, ".kb", "facts"), { recursive: true });
    await writeFile(
      path.join(root, factPath),
      "---\nid: FACT-AUTH\ntype: fact\n---\nbody\n",
    );
    const fact = await executeDelete(
      { ids: ["FACT-AUTH"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) return { success: true, bindings: { Dependents: "[]" } };
          if (goal.includes("findall(['FACT-AUTH'")) {
            return {
              success: true,
              bindings: {
                Results: `[['FACT-AUTH',fact,[id='FACT-AUTH',type=fact,source="${factPath}"]]]`,
              },
            };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(fact.structuredContent?.deletionPlan?.supersessionRequired).toBe(false);
    expect(fact.content[0]?.text).toContain("kb_apply_plan");
  });

  test("blocks dependents, skips protocol sources, and reports empty loadEntity rows", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-del-dep-"));
    workspaces.push(root);
    const blocked = await executeDelete(
      { ids: ["REQ-DEP"] },
      contextFor(root, (goal) => {
        if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
        if (goal.includes("Dependents")) {
          return { success: true, bindings: { Dependents: "[[verified_by,TEST-1]]" } };
        }
        return { success: true, bindings: { Results: "[]" } };
      }),
    );
    expect(blocked.structuredContent?.errors.join(" ")).toContain("has dependents");

    await expect(
      executeDelete(
        { ids: ["REQ-EMPTY"] },
        contextFor(root, (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) return { success: true, bindings: { Dependents: "[]" } };
          if (goal.includes("findall(['REQ-EMPTY'")) {
            return { success: true, bindings: { Results: "[]" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        }),
      ),
    ).rejects.toThrow(/Entity not found/);

    const proto = await executeDelete(
      { ids: ["REQ-PROTO"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) return { success: true, bindings: { Dependents: "[]" } };
          if (goal.includes("findall(['REQ-PROTO'")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['REQ-PROTO',req,[id='REQ-PROTO',type=req,source='mcp://kibi/upsert']]]",
              },
            };
          }
          if (goal.startsWith("rdf_transaction") || goal.includes("kb_save")) {
            return { success: true, bindings: {} };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { sourcePlanApplication: true },
      ),
    );
    expect(proto.structuredContent?.deleted).toBe(1);
  });

  test("patches authored YAML symbol relationships and retracts live compiled edges", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "kibi-del-yaml-"));
    workspaces.push(root);
    const relative = ".kb/symbols.yaml";
    await mkdir(path.join(root, ".kb"), { recursive: true });
    await writeFile(
      path.join(root, relative),
      "symbols:\n  - id: SYM-1\n    relationships:\n      - type: implements\n        target: REQ-1\n",
    );
    const result = await executeDelete(
      {
        relationships: [{ type: "implements", from: "SYM-1", to: "REQ-1" }],
      },
      contextFor(
        root,
        (goal) => {
          if (goal.includes("findall(['SYM-1'")) {
            return {
              success: true,
              bindings: {
                Results: `[['SYM-1',symbol,[id='SYM-1',source="${relative}"]]]`,
              },
            };
          }
          if (goal.includes("kb_relationship(implements")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("kb_retract_relationship") || goal.includes("kb_save")) {
            return { success: true, bindings: {} };
          }
          return { success: false, bindings: {} };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent?.relationships_deleted).toBe(1);
    expect(result.structuredContent?.sync_required).toBe(true);
    expect(await readFile(path.join(root, relative), "utf8")).not.toContain("REQ-1");
  });
});

