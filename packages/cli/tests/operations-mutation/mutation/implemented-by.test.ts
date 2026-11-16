import { describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
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
      "implementedBy symbol expire resolves to no declaration in src/keys.ts. Candidates: Audit.rotate, KeyStore.revoke, KeyStore.rotate, expireKey, revoke.",
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

  test("takes the first free symbol id and refuses when none is free", async () => {
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
    const error = await refusal(
      req([{ sourceFile: "src/keys.ts", symbol: "expireKey" }]),
      taken(["SYM-keys-expire-key", "SYM-src-keys-expire-key"]),
    );
    expect(error.message).toContain(
      "no free symbol id for expireKey in src/keys.ts (SYM-keys-expire-key, SYM-src-keys-expire-key, SYM-src-keys-expire-key are taken)",
    );
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
});
