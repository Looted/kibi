/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import {
  persistEntities,
  persistRelationships,
} from "../../../src/commands/sync/persistence.js";
import type {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "../../../src/extractors/markdown.js";
import type { PrologProcess, QueryResult } from "../../../src/prolog.js";
import * as codec from "../../../src/prolog/codec.js";
import * as discoveryEntities from "../../../src/public/operations/discovery-entities.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
  git,
  isolateKibiEnv,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
const tempDirs: string[] = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const directory of tempDirs.splice(0)) removeTempDir(directory);
});

function makeEntity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: "REQ-001",
    type: "req",
    title: "Test Requirement",
    status: "open",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    source: ".kb/requirements/REQ-001.md",
    ...overrides,
  };
}

function makeResult(
  entity: ExtractedEntity,
  relationships: ExtractedRelationship[] = [],
): ExtractionResult {
  return { entity, relationships };
}

interface PrologScript {
  query?: (goal: string) => Promise<QueryResult> | QueryResult;
  queryBatch?: (goals: readonly string[]) => Promise<QueryResult> | QueryResult;
  terminate?: () => Promise<void>;
  start?: () => Promise<void>;
}

interface PrologHarness {
  prolog: PrologProcess;
  goals: string[];
  batchCalls: readonly string[][];
}

function makeProlog(script: PrologScript = {}): PrologHarness {
  const goals: string[] = [];
  const batchCalls: string[][] = [];
  const prolog = {
    query: async (goal: string | string[]) => {
      const text = Array.isArray(goal) ? goal.join(", ") : goal;
      goals.push(text);
      if (script.query) return script.query(text);
      return { success: true, bindings: {} };
    },
    ...(script.queryBatch === undefined
      ? {}
      : {
          queryBatch: async (batch: readonly string[]) => {
            batchCalls.push([...batch]);
            return script.queryBatch?.(batch);
          },
        }),
    terminate: script.terminate ?? (async () => {}),
    start: script.start ?? (async () => {}),
  } as unknown as PrologProcess;
  return { prolog, goals, batchCalls };
}

describe("persistEntities serialization branches", () => {
  test("serializes proof exemption fields on requirements", async () => {
    const { prolog, goals } = makeProlog();
    const result = await persistEntities(
      prolog,
      [
        makeResult(
          makeEntity({
            id: "REQ-EXEMPT",
            proof_exempt: true,
            proof_exempt_reason: "outside e2e scope",
          }),
        ),
      ],
      new Set(),
      { loadExistingEntityIds: false },
    );

    expect(result.entityCount).toBe(1);
    const goal = goals.find((entry) => entry.includes("REQ-EXEMPT"));
    expect(goal).toContain("proof_exempt=true");
    expect(goal).toContain('proof_exempt_reason="outside e2e scope"');
  });

  test("serializes proof_exempt=false when explicitly disabled", async () => {
    const { prolog, goals } = makeProlog();
    await persistEntities(
      prolog,
      [makeResult(makeEntity({ id: "REQ-NOT-EXEMPT", proof_exempt: false }))],
      new Set(),
      { loadExistingEntityIds: false },
    );

    const goal = goals.find((entry) => entry.includes("REQ-NOT-EXEMPT"));
    expect(goal).toContain("proof_exempt=false");
    expect(goal).not.toContain("proof_exempt_reason=");
  });

  test("omits proof exemption fields when unset", async () => {
    const { prolog, goals } = makeProlog();
    await persistEntities(
      prolog,
      [makeResult(makeEntity({ id: "REQ-PLAIN" }))],
      new Set(),
      { loadExistingEntityIds: false },
    );

    const goal = goals.find((entry) => entry.includes("REQ-PLAIN"));
    expect(goal).not.toContain("proof_exempt");
  });

  test("serializes rule and semantic-key typed fact fields", async () => {
    const { prolog, goals } = makeProlog();
    await persistEntities(
      prolog,
      [
        makeResult(
          makeEntity({
            id: "FACT-RULE",
            type: "fact",
            fact_kind: "rule",
            rule_hash: "deadbeef",
            rule_schema_id: "FACT-RULE-SCHEMA-1",
            rule_name: "owns",
            semantic_key: "owns/2",
            rule_ir: { head: "owns", body: [] },
            claim_span_start: 3,
            claim_span_end: 21,
          }),
        ),
      ],
      new Set(),
      { loadExistingEntityIds: false },
    );

    const goal = goals.find((entry) => entry.includes("FACT-RULE"));
    expect(goal).toContain('rule_hash="deadbeef"');
    expect(goal).toContain('rule_schema_id="FACT-RULE-SCHEMA-1"');
    expect(goal).toContain('rule_name="owns"');
    expect(goal).toContain('semantic_key="owns/2"');
    expect(goal).toContain('rule_ir="{\\"head\\":\\"owns\\"');
    expect(goal).toContain("claim_span_start=3");
    expect(goal).toContain("claim_span_end=21");
  });

  test("ignores non-numeric symbol coordinates", async () => {
    const { prolog, goals } = makeProlog();
    await persistEntities(
      prolog,
      [
        makeResult(
          makeEntity({
            id: "SYM-COORDS",
            type: "symbol",
            source: "src/login.ts",
            sourceLine: "12" as unknown as number,
            sourceColumn: 3,
          }),
        ),
      ],
      new Set(),
      { loadExistingEntityIds: false },
    );

    const goal = goals.find((entry) => entry.includes("SYM-COORDS"));
    expect(goal).toContain("sourceColumn=3");
    expect(goal).not.toContain("sourceLine=");
  });
});

