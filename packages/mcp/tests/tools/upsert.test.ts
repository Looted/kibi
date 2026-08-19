import "../helpers/ensure-test-branch.js";
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";
import { __test__, handleKbUpsert } from "../../src/tools/upsert.js";

type QueryResult = {
  success: boolean;
  bindings?: Record<string, string | undefined>;
  error?: string;
};

const initialKibiMcpDebug: string | undefined = process.env.KIBI_MCP_DEBUG;
const initialKibiWorkspace: string | undefined = process.env.KIBI_WORKSPACE;
const initialKibiBranch: string | undefined = process.env.KIBI_BRANCH;
let tempWorkspace: string | undefined;

function createMockProlog(
  handler: (goal: string) => Promise<QueryResult> | QueryResult,
) {
  const existenceResults = new Map<string, QueryResult>();

  // These tests predate the single-goal commit contract and many of their
  // small Prolog doubles deliberately model the old RDF/audit/save calls.
  // Keep those doubles useful while exercising the new production call by
  // presenting the combined goal as the equivalent legacy stages.  The
  // adapter is test-only; production always submits kb_commit_upsert/5.
  const query = mock(async (goal: string): Promise<QueryResult> => {
    if (!goal.startsWith("kb_commit_upsert(")) {
      const result = { bindings: {}, ...(await handler(goal)) };
      if (goal.startsWith("once(kb_entity('")) {
        existenceResults.set(goal, result);
      }
      return result;
    }

    const match = goal.match(
      /^kb_commit_upsert\(([^,]+), (\[[\s\S]*\]), \[([\s\S]*)\], (true|false), ChangeKind\)$/,
    );
    if (!match) return { success: false, error: `Unexpected goal: ${goal}` };
    const [, type, properties, relationshipBody, skip] = match;
    const idMatch = properties.match(/(?:^|\[|,)id='([^']+)'/);
    const id = idMatch?.[1] ?? "unknown";
    const existenceGoal = `once(kb_entity('${id}', _, _))`;
    let existing = existenceResults.get(existenceGoal);
    if (existing === undefined) {
      try {
        existing = await query(existenceGoal);
      } catch {
        existing = { success: false };
      }
    }
    const change = existing.success ? "updated" : "created";

    const relationshipGoals = [
      ...relationshipBody.matchAll(
        /rel\(([^,]+), '([^']*)', '([^']*)', (\[[^\]]*\])\)/g,
      ),
    ].map(
      ([, relType, from, to, metadata]) =>
        `kb_assert_relationship_no_audit(${relType}, '${from}', '${to}', ${metadata})`,
    );
    const transactionParts = [
      `kb_assert_entity_no_audit(${type}, ${properties})`,
      ...relationshipGoals,
      ...(type === "req" && skip === "false"
        ? [`check_req_contradiction('${id}')`]
        : []),
    ];
    const transaction = `rdf_transaction((${transactionParts.join(", ")}))`;
    const written = await query(transaction);
    if (!written.success) return written;

    const entityAudit = await query(
      `kb_log_entity_upsert(${change}, ${type}, ${properties})`,
    );
    if (!entityAudit.success) return entityAudit;
    for (const [, relType, from, to, metadata] of relationshipBody.matchAll(
      /rel\(([^,]+), '([^']*)', '([^']*)', (\[[^\]]*\])\)/g,
    )) {
      const relationshipAudit = await query(
        `kb_log_relationship_upsert(${relType}, '${from}', '${to}', ${metadata})`,
      );
      if (!relationshipAudit.success) return relationshipAudit;
    }
    const saved = await query("kb_save");
    if (!saved.success) return saved;
    return { success: true, bindings: { ChangeKind: change } };
  });
  const invalidateCache = mock(() => {});

  return {
    query,
    invalidateCache,
    prolog: {
      query,
      invalidateCache,
    } as unknown as PrologProcess,
  };
}

afterEach(() => {
  mock.restore();
  __test__.setRefreshCoordinatesForSymbolIdForTests(undefined);
  if (tempWorkspace) {
    rmSync(tempWorkspace, { recursive: true, force: true });
    tempWorkspace = undefined;
  }
  if (initialKibiMcpDebug === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
  } else {
    process.env.KIBI_MCP_DEBUG = initialKibiMcpDebug;
  }
  if (initialKibiWorkspace === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
  } else {
    process.env.KIBI_WORKSPACE = initialKibiWorkspace;
  }
  if (initialKibiBranch === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  } else {
    process.env.KIBI_BRANCH = initialKibiBranch;
  }
});

function createTempWorkspace(): string {
  tempWorkspace = mkdtempSync(path.join(tmpdir(), "kibi-mcp-upsert-"));
  process.env.KIBI_WORKSPACE = tempWorkspace;
  process.env.KIBI_BRANCH = "main";
  return tempWorkspace;
}

