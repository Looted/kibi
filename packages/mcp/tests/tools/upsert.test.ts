import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { __test__, handleKbUpsert } from "../../src/tools/upsert.js";

type QueryResult = {
  success: boolean;
  bindings?: Record<string, string | undefined>;
  error?: string;
};

const initialKibiMcpDebug: string | undefined = process.env.KIBI_MCP_DEBUG;
const initialCwd = process.cwd();
let tempWorkspace: string | undefined;

function createMockProlog(
  handler: (goal: string) => Promise<QueryResult> | QueryResult,
) {
  const query = mock(async (goal: string) => {
    const result = await handler(goal);
    return { bindings: {}, ...result };
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
  process.chdir(initialCwd);
  if (tempWorkspace) {
    rmSync(tempWorkspace, { recursive: true, force: true });
    tempWorkspace = undefined;
  }
  if (initialKibiMcpDebug === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
  } else {
    process.env.KIBI_MCP_DEBUG = initialKibiMcpDebug;
  }
});

function createTempWorkspace(): string {
  tempWorkspace = mkdtempSync(path.join(tmpdir(), "kibi-mcp-upsert-"));
  process.chdir(tempWorkspace);
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

  test("accepts valid symbol_role values on symbol upserts", async () => {
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
      },
    });

    const transactionGoal = query.mock.calls.find(([goal]) =>
      String(goal).startsWith("rdf_transaction"),
    )?.[0] as string | undefined;
    expect(transactionGoal).toContain("symbol_role=behavioral");
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
      /Relationship source must match the upserted entity REQ-SOURCE-MISMATCH/,
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
        source: "documentation/symbols.yaml",
        sourceFile: "src/video-player.store.ts",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-VIDEO-PLAYER-STORE",
          to: "REQ-GRANULAR-001",
        },
      ],
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
          source: "documentation/symbols.yaml",
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
        source: "documentation/symbols.yaml",
        sourceFile: "src/worker.ts",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-WORKER-RUN",
          to: "REQ-GRANULAR-001",
        },
      ],
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
          source: "documentation/symbols.yaml",
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
        source: "documentation/symbols.yaml",
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
    });

    expect(result.structuredContent?.relationships_created).toBe(1);
  });

  test("rejects constrains relationships targeting property_value facts", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
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

    expect(query).toHaveBeenCalledTimes(1);
  });

  test("rejects requires_property relationships targeting subject facts", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
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

    expect(query).toHaveBeenCalledTimes(1);
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

    expect(query).toHaveBeenCalledTimes(8);
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(result.structuredContent).toEqual({
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
    expect(result.structuredContent).toEqual({
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
    expect(result.structuredContent).toEqual({
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
    expect(result.structuredContent).toEqual({
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

  test("wraps entity audit failures", async () => {
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
      "Upsert execution failed: Failed to record audit entry for REQ-AUDIT-FAIL-001: entity audit broke",
    );

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("wraps relationship audit failures", async () => {
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
      "Upsert execution failed: Failed to record relationship audit entry REQ-REL-AUDIT-FAIL-001->SCEN-FAIL-001: relationship audit broke",
    );

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("wraps save failures after invalidating the cache", async () => {
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
      "Upsert execution failed: Failed to save KB after upsert: disk full",
    );

    expect(invalidateCache).toHaveBeenCalledTimes(1);
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
});