describe("persistEntities batching behavior", () => {
  test("splits upserts into bounded batches of 250 goals", async () => {
    const { prolog, batchCalls } = makeProlog({
      queryBatch: () => ({ success: true, bindings: {} }),
    });
    const entities = Array.from({ length: 251 }, (_, index) =>
      makeEntity({ id: `REQ-${String(index).padStart(4, "0")}` }),
    );

    const result = await persistEntities(
      prolog,
      entities.map((entity) => makeResult(entity)),
      new Set(),
      { loadExistingEntityIds: false },
    );

    expect(result.entityCount).toBe(251);
    expect(result.kbModified).toBe(true);
    expect(batchCalls.length).toBe(2);
    expect(batchCalls[0]?.length).toBe(250);
    expect(batchCalls[1]?.length).toBe(1);
  });

  test("prefers the batch transaction error when a sequential retry has no detail", async () => {
    const { prolog } = makeProlog({
      queryBatch: () => ({
        success: false,
        bindings: {},
        error: "txn aborted",
      }),
      query: (goal) => {
        if (goal.includes("kb_assert_entity")) {
          return { success: false, bindings: {} };
        }
        return { success: true, bindings: {} };
      },
    });

    await expect(
      persistEntities(prolog, [makeResult(makeEntity())], new Set(), {
        loadExistingEntityIds: false,
      }),
    ).rejects.toThrow("Failed to upsert entity REQ-001: txn aborted");
  });

  test("surfaces fact context when an upsert fails without any error detail", async () => {
    const { prolog } = makeProlog({
      query: (goal) => {
        if (goal.includes("kb_assert_entity")) {
          return { success: false, bindings: {} };
        }
        return { success: true, bindings: {} };
      },
    });

    await expect(
      persistEntities(
        prolog,
        [
          makeResult(
            makeEntity({
              id: "FACT-OBS",
              type: "fact",
              fact_kind: "observation",
              value_string: "seen",
            }),
          ),
        ],
        new Set(),
        { loadExistingEntityIds: false },
      ),
    ).rejects.toThrow(
      "Failed to upsert entity FACT-OBS: kb_assert_entity failed for FACT-OBS (source=.kb/requirements/REQ-001.md; fact_kind=observation)",
    );
  });

  test("wraps codec failures with entity id and source context", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const original = codec.toPrologString;
    const stringSpy = spyOn(codec, "toPrologString").mockImplementation(
      (value: string) => {
        if (value === "Boom Title") throw new Error("codec exploded");
        return original(value);
      },
    );
    restores.push(() => stringSpy.mockRestore());

    const { prolog } = makeProlog();
    await expect(
      persistEntities(
        prolog,
        [
          makeResult(
            makeEntity({
              id: "REQ-BOOM",
              title: "Boom Title",
              source: ".kb/requirements/REQ-BOOM.md",
            }),
          ),
        ],
        new Set(),
        { loadExistingEntityIds: false },
      ),
    ).rejects.toThrow(
      "Failed to upsert entity REQ-BOOM: codec exploded (source=.kb/requirements/REQ-BOOM.md)",
    );
  });
});

