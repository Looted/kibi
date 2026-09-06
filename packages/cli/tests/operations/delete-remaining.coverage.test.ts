// implements REQ-011, REQ-014
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertFilesystemCapableRuntime,
  executeDelete,
} from "../../src/operations/mutation/delete.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import * as shardsModule from "../../src/relationships/shards.js";
import {
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const tempDirs: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];
let restoreEnv: (() => void) | undefined;

function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-delete-remaining-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, ".kb"), { recursive: true });
  return dir;
}

function attachment(workspaceRoot: string, migrationRequired = false) {
  return {
    gitBranch: "develop",
    kbBranch: migrationRequired ? "legacy" : "develop",
    storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
    kind: "exact" as const,
    migrationRequired,
  };
}

function contextFor(
  workspaceRoot: string,
  query: (goal: string) => PrologQueryResult | Promise<PrologQueryResult>,
  extras: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async (goal) => query(Array.isArray(goal) ? goal.join(", ") : goal),
    nextSolution: async () => null,
    save: extras.prolog?.save ?? (async () => ({ success: true, bindings: {} })),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    prolog,
    branchAttachment: attachment(workspaceRoot),
    ...extras,
    prolog: extras.prolog ?? prolog,
  };
}

function fsWithoutRename(): FilesystemPort {
  return {
    readFile: (target) => nodeFilesystem.readFile(target),
    writeFile: (target, data) => nodeFilesystem.writeFile(target, data),
    mkdir: (target) => nodeFilesystem.mkdir(target),
    stat: (target) => nodeFilesystem.stat(target),
    unlink: (target) => nodeFilesystem.unlink?.(target) ?? Promise.resolve(),
  };
}

function writeMarkdown(root: string, relative: string, id: string, extra = ""): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(
    absolute,
    `---\nid: ${id}\ntype: req\n${extra}---\nbody\n`,
    "utf8",
  );
  return relative;
}

function entityGoal(
  id: string,
  type: string,
  source: string,
): PrologQueryResult {
  return {
    success: true,
    bindings: {
      Results: `[['${id}',${type},[id='${id}',type=${type},title="${id}",source="${source}"]]]`,
    },
  };
}

beforeEach(() => {
  restoreEnv = isolateKibiEnv();
});

afterEach(() => {
  while (spies.length > 0) {
    spies.pop()?.mockRestore();
  }
  restoreEnv?.();
  restoreEnv = undefined;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) removeTempDir(dir);
  }
});

