import { describe, expect, test } from "bun:test";
import {
  InputError,
  KbRejection,
  OperationError,
} from "../../../src/cli-errors.js";
import type { CaptureReads } from "../../../src/operations/mutation/capture.js";
import {
  IMPLEMENTED_BY_DEPS,
  type ImplementedByDeps,
  executeUpsertRequest,
} from "../../../src/operations/mutation/implemented-by.js";
import type {
  UpsertInput,
  UpsertPayload,
} from "../../../src/operations/mutation/types.js";
import type {
  FilesystemPort,
  OperationContext,
} from "../../../src/public/operations/runtime-types.js";
import type { OperationResult } from "../../../src/public/operations/types.js";

// A workspace root that does not exist, so path resolution stays lexical.
const ROOT = "/kibi-implemented-by-root-none";
const SOURCE = `export function expireKey(createdAt: number): boolean {
  return createdAt > 0;
}
export class KeyStore {
  rotate(): void {}
  revoke(): void {}
}
export class Audit {
  rotate(): void {}
}
`;

function contextWith(files: Record<string, string>): OperationContext {
  const fs = {
    readFile: async (absolute: string) => {
      const relative = absolute.slice(ROOT.length + 1);
      const content = files[relative];
      if (content === undefined) throw new Error(`ENOENT: ${absolute}`);
      return content;
    },
  } as unknown as FilesystemPort;
  return {
    workspaceRoot: ROOT,
    signal: new AbortController().signal,
    clock: () => new Date(0),
    fs,
  };
}

const CONTEXT = contextWith({ "src/keys.ts": SOURCE, "src/empty.ts": "" });

function payload(extra: Partial<UpsertPayload> = {}): UpsertPayload {
  return {
    created: 1,
    updated: 0,
    relationships_created: 1,
    warnings: [],
    ...extra,
  };
}

type Recorded = {
  executed: UpsertInput[];
  validated: { input: UpsertInput; staged: unknown }[];
};

function deps(
  options: {
    stored?: Record<string, unknown>[];
    preview?: Record<string, unknown>;
    failSymbol?: string;
    empty?: boolean;
    reads?: CaptureReads;
  } = {},
): ImplementedByDeps & { calls: Recorded } {
  const calls: Recorded = { executed: [], validated: [] };
  return {
    calls,
    execute: async (input) => {
      calls.executed.push(input);
      if (options.empty === true)
        return { content: [] } as OperationResult<UpsertPayload>;
      if (input.id === options.failSymbol) throw new Error("disk full");
      if (input.dryRun === true)
        return {
          content: [{ type: "text", text: "preview" }],
          structuredContent: (options.preview ?? {
            valid: true,
            errors: [],
            warnings: [],
          }) as unknown as UpsertPayload,
        };
      return {
        content: [{ type: "text", text: `wrote ${input.id}` }],
        structuredContent: payload({ warnings: [`warned ${input.id}`] }),
      };
    },
    validate: (async (
      input: UpsertInput,
      _context: unknown,
      opts?: unknown,
    ) => {
      calls.validated.push({
        input,
        staged: (opts as { staged?: unknown } | undefined)?.staged,
      });
      return {
        validated: {
          entity: { id: input.id, type: input.type },
          relationships: [{ type: "specified_by", from: input.id, to: "S" }],
        },
      };
    }) as unknown as ImplementedByDeps["validate"],
    storedSymbols: async () => options.stored ?? [],
    captureReads: () => options.reads,
  };
}

function req(implementedBy: unknown, extra: Partial<UpsertInput> = {}) {
  return {
    type: "req",
    id: "REQ-key-expiry",
    properties: { title: "Keys expire", status: "open" },
    implementedBy,
    ...extra,
  } as UpsertInput;
}