describe("persistEntities proof-receipt guard", () => {
  test("accepts an existing test when no stored entity payload is returned", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const load = spyOn(discoveryEntities, "loadEntities").mockResolvedValue([]);
    restores.push(() => load.mockRestore());

    const { prolog, goals } = makeProlog({
      query: (goal): QueryResult => {
        if (goal.includes("findall(Id, kb_entity")) {
          return {
            success: true,
            bindings: { ExistingIds: "['TEST-VANISHED']" },
          };
        }
        return { success: true, bindings: {} };
      },
    });

    const result = await persistEntities(
      prolog,
      [
        makeResult(
          makeEntity({
            id: "TEST-VANISHED",
            type: "test",
            verification_scope: "unit",
          }),
        ),
      ],
      new Set(),
    );

    expect(result.entityCount).toBe(1);
    expect(load.mock.calls[0]?.[1]).toEqual({
      id: "TEST-VANISHED",
      type: "test",
    });
    expect(goals.some((goal) => goal.includes("verification_scope=unit"))).toBe(
      true,
    );
  });
});

describe("persistRelationships batch fallback and untracked tips", () => {
  test("recovers relationships per-item after a failed batch", async () => {
    const { prolog } = makeProlog({
      queryBatch: () => ({
        success: false,
        bindings: {},
        error: "batch txn aborted",
      }),
      query: () => ({ success: true, bindings: {} }),
    });
    const io = captureIo();
    restores.push(io.restore);

    const result = await persistRelationships(
      prolog,
      [
        makeResult(makeEntity(), [
          { type: "specified_by", from: "REQ-001", to: "SCEN-1" },
        ]),
      ],
      [],
    );

    expect(result.relationshipCount).toBe(1);
    expect(result.kbModified).toBe(true);
    expect(io.warns.length).toBe(0);
  });

  test("warns with an untracked-document hint for unstaged missing targets", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const workspace = createGitWorkspace();
    tempDirs.push(workspace);
    const docDir = path.join(workspace, ".kb", "requirements");
    mkdirSync(docDir, { recursive: true });
    writeFileSync(
      path.join(docDir, "REQ-MISSING.md"),
      "---\nid: REQ-MISSING\ntitle: Missing\n---\n\nbody\n",
      "utf8",
    );

    const { prolog } = makeProlog({
      query: (goal) => {
        if (goal.includes("kb_assert_relationship")) {
          return {
            success: false,
            bindings: {},
            error: "entity does not exist: REQ-MISSING",
          };
        }
        return { success: true, bindings: {} };
      },
    });
    const io = captureIo();
    restores.push(io.restore);

    const result = await persistRelationships(
      prolog,
      [
        makeResult(makeEntity(), [
          { type: "depends_on", from: "REQ-001", to: "REQ-MISSING" },
        ]),
      ],
      [],
      { workspaceRoot: workspace },
    );

    expect(result.relationshipCount).toBe(0);
    const warnText = io.warns.join("\n");
    expect(warnText).toContain(
      "document for REQ-MISSING exists at .kb/requirements/REQ-MISSING.md but is untracked",
    );
    expect(warnText).toContain("git add .kb/requirements/REQ-MISSING.md");
  });

  test("stops suggesting untracked documents once they are staged", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const workspace = createGitWorkspace();
    tempDirs.push(workspace);
    const docDir = path.join(workspace, ".kb", "requirements");
    mkdirSync(docDir, { recursive: true });
    const docPath = path.join(docDir, "REQ-STAGED.md");
    writeFileSync(
      docPath,
      "---\nid: REQ-STAGED\ntitle: Staged\n---\n\nbody\n",
      "utf8",
    );
    git(workspace, "add .kb/requirements/REQ-STAGED.md");

    const { prolog } = makeProlog({
      query: (goal) => {
        if (goal.includes("kb_assert_relationship")) {
          return {
            success: false,
            bindings: {},
            error: "entity does not exist: REQ-STAGED",
          };
        }
        return { success: true, bindings: {} };
      },
    });
    const io = captureIo();
    restores.push(io.restore);

    await persistRelationships(
      prolog,
      [
        makeResult(makeEntity(), [
          { type: "depends_on", from: "REQ-001", to: "REQ-STAGED" },
        ]),
      ],
      [],
      { workspaceRoot: workspace },
    );

    const warnText = io.warns.join("\n");
    expect(warnText).toContain("missing entity/ies: REQ-STAGED");
    expect(warnText).toContain("Create the missing docs");
    expect(warnText).not.toContain("untracked");
  });
});