describe("executeDelete relationship remaining branches", () => {
  test("rejects non-selector relationship values including null and arrays", async () => {
    // implements REQ-011
    const root = makeTempDir();
    await expect(
      executeDelete(
        { relationships: [null as never] },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/type, from, and to/);
    await expect(
      executeDelete(
        { relationships: [[{ type: "relates_to" }] as never] },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/type, from, and to/);
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-1" } as never] },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/type, from, and to/);
  });

  test("wraps readAllShards failures for Error and non-Error throws", async () => {
    // implements REQ-014
    const root = makeTempDir();
    track(
      spyOn(shardsModule, "readAllShards").mockImplementation(() => {
        throw new Error("legacy shards unreadable");
      }),
    );
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-1", to: "REQ-2" }] },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/legacy shards unreadable/);

    spies.pop()?.mockRestore();
    track(
      spyOn(shardsModule, "readAllShards").mockImplementation(() => {
        throw "shard-down";
      }),
    );
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-1", to: "REQ-2" }] },
        contextFor(root, () => ({ success: true, bindings: {} })),
      ),
    ).rejects.toThrow(/shard-down/);
  });

  test("rethrows authored YAML relationship deletion failures", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const relative = ".kb/symbols.yaml";
    await expect(
      executeDelete(
        { relationships: [{ type: "implements", from: "SYM-YAML", to: "REQ-1" }] },
        contextFor(
          root,
          (goal) => {
            if (goal.includes("findall(['SYM-YAML'")) {
              return entityGoal("SYM-YAML", "symbol", relative);
            }
            if (goal.includes("kb_relationship(implements")) {
              return { success: true, bindings: {} };
            }
            return { success: false, bindings: {} };
          },
          {
            fs: {
              ...fsWithoutRename(),
              readFile: async () => {
                throw new Error("yaml unreadable");
              },
            },
          },
        ),
      ),
    ).rejects.toThrow(/Authored YAML relationship deletion failed[\s\S]*yaml unreadable/);
  });

  test("skips markdown patches when a live compiled edge and shard already exist", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const relative = writeMarkdown(
      root,
      ".kb/requirements/REQ-LIVE.md",
      "REQ-LIVE",
      "relationships:\n  - type: verified_by\n    target: TEST-LIVE\n",
    );
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "verified_by",
      from: "REQ-LIVE",
      to: "TEST-LIVE",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://live",
    });
    const before = readFileSync(path.join(root, relative), "utf8");
    const result = await executeDelete(
      { relationships: [{ type: "verified_by", from: "REQ-LIVE", to: "TEST-LIVE" }] },
      contextFor(
        root,
        (goal) => {
          if (goal.includes("findall(['REQ-LIVE'")) return entityGoal("REQ-LIVE", "req", relative);
          if (goal.includes("kb_relationship(verified_by")) {
            return { success: true, bindings: {} };
          }
          if (
            goal.includes("kb_retract_relationship") ||
            goal.includes("kb_save") ||
            goal.startsWith("rdf_transaction")
          ) {
            return { success: true, bindings: {} };
          }
          return { success: false, bindings: {} };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent?.relationships_deleted).toBe(1);
    expect(result.content[0]?.text).toContain("Run kibi sync");
    expect(readFileSync(path.join(root, relative), "utf8")).toBe(before);
  });

  test("patches authored sources without rename and rolls a failed after-image back", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const relative = ".kb/symbols.yaml";
    writeFileSync(
      path.join(root, relative),
      "symbols:\n  - id: SYM-NORENAME\n    relationships:\n      - type: implements\n        target: REQ-1\n",
      "utf8",
    );
    const ok = await executeDelete(
      { relationships: [{ type: "implements", from: "SYM-NORENAME", to: "REQ-1" }] },
      contextFor(
        root,
        (goal) => {
          if (goal.includes("findall(['SYM-NORENAME'")) {
            return entityGoal("SYM-NORENAME", "symbol", relative);
          }
          if (goal.includes("kb_relationship(implements")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("kb_retract_relationship") || goal.includes("kb_save")) {
            return { success: true, bindings: {} };
          }
          return { success: false, bindings: {} };
        },
        { fs: fsWithoutRename() },
      ),
    );
    expect(ok.structuredContent?.relationships_deleted).toBe(1);
    expect(readFileSync(path.join(root, relative), "utf8")).not.toContain("REQ-1");

    writeFileSync(
      path.join(root, relative),
      "symbols:\n  - id: SYM-FAILPATCH\n    relationships:\n      - type: implements\n        target: REQ-1\n",
      "utf8",
    );
    let writes = 0;
    const failingFs: FilesystemPort = {
      ...fsWithoutRename(),
      writeFile: async (target, data) => {
        writes += 1;
        if (writes === 1) throw new Error("after-image blocked");
        return nodeFilesystem.writeFile(target, data);
      },
    };
    await expect(
      executeDelete(
        { relationships: [{ type: "implements", from: "SYM-FAILPATCH", to: "REQ-1" }] },
        contextFor(
          root,
          (goal) => {
            if (goal.includes("findall(['SYM-FAILPATCH'")) {
              return entityGoal("SYM-FAILPATCH", "symbol", relative);
            }
            if (goal.includes("kb_relationship(implements")) {
              return { success: true, bindings: {} };
            }
            return { success: false, bindings: {} };
          },
          { fs: failingFs },
        ),
      ),
    ).rejects.toThrow(/Relationship source update failed before compiled mutation[\s\S]*after-image blocked/);
    expect(readFileSync(path.join(root, relative), "utf8")).toContain("REQ-1");
  });

  test("restores shards when publication fails and reports a double-failure", async () => {
    // implements REQ-014
    const root = makeTempDir();
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "relates_to",
      from: "REQ-SHARD",
      to: "REQ-TO",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://shard",
    });
    const original = readFileSync(
      shardsModule.computeShardPath(path.join(root, ".kb"), "REQ-SHARD"),
      "utf8",
    );
    track(
      spyOn(shardsModule, "removeRelationshipsFromShards").mockImplementation(() => {
        throw new Error("rename interrupted");
      }),
    );
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-SHARD", to: "REQ-TO" }] },
        contextFor(root, (goal) =>
          goal.includes("kb_relationship(relates_to")
            ? { success: true, bindings: {} }
            : { success: false, bindings: {} },
        ),
      ),
    ).rejects.toThrow(/Relationship shard update failed before compiled mutation[\s\S]*rename interrupted/);
    expect(
      readFileSync(shardsModule.computeShardPath(path.join(root, ".kb"), "REQ-SHARD"), "utf8"),
    ).toBe(original);

    const write = writeFileSync;
    track(
      spyOn(fs, "writeFileSync").mockImplementation(((target, data, options) => {
        if (String(target).includes(`${path.sep}relationships${path.sep}`)) {
          throw new Error("rollback blocked");
        }
        return write(target, data, options);
      }) as typeof writeFileSync),
    );
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-SHARD", to: "REQ-TO" }] },
        contextFor(root, (goal) =>
          goal.includes("kb_relationship(relates_to")
            ? { success: true, bindings: {} }
            : { success: false, bindings: {} },
        ),
      ),
    ).rejects.toThrow(/reconciliation_required[\s\S]*rollback blocked/);
  });

  test("restores shards after a compiled retract failure and reports rollback collapse", async () => {
    // implements REQ-014
    const root = makeTempDir();
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "relates_to",
      from: "REQ-RETRACT",
      to: "REQ-TO",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://retract",
    });
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-RETRACT", to: "REQ-TO" }] },
        contextFor(root, (goal) => {
          if (goal.includes("kb_relationship(relates_to")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("kb_retract_relationship")) {
            return { success: false, bindings: {}, error: "retract exploded" };
          }
          return { success: false, bindings: {} };
        }),
      ),
    ).rejects.toThrow(
      /Relationship retraction failed; canonical relationship shards were restored[\s\S]*retract exploded/,
    );

    const write = writeFileSync;
    track(
      spyOn(fs, "writeFileSync").mockImplementation(((target, data, options) => {
        if (
          String(target).includes(`${path.sep}relationships${path.sep}`) &&
          !String(target).includes(".kibi-write-")
        ) {
          throw new Error("retract rollback blocked");
        }
        return write(target, data, options);
      }) as typeof writeFileSync),
    );
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "relates_to",
      from: "REQ-RETRACT-2",
      to: "REQ-TO",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://retract2",
    });
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-RETRACT-2", to: "REQ-TO" }] },
        contextFor(root, (goal) => {
          if (goal.includes("kb_relationship(relates_to")) {
            return { success: true, bindings: {} };
          }
          if (goal.includes("kb_retract_relationship")) {
            return { success: false, bindings: {}, error: "retract exploded" };
          }
          return { success: false, bindings: {} };
        }),
      ),
    ).rejects.toThrow(/reconciliation_required[\s\S]*retract rollback blocked/);
  });

  test("omits unchanged shard writes and records a missing after hash", async () => {
    // implements REQ-014
    const root = makeTempDir();
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "relates_to",
      from: "REQ-HASH",
      to: "REQ-TO",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://hash",
    });
    track(
      spyOn(shardsModule, "removeRelationshipsFromShards").mockImplementation(
        (kbRoot, selectors) =>
          selectors.map((selector) => ({
            selector,
            shardPaths: shardsModule.listShards(kbRoot),
            sources: [],
            removed: true,
          })),
      ),
    );
    const unchanged = await executeDelete(
      { relationships: [{ type: "relates_to", from: "REQ-HASH", to: "REQ-TO" }] },
      contextFor(root, (goal) =>
        goal.includes("kb_relationship(relates_to")
          ? { success: true, bindings: {} }
          : goal.includes("kb_retract_relationship") || goal.includes("kb_save")
            ? { success: true, bindings: {} }
            : { success: false, bindings: {} },
      ),
    );
    expect(
      unchanged.structuredContent?.sourceWrites?.some((row) =>
        row.path.startsWith(".kb/relationships/"),
      ),
    ).toBeFalsy();

    spies.pop()?.mockRestore();
    const originalRemove = shardsModule.removeRelationshipsFromShards;
    track(
      spyOn(shardsModule, "removeRelationshipsFromShards").mockImplementation(
        (kbRoot, selectors) => {
          const removed = originalRemove(kbRoot, selectors);
          for (const item of removed) {
            for (const shardPath of item.shardPaths) {
              if (existsSync(shardPath)) fs.unlinkSync(shardPath);
            }
          }
          return removed;
        },
      ),
    );
    shardsModule.appendRelationship(path.join(root, ".kb"), {
      type: "relates_to",
      from: "REQ-HASH-2",
      to: "REQ-TO",
      created_at: "2026-09-05T00:00:00.000Z",
      created_by: "test",
      source: "test://hash2",
    });
    const gone = await executeDelete(
      { relationships: [{ type: "relates_to", from: "REQ-HASH-2", to: "REQ-TO" }] },
      contextFor(root, (goal) =>
        goal.includes("kb_relationship(relates_to")
          ? { success: true, bindings: {} }
          : goal.includes("kb_retract_relationship") || goal.includes("kb_save")
            ? { success: true, bindings: {} }
            : { success: false, bindings: {} },
      ),
    );
    expect(
      gone.structuredContent?.sourceWrites?.some((row) => row.afterHash === null),
    ).toBe(true);
  });

  test("wraps non-Error relationship failures", async () => {
    // implements REQ-014
    const root = makeTempDir();
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-1", to: "REQ-2" }] },
        contextFor(root, () => {
          throw 42;
        }),
      ),
    ).rejects.toThrow(/Delete execution failed: 42/);
  });
});