async function refusal(
  input: UpsertInput,
  using: ImplementedByDeps = deps(),
): Promise<KbRejection> {
  try {
    await executeUpsertRequest(input, CONTEXT, using);
  } catch (error) {
    if (error instanceof KbRejection) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("executeUpsertRequest", () => {
  test("a write without implementedBy is the plain upsert", async () => {
    const using = deps();
    const input = { type: "fact", id: "F", properties: {} } as UpsertInput;
    const result = await executeUpsertRequest(input, CONTEXT, using);
    expect(using.calls.executed).toEqual([input]);
    expect(result.structuredContent?.implementedBy).toBeUndefined();
  });

  test("refuses malformed entries and entries on other entity types", async () => {
    expect((await refusal(req([]))).message).toContain(
      "implementedBy must be a non-empty array",
    );
    expect((await refusal(req("src/keys.ts"))).message).toContain(
      "non-empty array",
    );
    const scenario = await refusal(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }], {
        type: "scenario",
      }),
    );
    expect(scenario.message).toContain("accepted only on a requirement");
    expect(scenario.code).toBe("VALIDATION_FAILED");
    expect(scenario.issues).toEqual([
      { rule: "implemented_by_unresolved", field: "implementedBy" },
    ]);
    for (const entry of [
      { sourceFile: "src/keys.ts" },
      { sourceFile: "src/keys.ts", symbol: "  " },
      { sourceFile: "", symbol: "expireKey" },
      { sourceFile: "  ", symbol: "expireKey" },
      null,
    ])
      expect((await refusal(req([entry]))).message).toContain(
        "a whole file is never an implements link",
      );
  });

  test("refuses a file outside the workspace or one it cannot read", async () => {
    expect(
      (await refusal(req([{ sourceFile: "../keys.ts", symbol: "expireKey" }])))
        .message,
    ).toContain("is not a file inside the workspace");
    expect(
      (await refusal(req([{ sourceFile: "src/gone.ts", symbol: "expireKey" }])))
        .message,
    ).toContain("src/gone.ts, which cannot be read");
  });

  test("refuses a name the file does not declare, naming the candidates", async () => {
    const missing = await refusal(
      req([{ sourceFile: "src/keys.ts", symbol: "expire" }]),
    );
    expect(missing.message).toContain(
      "implementedBy symbol expire resolves to no declaration in src/keys.ts. Candidates: Audit.rotate, KeyStore.revoke, KeyStore.rotate, expireKey.",
    );
    const shared = await refusal(
      req([{ sourceFile: "src/keys.ts", symbol: "rotate" }]),
    );
    expect(shared.message).toContain(
      "names 2 declarations in src/keys.ts; name one as Class.method. Candidates: Audit.rotate, KeyStore.rotate.",
    );
    const empty = await refusal(
      req([{ sourceFile: "src/empty.ts", symbol: "expireKey" }]),
    );
    expect(empty.message).toContain("Candidates: none.");
  });

  test("refuses a class whose behavior lives in its methods", async () => {
    const coarse = await refusal(
      req([{ sourceFile: "src/keys.ts", symbol: "KeyStore" }]),
    );
    expect(coarse.message).toContain(
      "implementedBy symbol KeyStore in src/keys.ts is a coarse link; link the declarations that implement the requirement instead. Candidates: KeyStore.revoke, KeyStore.rotate.",
    );
  });

  test("lists at most ten candidates", async () => {
    const many = Array.from(
      { length: 12 },
      (_, index) => `export function f${String(index).padStart(2, "0")}() {}`,
    ).join("\n");
    const error = await executeUpsertRequest(
      req([{ sourceFile: "src/many.ts", symbol: "g" }]),
      contextWith({ "src/many.ts": many }),
      deps(),
    ).catch((caught: Error) => caught);
    const message = (error as Error).message;
    expect(message).toContain("f09, and 2 more.");
  });

  test("validates everything first, then writes the requirement and a new symbol", async () => {
    const using = deps();
    const result = await executeUpsertRequest(
      req([
        { sourceFile: "./src/keys.ts", symbol: "expireKey" },
        { sourceFile: "src/keys.ts", symbol: "KeyStore.rotate" },
      ]),
      CONTEXT,
      using,
    );
    const symbolInput = {
      type: "symbol",
      id: "SYM-keys-expire-key",
      properties: {
        title: "expireKey",
        sourceFile: "src/keys.ts",
        status: "active",
        symbol_role: "behavioral",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-keys-expire-key",
          to: "REQ-key-expiry",
        },
      ],
    };
    const requirement = {
      type: "req",
      id: "REQ-key-expiry",
      properties: { title: "Keys expire", status: "open" },
    };
    expect(using.calls.validated.map((call) => call.input.id)).toEqual([
      "REQ-key-expiry",
      "SYM-keys-expire-key",
      "SYM-keys-key-store-rotate",
    ]);
    expect(using.calls.validated[0]?.staged).toBeUndefined();
    expect(using.calls.validated[1]?.input).toEqual(symbolInput);
    const staged = using.calls.validated[1]?.staged as {
      entities: Map<string, unknown>;
      relationships: unknown[];
    };
    expect([...staged.entities.entries()]).toEqual([
      ["REQ-key-expiry", { id: "REQ-key-expiry", type: "req" }],
    ]);
    expect(staged.relationships).toEqual([
      { type: "specified_by", from: "REQ-key-expiry", to: "S" },
    ]);
    expect(using.calls.executed).toEqual([
      requirement,
      symbolInput,
      expect.objectContaining({ id: "SYM-keys-key-store-rotate" }),
    ] as UpsertInput[]);
    expect(result.structuredContent).toEqual({
      ...payload(),
      created: 3,
      relationships_created: 3,
      warnings: [
        "warned REQ-key-expiry",
        "warned SYM-keys-expire-key",
        "warned SYM-keys-key-store-rotate",
      ],
      implementedBy: [
        {
          sourceFile: "src/keys.ts",
          symbol: "expireKey",
          symbolId: "SYM-keys-expire-key",
          created: true,
        },
        {
          sourceFile: "src/keys.ts",
          symbol: "KeyStore.rotate",
          symbolId: "SYM-keys-key-store-rotate",
          created: true,
        },
      ],
    });
    expect(result.content.at(-1)).toEqual({
      type: "text",
      text: "Linked 2 implementing symbol(s): SYM-keys-expire-key (new), SYM-keys-key-store-rotate (new).",
    });
  });

  test("reuses the stored symbol of the declaration and keeps its status", async () => {
    const using = deps({
      stored: [
        { id: "SYM-other", title: "expireKey", sourceFile: "src/other.ts" },
        {
          id: "SYM-store",
          title: "KeyStore.rotate",
          sourceFile: "src/keys.ts",
        },
        {
          id: "SYM-expiry",
          title: "expireKey",
          sourceFile: "./src/keys.ts",
          status: "draft",
        },
        { id: "SYM-no-file", title: "expireKey" },
      ],
    });
    const result = await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      CONTEXT,
      using,
    );
    expect(using.calls.executed[1]).toEqual({
      type: "symbol",
      id: "SYM-expiry",
      properties: { title: "expireKey", status: "draft" },
      relationships: [
        { type: "implements", from: "SYM-expiry", to: "REQ-key-expiry" },
      ],
    });
    expect(result.structuredContent?.implementedBy).toEqual([
      {
        sourceFile: "src/keys.ts",
        symbol: "expireKey",
        symbolId: "SYM-expiry",
        created: false,
      },
    ]);
    expect(result.content.at(-1)).toEqual({
      type: "text",
      text: "Linked 1 implementing symbol(s): SYM-expiry.",
    });
    const statusless = deps({
      stored: [
        { id: "SYM-expiry", title: "expireKey", sourceFile: "src/keys.ts" },
      ],
    });
    await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      CONTEXT,
      statusless,
    );
    expect(statusless.calls.executed[1]?.properties).toStrictEqual({
      title: "expireKey",
    });
  });

  test("refuses a declaration with several symbol entities", async () => {
    const twice = deps({
      stored: [
        { id: "SYM-a", title: "expireKey", sourceFile: "src/keys.ts" },
        { id: "SYM-b", title: "expireKey", sourceFile: "src/keys.ts" },
      ],
    });
    const error = await refusal(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      twice,
    );
    expect(error.message).toContain(
      "has several symbol entities (SYM-a, SYM-b)",
    );
    expect(twice.calls.executed).toEqual([]);
  });

  test("takes the first free symbol id, then numbers the file-qualified one", async () => {
    const taken = (ids: string[]) =>
      deps({ stored: ids.map((id) => ({ id, title: "x", sourceFile: "y" })) });
    const second = taken(["SYM-keys-expire-key"]);
    await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      CONTEXT,
      second,
    );
    expect(second.calls.executed[1]?.id).toBe("SYM-src-keys-expire-key");
    // Two entries of one write never share a minted id.
    const both = deps();
    await executeUpsertRequest(
      req([
        { sourceFile: "src/keys.ts", symbol: "expireKey" },
        { sourceFile: "lib/keys.ts", symbol: "expireKey" },
      ]),
      contextWith({ "src/keys.ts": SOURCE, "lib/keys.ts": SOURCE }),
      both,
    );
    expect(both.calls.executed.map((input) => input.id)).toEqual([
      "REQ-key-expiry",
      "SYM-keys-expire-key",
      "SYM-lib-keys-expire-key",
    ]);
    // For src/keys.ts the path-qualified id is the directory-qualified one.
    const numbered = taken([
      "SYM-keys-expire-key",
      "SYM-src-keys-expire-key",
      "SYM-keys-expire-key-2",
    ]);
    await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      CONTEXT,
      numbered,
    );
    expect(numbered.calls.executed[1]?.id).toBe("SYM-keys-expire-key-3");
    const nested = taken(["SYM-keys-expire-key", "SYM-b-keys-expire-key"]);
    await executeUpsertRequest(
      req([{ sourceFile: "a/b/keys.ts", symbol: "expireKey" }]),
      contextWith({ "a/b/keys.ts": SOURCE }),
      nested,
    );
    expect(nested.calls.executed[1]?.id).toBe("SYM-a-b-keys-expire-key");
  });

  test("a dry run previews the links and writes no symbol", async () => {
    const using = deps();
    const result = await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }], {
        dryRun: true,
      }),
      CONTEXT,
      using,
    );
    expect(using.calls.executed).toEqual([
      expect.objectContaining({ id: "REQ-key-expiry", dryRun: true }),
    ] as UpsertInput[]);
    expect(using.calls.validated.map((call) => call.input.id)).toEqual([
      "REQ-key-expiry",
      "SYM-keys-expire-key",
    ]);
    expect(using.calls.validated[0]?.input.dryRun).toBeUndefined();
    expect(result.structuredContent).toEqual({
      valid: true,
      errors: [],
      warnings: [],
      implementedBy: [
        {
          sourceFile: "src/keys.ts",
          symbol: "expireKey",
          symbolId: "SYM-keys-expire-key",
          created: true,
        },
      ],
    } as unknown as UpsertPayload);

    const invalid = deps({ preview: { valid: false, errors: ["bad"] } });
    const refused = await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }], {
        dryRun: true,
      }),
      CONTEXT,
      invalid,
    );
    expect(refused.structuredContent).toEqual({
      valid: false,
      errors: ["bad"],
    } as unknown as UpsertPayload);
    expect(invalid.calls.validated).toEqual([]);
  });

  test("a failed symbol write names what was written and what is left", async () => {
    const using = deps({ failSymbol: "SYM-keys-key-store-rotate" });
    const error = await executeUpsertRequest(
      req([
        { sourceFile: "src/keys.ts", symbol: "expireKey" },
        { sourceFile: "src/keys.ts", symbol: "KeyStore.rotate" },
      ]),
      CONTEXT,
      using,
    ).catch((caught: Error) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      "REQ-key-expiry was written, and 1 of 2 implementedBy link(s) with it; linking KeyStore.rotate in src/keys.ts failed: disk full. Upsert the remaining symbol payloads to finish: [",
    );
    expect((error as Error).message).toContain(
      '"id":"SYM-keys-key-store-rotate"',
    );
    expect((error as Error).message).not.toContain(
      '"id":"SYM-keys-expire-key"',
    );
    expect((error as Error).cause).toBeInstanceOf(Error);
    const thrown: ImplementedByDeps = {
      ...deps({ failSymbol: "SYM-keys-expire-key" }),
      execute: (async (input: UpsertInput) => {
        if (input.type === "symbol") throw "offline";
        return { content: [], structuredContent: payload() };
      }) as ImplementedByDeps["execute"],
    };
    const nonError = await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      CONTEXT,
      thrown,
    ).catch((caught: Error) => caught);
    expect((nonError as Error).message).toContain("failed: offline.");
  });

  test("a result without a payload is a fault", async () => {
    const error = await executeUpsertRequest(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      CONTEXT,
      deps({ empty: true }),
    ).catch((caught: Error) => caught);
    expect((error as Error).message).toBe("kb_upsert returned no payload");
  });

  test("a written requirement gets its why applied, the steps left and the requirements on the same terms", async () => {
    const reads: CaptureReads = {
      entity: async (id) =>
        id === "REQ-key-expiry"
          ? { title: "Keys expire", status: "open" }
          : undefined,
      exists: async () => false,
      implementingSymbols: async () => [],
      scenarios: async () => [],
      covered: async () => true,
      tested: async () => true,
      subjectGaps: async () => [
        {
          claimKey: "C1",
          claimText: "c",
          candidates: ["keys"],
          labels: ["keys"],
        },
      ],
      currentRequirements: async () => [
        {
          id: "REQ-key-age",
          title: "Keys expire",
          semanticText: "Keys expire after 90 days.",
        },
      ],
    };
    const using = deps({ reads });
    const result = await executeUpsertRequest(
      req(undefined, {
        implementedBy: undefined,
        why: "Leaked keys stay valid.",
      }),
      CONTEXT,
      using,
    );
    expect(using.calls.executed[0]?.properties).toMatchObject({
      rationale: "Leaked keys stay valid.",
    });
    expect(using.calls.executed[0]).not.toHaveProperty("why");
    expect(result.structuredContent?.warnings).toEqual([
      "warned REQ-key-expiry",
    ]);
    expect(
      result.structuredContent?.nextActions?.map((step) => step.code),
    ).toEqual(["claim-subject-missing"]);
    expect(result.structuredContent?.relatedRequirements).toEqual([
      { id: "REQ-key-age", statement: "Keys expire after 90 days." },
    ]);
    expect(result.content.map((part) => part.text)).toEqual([
      "wrote REQ-key-expiry",
      "Left before kb_check passes: 1 step(s), each in nextActions with its input.",
      "Current requirements on the same terms: REQ-key-age. If REQ-key-expiry replaces one, add a supersedes link to it and close it.",
    ]);

    // Nothing left and nothing related adds nothing.
    const quiet = await executeUpsertRequest(
      req(undefined, { implementedBy: undefined }),
      CONTEXT,
      deps({
        reads: {
          ...reads,
          subjectGaps: async () => [],
          currentRequirements: async () => [],
        },
      }),
    );
    expect(quiet.content.map((part) => part.text)).toEqual([
      "wrote REQ-key-expiry",
    ]);
    expect(quiet.structuredContent).not.toHaveProperty("nextActions");
    expect(quiet.structuredContent).not.toHaveProperty("relatedRequirements");

    // A store that fails a follow-up read leaves the write's own result.
    const failing = await executeUpsertRequest(
      req(undefined, { implementedBy: undefined }),
      CONTEXT,
      deps({
        reads: {
          ...reads,
          entity: async () => {
            throw new Error("Query failed");
          },
          currentRequirements: async () => [],
        },
      }),
    );
    expect(failing.structuredContent?.warnings).toEqual([
      "warned REQ-key-expiry",
    ]);
    expect(failing.structuredContent).not.toHaveProperty("nextActions");

    // A dry run, a write needing repair and another type get no follow-up.
    const dry = await executeUpsertRequest(
      req(undefined, { implementedBy: undefined, dryRun: true }),
      CONTEXT,
      deps({ reads }),
    );
    expect(dry.content.map((part) => part.text)).toEqual(["preview"]);
    const repairing = deps({ reads });
    const repaired = await executeUpsertRequest(
      req(undefined, { implementedBy: undefined }),
      CONTEXT,
      {
        ...repairing,
        execute: async () => ({
          content: [{ type: "text", text: "repair" }],
          structuredContent: payload({ status: "committed_with_repairs" }),
        }),
      },
    );
    expect(repaired.structuredContent).not.toHaveProperty("nextActions");
    const fact = await executeUpsertRequest(
      { type: "fact", id: "F", properties: {} } as UpsertInput,
      CONTEXT,
      deps({ reads }),
    );
    expect(fact.structuredContent).not.toHaveProperty("nextActions");
  });

  test("the default capture reads need a store", () => {
    expect(IMPLEMENTED_BY_DEPS.captureReads(CONTEXT)).toBeUndefined();
    expect(
      IMPLEMENTED_BY_DEPS.captureReads({
        ...CONTEXT,
        prolog: { query: async () => ({ success: false, bindings: {} }) },
      } as unknown as OperationContext),
    ).toBeDefined();
  });

  test("the default deps read the stored symbols from the store", async () => {
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string) => {
        goals.push(goal);
        return { success: true, bindings: { Results: "[]" } };
      },
    };
    expect(
      await IMPLEMENTED_BY_DEPS.storedSymbols({
        ...CONTEXT,
        prolog,
      } as unknown as OperationContext),
    ).toEqual([]);
    expect(goals.some((goal) => goal.includes("symbol"))).toBe(true);
  });

  test("mints ids from trimmed names and records no role it cannot infer", async () => {
    const using = deps();
    const result = await executeUpsertRequest(
      req([
        { sourceFile: " src/_my__keys.ts ", symbol: " LIMIT " },
        { sourceFile: "src/_my__keys.ts", symbol: "expireKey" },
      ]),
      contextWith({
        "src/_my__keys.ts": `export const LIMIT = 3;\n${SOURCE}`,
      }),
      using,
    );
    expect(result.structuredContent?.implementedBy).toEqual([
      {
        sourceFile: "src/_my__keys.ts",
        symbol: "LIMIT",
        symbolId: "SYM-my-keys-limit",
        created: true,
      },
      {
        sourceFile: "src/_my__keys.ts",
        symbol: "expireKey",
        symbolId: "SYM-my-keys-expire-key",
        created: true,
      },
    ]);
    expect(using.calls.executed[1]?.properties).toStrictEqual({
      title: "LIMIT",
      sourceFile: "src/_my__keys.ts",
      status: "active",
    });
    expect(using.calls.executed[2]?.properties).toMatchObject({
      symbol_role: "behavioral",
    });
  });
  test("records one link for entries that name one declaration", async () => {
    const using = deps();
    const result = await executeUpsertRequest(
      req([
        { sourceFile: "src/keys.ts", symbol: "expireKey" },
        { sourceFile: "./src/keys.ts", symbol: "expireKey" },
        { sourceFile: "src/keys.ts", symbol: "KeyStore.revoke" },
        { sourceFile: "src/keys.ts", symbol: "revoke" },
      ]),
      CONTEXT,
      using,
    );
    expect(using.calls.executed.map((input) => input.id)).toEqual([
      "REQ-key-expiry",
      "SYM-keys-expire-key",
      "SYM-keys-key-store-revoke",
    ]);
    expect(
      result.structuredContent?.implementedBy?.map((link) => link.symbol),
    ).toEqual(["expireKey", "KeyStore.revoke"]);
    expect(using.calls.executed[2]?.properties?.title).toBe("KeyStore.revoke");
  });

  test("matches a stored symbol by any name its declaration goes by", async () => {
    for (const [title, sent] of [
      ["revoke", "KeyStore.revoke"],
      ["KeyStore.revoke", "revoke"],
    ]) {
      const using = deps({
        stored: [
          { id: "SYM-revoke", title, sourceFile: "src/keys.ts" },
          { id: "SYM-rotate", title: "rotate", sourceFile: "src/keys.ts" },
        ],
      });
      const result = await executeUpsertRequest(
        req([{ sourceFile: "src/keys.ts", symbol: sent as string }]),
        CONTEXT,
        using,
      );
      expect(using.calls.executed[1]).toEqual({
        type: "symbol",
        id: "SYM-revoke",
        properties: { title },
        relationships: [
          { type: "implements", from: "SYM-revoke", to: "REQ-key-expiry" },
        ],
      });
      expect(result.structuredContent?.implementedBy).toEqual([
        {
          sourceFile: "src/keys.ts",
          symbol: "KeyStore.revoke",
          symbolId: "SYM-revoke",
          created: false,
        },
      ]);
    }
  });

  test("mints a non-empty id for a name the ASCII slug cannot spell", async () => {
    const using = deps();
    const result = await executeUpsertRequest(
      req([
        { sourceFile: "src/b.ts", symbol: "日本" },
        { sourceFile: "src/b.ts", symbol: "naïve" },
        { sourceFile: "src/b.ts", symbol: "$" },
      ]),
      contextWith({
        "src/b.ts":
          "export const 日本 = 1;\nexport const naïve = 2;\nexport const $ = 3;\n",
      }),
      using,
    );
    const ids = (result.structuredContent?.implementedBy ?? []).map(
      (link) => link.symbolId,
    );
    expect(ids).toHaveLength(3);
    expect(ids[0]).toMatch(/^SYM-b-[0-9a-f]{8}$/);
    expect(ids[1]).toMatch(/^SYM-b-na-ve-[0-9a-f]{8}$/);
    expect(ids[2]).toMatch(/^SYM-b-[0-9a-f]{8}$/);
    expect(new Set(ids).size).toBe(3);
  });

  test("accepts and lists the declarations kb_upsert links granularly", async () => {
    const source = `export interface Shape { size: number }
export type Id = string;
export const LIMIT = 3;
function internal(): void {}
export function area(): number { return 1; }
`;
    const context = contextWith({ "src/c.ts": source });
    const missing = await executeUpsertRequest(
      req([{ sourceFile: "src/c.ts", symbol: "internal" }]),
      context,
      deps(),
    ).catch((caught: Error) => caught);
    expect((missing as Error).message).toContain(
      "implementedBy symbol internal resolves to no declaration in src/c.ts. Candidates: area, Id, LIMIT, Shape.",
    );
    const using = deps();
    const result = await executeUpsertRequest(
      req([
        { sourceFile: "src/c.ts", symbol: "Shape" },
        { sourceFile: "src/c.ts", symbol: "LIMIT" },
      ]),
      context,
      using,
    );
    expect(
      result.structuredContent?.implementedBy?.map((link) => link.symbolId),
    ).toEqual(["SYM-c-shape", "SYM-c-limit"]);
  });

  test("reports the symbol writes in the counts and the written files", async () => {
    const using: {
      -readonly [K in keyof ReturnType<typeof deps>]: ReturnType<
        typeof deps
      >[K];
    } = deps();
    const write = (path: string, before: string | null, after: string) => ({
      path,
      beforeHash: before,
      afterHash: after,
      created: before === null,
    });
    let symbols = 0;
    using.execute = (async (input: UpsertInput) => {
      if (input.type === "req")
        return {
          content: [],
          structuredContent: payload({
            sourceWrites: [write(".kb/requirements/R.md", null, "r1")],
          }),
        };
      symbols += 1;
      return {
        content: [],
        structuredContent: payload({
          created: symbols === 1 ? 1 : 0,
          updated: symbols === 1 ? 0 : 1,
          sourceWrites: [
            write(".kb/symbols.yaml", `s${symbols - 1}`, `s${symbols}`),
            ...(symbols === 1 ? [] : [write(".kb/rel.yaml", null, "l1")]),
          ],
        }),
      };
    }) as ImplementedByDeps["execute"];
    const result = await executeUpsertRequest(
      req([
        { sourceFile: "src/keys.ts", symbol: "expireKey" },
        { sourceFile: "src/keys.ts", symbol: "KeyStore.rotate" },
      ]),
      CONTEXT,
      using,
    );
    expect(result.structuredContent).toMatchObject({
      created: 2,
      updated: 1,
      relationships_created: 3,
      sourceWrites: [
        write(".kb/requirements/R.md", null, "r1"),
        write(".kb/symbols.yaml", "s0", "s2"),
        write(".kb/rel.yaml", null, "l1"),
      ],
    });
  });

  test("a failed symbol write keeps a coded failure's code and retryability", async () => {
    const failing = (error: unknown): ImplementedByDeps => ({
      ...deps(),
      execute: (async (input: UpsertInput) => {
        if (input.type === "symbol") throw error;
        return { content: [], structuredContent: payload() };
      }) as ImplementedByDeps["execute"],
    });
    const run = (error: unknown) =>
      executeUpsertRequest(
        req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
        CONTEXT,
        failing(error),
      ).catch((caught: unknown) => caught);
    for (const retryable of [true, false]) {
      const cause = new OperationError("SOURCE_X", "held", retryable);
      const error = (await run(cause)) as OperationError;
      expect(error).toBeInstanceOf(OperationError);
      expect(error.code).toBe("SOURCE_X");
      expect(error.retryable).toBe(retryable);
      expect(error.detail).toContain("REQ-key-expiry was written");
      expect(error.detail).toContain("failed: held.");
      expect(error.cause).toBe(cause);
    }
    const input = (await run(
      new InputError("BAD_SYMBOL", "bad"),
    )) as InputError;
    expect(input).toBeInstanceOf(InputError);
    expect(input.code).toBe("BAD_SYMBOL");
    expect(input.detail).toContain("failed: bad.");
    const rejection = (await run(
      new KbRejection("VALIDATION_FAILED", "no", [{ rule: "r", field: "f" }]),
    )) as KbRejection;
    expect(rejection).toBeInstanceOf(KbRejection);
    expect(rejection.code).toBe("VALIDATION_FAILED");
    expect(rejection.issues).toEqual([{ rule: "r", field: "f" }]);
    expect(rejection.message).toContain("failed: no.");
  });
});