describe("handleKbUpsert", () => {
  test("rejects missing required type/id arguments", async () => {
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "",
        id: "",
        properties: {},
      }),
    ).rejects.toThrow("'type' and 'id' are required for upsert");

    expect(query).not.toHaveBeenCalled();
  });

  test("rejects invalid entity payloads before querying Prolog", async () => {
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-INVALID-ENTITY",
        properties: {
          title: "Invalid entity",
          status: "not-a-real-status",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(/Entity validation failed/);

    expect(query).not.toHaveBeenCalled();
  });

  test("rejects invalid relationship payloads before querying Prolog", async () => {
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-INVALID-REL",
        properties: {
          title: "Invalid relationship",
          status: "open",
          source: "test://upsert",
        },
        relationships: [{ type: "specified_by", from: "REQ-INVALID-REL" }],
      }),
    ).rejects.toThrow(/Relationship validation failed at index 0/);

    expect(query).not.toHaveBeenCalled();
  });

  test("accepts valid symbol metadata atom fields on symbol upserts", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('SYM-ROLE-VALID', _, _))") {
        return { success: false };
      }
      if (
        goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(symbol,")
      ) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, symbol,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => ({
      refreshed: false,
      found: false,
    }));

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-ROLE-VALID",
      properties: {
        title: "RoleAwareSymbol",
        status: "active",
        source: "test://upsert",
        symbol_role: "behavioral",
        granularity_reason: "config-artifact",
      },
    });

    const transactionGoal = query.mock.calls.find(([goal]) =>
      String(goal).startsWith("rdf_transaction"),
    )?.[0] as string | undefined;
    expect(transactionGoal).toContain("symbol_role=behavioral");
    expect(transactionGoal).toContain("granularity_reason='config-artifact'");
    expect(result.structuredContent?.created).toBe(1);
  });

  test("rejects invalid symbol_role values before querying Prolog", async () => {
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "symbol",
        id: "SYM-ROLE-INVALID",
        properties: {
          title: "Invalid role symbol",
          status: "active",
          source: "test://upsert",
          symbol_role: "controller",
        },
      }),
    ).rejects.toThrow(/Entity validation failed/);

    expect(query).not.toHaveBeenCalled();
  });

  test("rejects relationships whose source does not match the upserted entity", async () => {
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-SOURCE-MISMATCH",
        properties: {
          title: "Source mismatch",
          status: "open",
          source: "test://upsert",
        },
        relationships: [
          {
            type: "specified_by",
            from: "REQ-OTHER",
            to: "SCEN-001",
          },
        ],
      }),
    ).rejects.toThrow(
      /Relationship source must match the upserted entity REQ-SOURCE-MISMATCH[\s\S]*To add REQ-OTHER -> SCEN-001, upsert REQ-OTHER instead/,
    );

    expect(query).not.toHaveBeenCalled();
  });

  test("accepts coarse symbol traceability when only type-shape symbols are available", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "video-player.store.ts"),
      `export interface DraftSceneSnapshot { id: string }
export type VideoPlayerMode = "idle" | "playing";
export enum VideoPlayerState { Idle = "idle" }

const videoPlayerStore = createStore(withMethods({
  connectVideoElement() {
    return true;
  },
}));
`,
    );
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };
      return { success: true };
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => ({
      refreshed: false,
      found: false,
    }));

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-VIDEO-PLAYER-STORE",
      properties: {
        title: "VideoPlayerStore",
        status: "active",
        source: ".kb/symbols.yaml",
        sourceFile: "src/video-player.store.ts",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-VIDEO-PLAYER-STORE",
          to: "REQ-GRANULAR-001",
        },
      ],
      document: { path: "symbols/video-player-store.yaml" },
    });

    expect(result.structuredContent?.relationships_created).toBe(1);
  });

  test("rejects coarse symbol traceability when granular source symbols exist", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "greet.ts"),
      `export const greetModule = {};

export function greet() {
  return "hello";
}
`,
    );
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "symbol",
        id: "SYM-GREET-FILE",
        properties: {
          title: "greetModule",
          status: "active",
          source: ".kb/symbols.yaml",
          sourceFile: "src/greet.ts",
        },
        relationships: [
          {
            type: "implements",
            from: "SYM-GREET-FILE",
            to: "REQ-GRANULAR-001",
          },
        ],
      }),
    ).rejects.toThrow(/granular symbols are available/i);

    expect(query).not.toHaveBeenCalled();
  });

  test("accepts exact exported config variable traceability", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "relationships.ts"),
      `export const RELATIONSHIP_TYPES = ["implements", "covered_by"] as const;

export function validateRelationships() {
  return RELATIONSHIP_TYPES;
}
`,
    );
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };
      return { success: true };
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => ({
      refreshed: true,
      found: true,
    }));

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-RELATIONSHIP-TYPES",
      properties: {
        title: "RELATIONSHIP_TYPES",
        status: "active",
        source: ".kb/symbols.yaml",
        sourceFile: "src/relationships.ts",
        symbol_role: "config",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-RELATIONSHIP-TYPES",
          to: "REQ-GRANULAR-001",
        },
      ],
      document: { path: "symbols/relationship-types.yaml" },
    });

    expect(result.structuredContent?.relationships_created).toBe(1);
  });

  test("accepts method symbol traceability when a class method exists", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "worker.ts"),
      `export class Worker {
  run() {
    return "ok";
  }
}
`,
    );
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };
      return { success: true };
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => ({
      refreshed: true,
      found: true,
    }));

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-WORKER-RUN",
      properties: {
        title: "Worker.run",
        status: "active",
        source: ".kb/symbols.yaml",
        sourceFile: "src/worker.ts",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-WORKER-RUN",
          to: "REQ-GRANULAR-001",
        },
      ],
      document: { path: "symbols/worker-run.yaml" },
    });

    expect(result.structuredContent?.relationships_created).toBe(1);
  });

  test("accepts property symbol traceability when a class property exists", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "worker.ts"),
      `export class Worker {
  readonly state = "ready";
}
`,
    );
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };
      return { success: true };
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => ({
      refreshed: true,
      found: true,
    }));

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-WORKER-STATE",
      properties: {
        title: "Worker.state",
        status: "active",
        source: ".kb/symbols.yaml",
        sourceFile: "src/worker.ts",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-WORKER-STATE",
          to: "REQ-GRANULAR-001",
        },
      ],
      document: { path: "symbols/worker-state.yaml" },
    });

    expect(result.structuredContent?.relationships_created).toBe(1);
  });

  test("rejects ambiguous bare method symbol traceability when duplicate class methods exist", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "workers.ts"),
      `export class Alpha {
  run() {
    return "alpha";
  }
}

export class Beta {
  run() {
    return "beta";
  }
}
`,
    );
    const { prolog, query } = createMockProlog(async () => ({ success: true }));

    await expect(
      handleKbUpsert(prolog, {
        type: "symbol",
        id: "SYM-WORKER-RUN",
        properties: {
          title: "run",
          status: "active",
          source: ".kb/symbols.yaml",
          sourceFile: "src/workers.ts",
        },
        relationships: [
          {
            type: "implements",
            from: "SYM-WORKER-RUN",
            to: "REQ-GRANULAR-001",
          },
        ],
      }),
    ).rejects.toThrow(/Alpha\.run.*Beta\.run/i);

    expect(query).not.toHaveBeenCalled();
  });

  test("accepts justified coarse symbol traceability", async () => {
    const root = createTempWorkspace();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "greet.ts"),
      `export const greetModule = {};

export function greet() {
  return "hello";
}
`,
    );
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };
      return { success: true };
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(async () => ({
      refreshed: false,
      found: false,
    }));

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-GREET-FILE",
      properties: {
        title: "greetModule",
        status: "active",
        source: ".kb/symbols.yaml",
        sourceFile: "src/greet.ts",
        granularity_reason: "module-level-behavior",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-GREET-FILE",
          to: "REQ-GRANULAR-001",
        },
      ],
      document: { path: "symbols/greet-module.yaml" },
    });

    expect(result.structuredContent?.relationships_created).toBe(1);
  });

  test("rejects constrains relationships targeting property_value facts", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-STRICT-CONSTRAINS', _, _))") {
        return { success: false };
      }
      if (goal.includes("normalize_term_atom(_SlpFK, property_value)")) {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-STRICT-CONSTRAINS",
        properties: {
          title: "Invalid strict constrains",
          status: "open",
          source: "test://upsert",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-STRICT-CONSTRAINS",
            to: "FACT-PROP-001",
          },
        ],
      }),
    ).rejects.toThrow(/Property_value facts cannot be direct targets/);

    expect(query).toHaveBeenCalledTimes(2);
  });

  test("rejects requires_property relationships targeting subject facts", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-STRICT-PROPERTY', _, _))") {
        return { success: false };
      }
      if (goal.includes("normalize_term_atom(_SlpFK, subject)")) {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-STRICT-PROPERTY",
        properties: {
          title: "Invalid strict property",
          status: "open",
          source: "test://upsert",
        },
        relationships: [
          {
            type: "requires_property",
            from: "REQ-STRICT-PROPERTY",
            to: "FACT-SUBJECT-001",
          },
        ],
      }),
    ).rejects.toThrow(/Subject facts cannot be direct targets/);

    expect(query).toHaveBeenCalledTimes(2);
  });

  test("supports requirement upserts with relationships and contradiction checks in one transaction", async () => {
    const { prolog, query, invalidateCache } = createMockProlog(
      async (goal) => {
        if (goal.includes("normalize_term_atom(_SlpFK, property_value)")) {
          return { success: false };
        }
        if (goal.includes("normalize_term_atom(_SlpFK, subject)")) {
          return { success: false };
        }
        if (goal === "once(kb_entity('REQ-WITH-RELS', _, _))") {
          return { success: false };
        }
        if (
          goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,") &&
          goal.includes(
            "kb_assert_relationship_no_audit(constrains, 'REQ-WITH-RELS', 'FACT-SUBJECT-001', [])",
          ) &&
          goal.includes(
            "kb_assert_relationship_no_audit(requires_property, 'REQ-WITH-RELS', 'FACT-PROP-001', [])",
          ) &&
          goal.includes("check_req_contradiction('REQ-WITH-RELS')")
        ) {
          return { success: true };
        }
        if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
          return { success: true };
        }
        if (goal.startsWith("kb_log_relationship_upsert(constrains,")) {
          return { success: true };
        }
        if (goal.startsWith("kb_log_relationship_upsert(requires_property,")) {
          return { success: true };
        }
        if (goal === "kb_save") {
          return { success: true };
        }

        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-WITH-RELS",
      properties: {
        title: "Requirement with relationships",
        status: "open",
        source: "test://upsert",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-WITH-RELS",
          to: "FACT-SUBJECT-001",
        },
        {
          type: "requires_property",
          from: "REQ-WITH-RELS",
          to: "FACT-PROP-001",
        },
      ],
    });

    expect(query).toHaveBeenCalledTimes(11);
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(result.structuredContent).toMatchObject({
      created: 1,
      updated: 0,
      relationships_created: 2,
    });
  });

  test("defaults source and includes contradiction checks for requirement upserts", async () => {
    const { prolog, query, invalidateCache } = createMockProlog(
      async (goal) => {
        if (goal === "once(kb_entity('REQ-DEFAULT-SOURCE', _, _))") {
          return { success: false };
        }
        if (
          goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")
        ) {
          return { success: true };
        }
        if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
          return { success: true };
        }
        if (goal === "kb_save") {
          return { success: true };
        }

        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-DEFAULT-SOURCE",
      properties: {
        title: "Default source",
        status: "open",
      },
    });

    const transactionGoal = query.mock.calls.find(([goal]) =>
      String(goal).startsWith("rdf_transaction"),
    )?.[0] as string | undefined;

    expect(transactionGoal).toContain('source="mcp://kibi/upsert"');
    expect(transactionGoal).toContain(
      "check_req_contradiction('REQ-DEFAULT-SOURCE')",
    );
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(result.structuredContent).toMatchObject({
      created: 1,
      updated: 0,
      relationships_created: 0,
    });
  });

  test("encodes entity properties across atom, string, array, number, boolean, and fallback values", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('FACT-ENCODE-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(fact,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, fact,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-ENCODE-001",
      properties: {
        title: "Encoded fact",
        status: "active",
        source: "test://upsert",
        fact_kind: "property_value",
        subject_key: "user.session",
        property_key: "timeout_seconds",
        operator: "eq",
        value_type: "int",
        value_int: 30,
        closed_world: false,
        tags: ["alpha", "beta"],
        owner: undefined,
        text_ref: "docs/requirements.md#L1",
      },
    });

    const transactionGoal = query.mock.calls.find(([goal]) =>
      String(goal).startsWith("rdf_transaction"),
    )?.[0] as string | undefined;

    expect(transactionGoal).toContain("id='FACT-ENCODE-001'");
    expect(transactionGoal).toContain('title="Encoded fact"');
    expect(transactionGoal).toContain("status=active");
    expect(transactionGoal).toContain("fact_kind=property_value");
    expect(transactionGoal).toContain('subject_key="user.session"');
    expect(transactionGoal).toContain('property_key="timeout_seconds"');
    expect(transactionGoal).toContain("operator=eq");
    expect(transactionGoal).toContain("value_type=int");
    expect(transactionGoal).toContain("value_int=30");
    expect(transactionGoal).toContain("closed_world=false");
    expect(transactionGoal).toContain('tags=["alpha","beta"]');
    expect(transactionGoal).not.toContain("owner=");
    expect(transactionGoal).toContain('text_ref="docs/requirements.md#L1"');
  });

  test("encodes relationship metadata and skips contradiction checks when requested", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-REL-META-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_relationship_upsert(")) {
        return { success: true };
      }
      if (goal.includes("kb_relationship(specified_by, 'REQ-REL-META-001'")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-REL-META-001",
      properties: {
        title: "Relationship metadata",
        status: "open",
        source: "test://upsert",
      },
      relationships: [
        {
          type: "specified_by",
          from: "REQ-REL-META-001",
          to: "SCEN-001",
          created_at: "2026-03-30T10:00:00Z",
          created_by: "tester",
          source: undefined,
          confidence: 0.5,
        },
        {
          type: "verified_by",
          from: "REQ-REL-META-001",
          to: "TEST-001",
        },
      ],
      _skipContradictionCheck: true,
    });

    const transactionGoal = query.mock.calls.find(([goal]) =>
      String(goal).startsWith("rdf_transaction"),
    )?.[0] as string | undefined;

    expect(transactionGoal).not.toContain("check_req_contradiction");
    expect(transactionGoal).toContain(
      `kb_assert_relationship_no_audit(specified_by, 'REQ-REL-META-001', 'SCEN-001', [created_at="2026-03-30T10:00:00Z", created_by="tester", source="undefined", confidence=0.5])`,
    );
    expect(transactionGoal).toContain(
      `kb_assert_relationship_no_audit(verified_by, 'REQ-REL-META-001', 'TEST-001', [])`,
    );
    expect(query).toHaveBeenCalledWith(
      `kb_log_relationship_upsert(specified_by, 'REQ-REL-META-001', 'SCEN-001', [created_at="2026-03-30T10:00:00Z", created_by="tester", source="undefined", confidence=0.5])`,
    );
    expect(result.structuredContent).toMatchObject({
      created: 1,
      updated: 0,
      relationships_created: 2,
    });
  });

  test("reports updates when the entity already exists", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-UPDATED-001', _, _))") {
        return { success: true };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(updated, req,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-UPDATED-001",
      properties: {
        title: "Updated req",
        status: "open",
        source: "test://upsert",
      },
    });

    expect(result.content[0]?.text).toContain("updated");
    expect(result.structuredContent).toMatchObject({
      created: 0,
      updated: 1,
      relationships_created: 0,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("kb_log_entity_upsert(updated, req,"),
    );
  });

  test("records created entity audit entries with explicit change_kind", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-CREATED-AUDIT-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-CREATED-AUDIT-001",
      properties: {
        title: "Created audit req",
        status: "open",
        source: "test://upsert",
      },
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "kb_log_entity_upsert(created, req, [id='REQ-CREATED-AUDIT-001'",
      ),
    );
  });

  test("preserves existing relationships when relationships is an empty array", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-PRESERVE-EMPTY-RELS', _, _))") {
        return { success: true };
      }
      if (
        goal ===
        "findall(To, kb_relationship(depends_on, 'REQ-PRESERVE-EMPTY-RELS', To), Targets)"
      ) {
        return { success: true, bindings: { Targets: "['REQ-DEP-001']" } };
      }
      if (
        goal ===
        "findall(To, kb_relationship(specified_by, 'REQ-PRESERVE-EMPTY-RELS', To), Targets)"
      ) {
        return { success: true, bindings: { Targets: "['SCEN-001']" } };
      }
      if (
        goal.startsWith(
          "findall(To, kb_relationship(verified_by, 'REQ-PRESERVE-EMPTY-RELS', To), Targets)",
        )
      ) {
        return { success: true, bindings: { Targets: "['TEST-001']" } };
      }
      if (goal.startsWith("findall(To, kb_relationship(")) {
        return { success: true, bindings: { Targets: "[]" } };
      }
      if (goal.startsWith("findall(From, kb_relationship(")) {
        return { success: true, bindings: { Sources: "[]" } };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(updated, req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_relationship_upsert(")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PRESERVE-EMPTY-RELS",
      properties: {
        title: "Preserve relationships",
        status: "open",
        source: "test://upsert",
      },
      relationships: [],
    });

    const transactionGoal = query.mock.calls.find(([goal]) =>
      String(goal).startsWith("rdf_transaction"),
    )?.[0] as string | undefined;

    expect(transactionGoal).not.toContain("kb_assert_relationship_no_audit");
    expect(result.structuredContent?.relationships_created).toBe(0);
    expect(query).toHaveBeenCalledWith(
      "findall(To, kb_relationship(specified_by, 'REQ-PRESERVE-EMPTY-RELS', To), Targets)",
    );
    expect(query).toHaveBeenCalledWith(
      "findall(To, kb_relationship(verified_by, 'REQ-PRESERVE-EMPTY-RELS', To), Targets)",
    );
  });

  test("deduplicates contradiction details in formatted transaction errors", async () => {
    const { prolog, invalidateCache } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-CONTRA-DEDUPE', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return {
          success: false,
          error:
            "kb_contradiction(['subject user.session property timeout_seconds'-'REQ-OLD-001', 'subject user.session property timeout_seconds'-'REQ-OLD-001', 'subject user.session property ttl_seconds'-'REQ-OLD-002'])",
        };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    let message = "";
    try {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-CONTRA-DEDUPE",
        properties: {
          title: "Conflicting req",
          status: "open",
          source: "test://upsert",
        },
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain(
      "Contradiction detected for requirement REQ-CONTRA-DEDUPE",
    );
    expect(message.match(/REQ-OLD-001/g)?.length).toBe(1);
    expect(message).toContain("REQ-OLD-002");
    expect(message).toContain("Add a supersedes relationship");
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("preserves double-quoted predicate contradiction reasons", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-PRED-CONTRA', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return {
          success: false,
          error:
            "kb_contradiction([\"Predicate conflict on auth:permission_rule(user,publish,article)\"-'REQ-PRED-OLD'])",
        };
      }
      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-PRED-CONTRA",
        properties: {
          title: "Predicate contradiction",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      /Conflicts with REQ-PRED-OLD: Predicate conflict on auth:permission_rule/,
    );
  });

  test("falls back to a generic contradiction message when conflict details cannot be parsed", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-CONTRA-FALLBACK', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return {
          success: false,
          error: "kb_contradiction([unparsed_conflict_term])",
        };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-CONTRA-FALLBACK",
        properties: {
          title: "Fallback contradiction",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      "Contradiction detected for entity REQ-CONTRA-FALLBACK: This requirement conflicts with existing requirements.",
    );
  });

  test("formats raw rdf_transaction errors without exposing the full goal", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-TX-FAIL-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return {
          success: false,
          error:
            "rdf_transaction((kb_assert_entity_no_audit(req, [..]))) failed",
        };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-TX-FAIL-001",
        properties: {
          title: "Transaction failure",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      "Upsert execution failed: Failed to upsert entity REQ-TX-FAIL-001: Transaction failed",
    );
  });

  test("formats plain transaction errors without exposing raw goals", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-TX-PLAIN-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return {
          success: false,
          error: "permission denied",
        };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-TX-PLAIN-001",
        properties: {
          title: "Plain transaction failure",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      "Upsert execution failed: Failed to upsert entity REQ-TX-PLAIN-001: permission denied",
    );
  });

  test("rejects invalid relationship tuples before transaction with actionable alternatives", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('FACT-UPPERCASE-INITIAL', _, _))") {
        return { success: true };
      }
      if (goal === "kb_entity('TEST-HEADER-AVATAR-FALLBACK', Type, _)") {
        return { success: true, bindings: { Type: "test" } };
      }
      if (
        goal ===
        "findall(To, kb_relationship(depends_on, 'FACT-UPPERCASE-INITIAL', To), Targets)"
      ) {
        return { success: true, bindings: { Targets: "[]" } };
      }
      if (goal.startsWith("findall(To, kb_relationship(")) {
        return { success: true, bindings: { Targets: "[]" } };
      }
      if (goal.startsWith("findall(From, kb_relationship(")) {
        return { success: true, bindings: { Sources: "[]" } };
      }
      if (goal.includes("normalize_term_atom")) {
        return { success: false };
      }
      if (goal === "once(kb:validate_relationship(verified_by, fact, test))") {
        return { success: false };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-UPPERCASE-INITIAL",
        properties: {
          title: "Header avatar initial is uppercase",
          status: "active",
          source: "test://upsert/fact",
          fact_kind: "property_value",
          subject_key: "header.avatar.initial",
          property_key: "text_case",
          operator: "eq",
          value_type: "string",
          value_string: "uppercase",
        },
        relationships: [
          {
            type: "verified_by",
            from: "FACT-UPPERCASE-INITIAL",
            to: "TEST-HEADER-AVATAR-FALLBACK",
          },
        ],
      }),
    ).rejects.toThrow(
      /Invalid relationship: verified_by from fact to test[\s\S]*Facts are not directly verified by tests[\s\S]*Create or update a requirement and link REQ -> TEST with verified_by/,
    );
  });

  test("formats unknown transaction errors when Prolog returns no details", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-TX-FAIL-UNKNOWN', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return {
          success: false,
          error: undefined,
        };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-TX-FAIL-UNKNOWN",
        properties: {
          title: "Unknown transaction failure",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      "Upsert execution failed: Failed to upsert entity REQ-TX-FAIL-UNKNOWN: Unknown error",
    );
  });

  test("propagates entity audit failures from the combined commit", async () => {
    const { prolog, invalidateCache } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-AUDIT-FAIL-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: false, error: "entity audit broke" };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-AUDIT-FAIL-001",
        properties: {
          title: "Entity audit failure",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      "Upsert execution failed: Failed to upsert entity REQ-AUDIT-FAIL-001: entity audit broke",
    );

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("propagates relationship audit failures from the combined commit", async () => {
    const { prolog, invalidateCache } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-REL-AUDIT-FAIL-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_relationship_upsert(specified_by,")) {
        return { success: false, error: "relationship audit broke" };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-REL-AUDIT-FAIL-001",
        properties: {
          title: "Relationship audit failure",
          status: "open",
          source: "test://upsert",
        },
        relationships: [
          {
            type: "specified_by",
            from: "REQ-REL-AUDIT-FAIL-001",
            to: "SCEN-FAIL-001",
          },
        ],
        _skipContradictionCheck: true,
      }),
    ).rejects.toThrow(
      "Upsert execution failed: Failed to upsert entity REQ-REL-AUDIT-FAIL-001: relationship audit broke",
    );

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("propagates snapshot-save failures without exposing partial state", async () => {
    const { prolog, invalidateCache } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-SAVE-FAIL-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: false, error: "disk full" };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-SAVE-FAIL-001",
        properties: {
          title: "Save failure",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow(
      "Upsert execution failed: Failed to upsert entity REQ-SAVE-FAIL-001: disk full",
    );

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("registered upsert tool refreshes a stale attachment before saving", async () => {
    const calls: string[] = [];
    const { prolog } = createMockProlog(async (goal) => {
      calls.push(goal);
      if (goal === "kb_detach") {
        return { success: true };
      }
      if (goal === "kb_attach('/tmp/kibi-stale-replacement')") {
        return { success: true };
      }
      if (goal === "once(kb_entity('REQ-FRESH-SAVE-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });
    const originalInvalidateCache = prolog.invalidateCache.bind(prolog);
    prolog.invalidateCache = mock(() => {
      calls.push("invalidateCache");
      originalInvalidateCache();
    }) as PrologProcess["invalidateCache"];
    const ensureProlog = mock(async () => {
      prolog.invalidateCache();
      await prolog.query("kb_detach");
      await prolog.query("kb_attach('/tmp/kibi-stale-replacement')");
      return prolog;
    });
    const registered = new Map<
      string,
      (args: Record<string, unknown>) => unknown
    >();
    const server = {
      registerTool: mock(
        (
          name: string,
          _config: unknown,
          handler: (args: Record<string, unknown>) => unknown,
        ) => {
          registered.set(name, handler);
        },
      ),
    };
    const runtime = {
      tools: TOOLS,
      diagnosticModeEnabled: () => false,
      extractToolCallPayload: (args: Record<string, unknown>) => ({
        businessArgs: args,
        telemetry: null,
      }),
      inFlightRequests: async () => new Map<string, Promise<unknown>>(),
      isShuttingDown: async () => false,
      resetProlog: async () => {},
      prologProcess: async () => null,
      activeBranchName: async () => "test",
      appendUsageLogLine: () => {},
      deriveDiagnosticFields: () => ({}),
      classifyDiagnosticError: () => ({}),
      ensureProlog,
      operationRuntime: createMcpRuntime({
        workspaceRoot: "/workspace",
        activeBranchName: async () => "test",
        attachedBranchKbPath: () => null,
        ensureProlog,
        adaptProlog: () => ({
          query: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        }),
        refreshAttachedBranchStamp: async () => undefined,
      }),
      handleKbUpsert,
    } as unknown as Parameters<typeof registerAllTools>[1];

    registerAllTools(server as never, runtime);
    process.env.KIBI_BRANCH = "test";
    await registered.get("kb_upsert")?.({
      type: "req",
      id: "REQ-FRESH-SAVE-001",
      properties: {
        title: "Fresh before save",
        status: "open",
        source: "test://upsert",
        logic_claims: ["CLAIM-BDA55064A7A5E116"],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "title",
        semantic_source_hash:
          "2d1bbdd99a96e3757c1f944430f5f6eb6ee2d86822b8592c10f1fa0995bf490b",
        semantic_inventory: [
          {
            claim_key: "CLAIM-BDA55064A7A5E116",
            claim_text: "Fresh before save",
            role: "normative",
            status: "ontology_gap",
            span: { start: 0, end: 17 },
          },
        ],
      },
    });

    expect(ensureProlog).toHaveBeenCalledTimes(1);
    expect(calls.indexOf("invalidateCache")).toBeLessThan(
      calls.indexOf("kb_detach"),
    );
    expect(calls.indexOf("kb_detach")).toBeLessThan(
      calls.indexOf("kb_attach('/tmp/kibi-stale-replacement')"),
    );
    expect(
      calls.indexOf("kb_attach('/tmp/kibi-stale-replacement')"),
    ).toBeLessThan(calls.indexOf("kb_save"));
    expect(calls.slice(0, 3)).toEqual([
      "invalidateCache",
      "kb_detach",
      "kb_attach('/tmp/kibi-stale-replacement')",
    ]);
  });

  test("refreshes symbol coordinates after a successful symbol upsert", async () => {
    const refreshCoordinatesForSymbolId = mock(async () => ({
      refreshed: true,
      found: true,
    }));
    __test__.setRefreshCoordinatesForSymbolIdForTests(
      refreshCoordinatesForSymbolId,
    );
    process.env.KIBI_MCP_DEBUG = "1";
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('SYM-REFRESH-001', _, _))") {
        return { success: false };
      }
      if (
        goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(symbol,")
      ) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, symbol,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-REFRESH-001",
      properties: {
        title: "Refresh me",
        status: "active",
        source: "test://upsert",
      },
    });

    expect(refreshCoordinatesForSymbolId).toHaveBeenCalledWith(
      "SYM-REFRESH-001",
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(result.structuredContent?.created).toBe(1);
  });

  test("warns instead of failing when symbol coordinate refresh throws in debug mode", async () => {
    const refreshCoordinatesForSymbolId = mock(async () => {
      throw "refresh blew up";
    });
    __test__.setRefreshCoordinatesForSymbolIdForTests(
      refreshCoordinatesForSymbolId,
    );
    process.env.KIBI_MCP_DEBUG = "1";
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('SYM-REFRESH-WARN-001', _, _))") {
        return { success: false };
      }
      if (
        goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(symbol,")
      ) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, symbol,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-REFRESH-WARN-001",
      properties: {
        title: "Warn me",
        status: "active",
        source: "test://upsert",
      },
    });

    expect(refreshCoordinatesForSymbolId).toHaveBeenCalledWith(
      "SYM-REFRESH-WARN-001",
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Symbol coordinate auto-refresh failed for SYM-REFRESH-WARN-001: refresh blew up",
      ),
    );
    expect(result.structuredContent?.created).toBe(1);
  });

  test("wraps non-Error exceptions raised during execution", async () => {
    const query = mock(async () => {
      throw "string failure";
    });
    const invalidateCache = mock(() => {});
    const prolog = {
      query,
      invalidateCache,
    } as unknown as PrologProcess;

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-STRING-FAIL-001",
        properties: {
          title: "String failure",
          status: "open",
          source: "test://upsert",
        },
      }),
    ).rejects.toThrow("Upsert execution failed: string failure");
  });

  test("warns when verified_by added to req with scenarios", async () => {
    const createdEntities = new Set<string>();
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };

      // Entity existence checks with state tracking
      const entityMatch = goal.match(/once\(kb_entity\('([^']+)', _, _\)\)/);
      if (entityMatch) {
        const entityId = entityMatch[1];
        const exists = createdEntities.has(entityId);
        createdEntities.add(entityId);
        return { success: exists };
      }

      // Scenario check for req-scenario-warn-001 returns true (scenario exists)
      if (
        goal.includes("kb_relationship(specified_by, 'req-scenario-warn-001'")
      ) {
        return { success: true };
      }

      // All other queries (transaction, audit, save, etc.)
      return { success: true };
    });

    // Create a requirement
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-warn-001",
      properties: {
        title: "Req with scenario",
        status: "open",
        source: "test://scenario-warn",
      },
    });

    // Create a scenario
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-warn-001",
      properties: {
        title: "Warning scenario",
        status: "active",
        source: "test://scenario-warn",
      },
    });

    // Link req->scenario
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-warn-001",
      properties: {
        title: "Req with scenario",
        status: "open",
        source: "test://scenario-warn",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-scenario-warn-001",
          to: "scenario-warn-001",
        },
      ],
    });

    // Now re-upsert with verified_by — should warn
    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-warn-001",
      properties: {
        title: "Req with scenario",
        status: "open",
        source: "test://scenario-warn",
      },
      relationships: [
        {
          type: "verified_by",
          from: "req-scenario-warn-001",
          to: "test-scenario-warn-001",
        },
      ],
    });
    const warnings = result.structuredContent?.warnings || [];
    const coverageWarning = warnings.find((w) =>
      w.includes("Scenario-backed coverage"),
    );
    expect(coverageWarning).toBeDefined();
    expect(coverageWarning).toContain(
      "verified_by(scenario,test) or validates(test,scenario)",
    );
  });

  test("no warning when verified_by added to req without scenarios", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal.includes("normalize_term_atom")) return { success: false };
      if (goal === "once(kb_entity('req-no-scenario-warn-001', _, _))") {
        return { success: false };
      }
      // Scenario check: returns false (no scenarios)
      if (
        goal.includes(
          "kb_relationship(specified_by, 'req-no-scenario-warn-001'",
        )
      ) {
        return { success: false };
      }
      return { success: true };
    });

    const result = await handleKbUpsert(prolog, {
      type: "req",
      id: "req-no-scenario-warn-001",
      properties: {
        title: "Req without scenario",
        status: "open",
        source: "test://no-scenario-warn",
      },
      relationships: [
        {
          type: "verified_by",
          from: "req-no-scenario-warn-001",
          to: "test-no-scenario-warn-001",
        },
      ],
    });
    const warnings = result.structuredContent?.warnings || [];
    expect(
      warnings.find((w) => w.includes("Scenario-backed coverage")),
    ).toBeUndefined();
  });
});