describe("executeDelete entity remaining branches", () => {
  test("returns a plan with a null hash when a shared markdown path is exhausted", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const relative = writeMarkdown(root, ".kb/requirements/SHARED.md", "REQ-ONE");
    const result = await executeDelete(
      { ids: ["REQ-ONE", "REQ-TWO"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['REQ-ONE'")) {
            return entityGoal("REQ-ONE", "req", relative);
          }
          if (goal.includes("findall(['REQ-TWO'")) {
            return entityGoal("REQ-TWO", "req", relative);
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent?.deletionPlan?.sourceHashes[relative]).toBeNull();
    expect(result.structuredContent?.deletionPlan?.entityIds).toEqual([
      "REQ-ONE",
      "REQ-TWO",
    ]);
  });

  test("records a null source hash when authored bytes cannot be planned", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const relative = writeMarkdown(root, ".kb/requirements/REQ-MISMATCH.md", "REQ-OTHER");
    const result = await executeDelete(
      { ids: ["REQ-MISMATCH"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['REQ-MISMATCH'")) {
            return entityGoal("REQ-MISMATCH", "req", relative);
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(result.structuredContent?.deletionPlan?.sourceHashes[relative]).toBeNull();
  });

  test("plans mdx and yaml authored entities and treats protocol or missing sources as compiled-only", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const mdx = ".kb/requirements/REQ-MDX.mdx";
    writeMarkdown(root, mdx, "REQ-MDX");
    const mdxPlan = await executeDelete(
      { ids: ["REQ-MDX"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['REQ-MDX'")) return entityGoal("REQ-MDX", "req", mdx);
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(mdxPlan.structuredContent?.deletionPlan?.supersessionRequired).toBe(true);

    const yaml = ".kb/symbols.yaml";
    writeFileSync(
      path.join(root, yaml),
      "symbols:\n  - id: SYM-PLAN\n    title: Plan\n  - id: SYM-KEEP\n    title: Keep\n",
      "utf8",
    );
    const yamlPlan = await executeDelete(
      { ids: ["SYM-PLAN"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['SYM-PLAN'")) {
            return entityGoal("SYM-PLAN", "symbol", yaml);
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(yamlPlan.structuredContent?.deletionPlan?.supersessionRequired).toBe(false);
    expect(yamlPlan.structuredContent?.deletionPlan?.sourceWrites[0]?.mode).toBe("write");

    const compiled = await executeDelete(
      { ids: ["REQ-NOSRC"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['REQ-NOSRC'")) {
            return {
              success: true,
              bindings: {
                Results:
                  "[['REQ-NOSRC',req,[id='REQ-NOSRC',type=req,title=\"No source\"]]]",
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
    expect(compiled.structuredContent?.deleted).toBe(1);

    const slash = await executeDelete(
      { ids: ["REQ-SLASH"] },
      contextFor(
        root,
        (goal) => {
          if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
          if (goal.includes("Dependents")) {
            return { success: true, bindings: { Dependents: "[]" } };
          }
          if (goal.includes("findall(['REQ-SLASH'")) {
            return entityGoal("REQ-SLASH", "req", "docs\\\\REQ-SLASH.md");
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        { fs: nodeFilesystem },
      ),
    );
    expect(slash.structuredContent?.deletionPlan).toBeDefined();
  });

  test("applies a shared yaml plan and rolls authored bytes back when save fails", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const yaml = ".kb/symbols.yaml";
    const original =
      "symbols:\n  - id: SYM-A\n    title: A\n  - id: SYM-B\n    title: B\n";
    writeFileSync(path.join(root, yaml), original, "utf8");
    await expect(
      executeDelete(
        { ids: ["SYM-A", "SYM-B"] },
        contextFor(
          root,
          (goal) => {
            if (goal.startsWith("once(kb_entity(")) return { success: true, bindings: {} };
            if (goal.includes("Dependents")) {
              return { success: true, bindings: { Dependents: "[]" } };
            }
            if (goal.includes("findall(['SYM-A'")) return entityGoal("SYM-A", "symbol", yaml);
            if (goal.includes("findall(['SYM-B'")) return entityGoal("SYM-B", "symbol", yaml);
            if (goal.startsWith("rdf_transaction")) {
              return { success: false, bindings: {}, error: "atomic save failed" };
            }
            return { success: true, bindings: { Results: "[]" } };
          },
          { fs: nodeFilesystem, sourcePlanApplication: true },
        ),
      ),
    ).rejects.toThrow(/atomic save failed/);
    expect(readFileSync(path.join(root, yaml), "utf8")).toBe(original);
  });

  test("reports skipped-entity errors and saveMutation failures", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const skipped = await executeDelete(
      { ids: ["REQ-MISS"] },
      contextFor(root, (goal) =>
        goal === "once(kb_entity('REQ-MISS', _, _))"
          ? { success: false, bindings: {} }
          : { success: true, bindings: {} },
      ),
    );
    expect(skipped.content[0]?.text).toContain("Errors:");
    expect(skipped.structuredContent?.skipped).toBe(1);

    await expect(
      executeDelete(
        { ids: ["REQ-SAVE"] },
        contextFor(
          root,
          (goal) =>
            goal === "once(kb_entity('REQ-SAVE', _, _))"
              ? { success: false, bindings: {} }
              : { success: true, bindings: {} },
          {
            prolog: {
              query: async (goal) =>
                String(goal) === "once(kb_entity('REQ-SAVE', _, _))"
                  ? { success: false, bindings: {} }
                  : { success: true, bindings: {} },
              nextSolution: async () => null,
              save: async () => ({ success: false, bindings: {}, error: "save refused" }),
            },
          },
        ),
      ),
    ).rejects.toThrow(/save refused/);
  });

  test("escapes apostrophes in entity ids and wraps non-Error compiled failures", async () => {
    // implements REQ-014
    const root = makeTempDir();
    const result = await executeDelete(
      { ids: ["REQ-O'NEILL"] },
      contextFor(root, (goal) => {
        if (goal.includes("REQ-O''NEILL") && goal.startsWith("once(kb_entity")) {
          return { success: false, bindings: {} };
        }
        return { success: true, bindings: {} };
      }),
    );
    expect(result.structuredContent?.errors.join(" ")).toContain("REQ-O'NEILL");

    await expect(
      executeDelete(
        { ids: ["REQ-BARE"] },
        contextFor(root, () => {
          throw "compiled-down";
        }),
      ),
    ).rejects.toThrow(/Delete execution failed: compiled-down/);
  });

  test("blocks relationship deletes while a legacy branch still requires migration", async () => {
    const root = makeTempDir();
    await expect(
      executeDelete(
        { relationships: [{ type: "relates_to", from: "REQ-1", to: "REQ-2" }] },
        contextFor(root, () => ({ success: true, bindings: {} }), {
          fs: nodeFilesystem,
          branchAttachment: attachment(root, true),
        }),
      ),
    ).rejects.toThrow(/Delete blocked: KB is attached through legacy branch storage/);
  });

  test("assertFilesystemCapableRuntime rejects a missing filesystem port", () => {
    expect(() => assertFilesystemCapableRuntime(undefined)).toThrow(
      /filesystem-capable runtime/,
    );
  });

  test("rolls authored YAML relationship bytes back when retract fails", async () => {
    const root = makeTempDir();
    const relative = ".kb/symbols.yaml";
    writeFileSync(
      path.join(root, relative),
      "symbols:\n  - id: SYM-RETRACT\n    relationships:\n      - type: implements\n        target: REQ-1\n",
      "utf8",
    );
    await expect(
      executeDelete(
        {
          relationships: [
            { type: "implements", from: "SYM-RETRACT", to: "REQ-1" },
          ],
        },
        contextFor(
          root,
          (goal) => {
            if (goal.includes("findall(['SYM-RETRACT'")) {
              return entityGoal("SYM-RETRACT", "symbol", relative);
            }
            if (goal.includes("kb_relationship(implements")) {
              return { success: true, bindings: {} };
            }
            if (goal.includes("kb_retract_relationship")) {
              return { success: false, bindings: {}, error: "retract exploded" };
            }
            return { success: false, bindings: {} };
          },
          { fs: nodeFilesystem },
        ),
      ),
    ).rejects.toThrow(
      /Relationship retraction failed; canonical relationship shards were restored[\s\S]*retract exploded/,
    );
    expect(readFileSync(path.join(root, relative), "utf8")).toContain("REQ-1");
  });
});
