import { describe, expect, test } from "bun:test";
import {
  SYMBOL_GRANULARITY_VIOLATION,
  validateSymbolGranularity,
} from "../../../src/operations/mutation/symbol-granularity.js";
import type {
  FilesystemPort,
  OperationContext,
} from "../../../src/public/operations/runtime-types.js";

// A workspace root that does not exist, so path resolution stays lexical.
const ROOT = "/kibi-granularity-root-none";
const SOURCE = `export const LIMIT = 3;
export class Zeta {
  render(): void {}
  apply(): void {}
}
export function beta(): void {}
export interface Shape { a: number }
`;
const REASONS =
  "config-artifact, module-level-behavior, extractor-miss, legacy-link, or test-suite";
const LINK = [{ type: "implements", from: "SYM-1", to: "REQ-1" }];

type Options = Readonly<{
  content?: string;
  isFile?: boolean;
  statError?: unknown;
}>;

function memoryFs(options: Options = {}) {
  const calls: string[] = [];
  const fs = {
    stat: async (path: string) => {
      calls.push(`stat ${path}`);
      if (options.statError !== undefined) throw options.statError;
      return {
        isFile: () => options.isFile ?? true,
        isDirectory: () => !(options.isFile ?? true),
      };
    },
    readFile: async (path: string) => {
      calls.push(`read ${path}`);
      return options.content ?? SOURCE;
    },
  } as unknown as FilesystemPort;
  return { fs, calls };
}

function contextWith(fs: FilesystemPort | undefined): OperationContext {
  return {
    workspaceRoot: ROOT,
    signal: new AbortController().signal,
    clock: () => new Date(0),
    ...(fs ? { fs } : {}),
  };
}

function symbol(properties: Record<string, unknown> = {}) {
  return {
    type: "symbol",
    id: "SYM-1",
    title: "Zeta",
    sourceFile: "src/a.ts",
    ...properties,
  };
}

function violation(behavioral: string, ignored = "LIMIT, Shape") {
  return `Symbol SYM-1 links src/a.ts coarsely while granular symbols are available (behavioral only): ${behavioral}. Move relationships to a behavioral symbol, add a manifest behavioral anchor, or set granularity_reason to ${REASONS}.${ignored ? ` Non-behavioral symbols in the file were ignored for this decision: ${ignored}.` : ""}`;
}

async function outcome(
  payload: Record<string, unknown>,
  options: Options & {
    relationships?: readonly { type: string; from: string; to: string }[];
    stored?: Record<string, unknown> | null | undefined | "none";
    noFs?: boolean;
  } = {},
) {
  const { fs, calls } = memoryFs(options);
  const stored = options.stored;
  try {
    await validateSymbolGranularity(
      payload,
      options.relationships ?? LINK,
      contextWith(options.noFs ? undefined : fs),
      stored === "none" ? undefined : async () => stored,
    );
    return { result: "ok", calls };
  } catch (error) {
    const typed = error as { code?: string; message: string; name: string };
    return {
      result: { name: typed.name, code: typed.code, message: typed.message },
      calls,
    };
  }
}

const READ = [`stat ${ROOT}/src/a.ts`, `read ${ROOT}/src/a.ts`];

describe("SYMBOL_GRANULARITY_VIOLATION", () => {
  test("is the error code of a coarse symbol link", () => {
    expect(SYMBOL_GRANULARITY_VIOLATION).toBe("SYMBOL_GRANULARITY_VIOLATION");
  });
});

describe("validateSymbolGranularity", () => {
  test("refuses a class linked while its methods are available", async () => {
    expect(await outcome(symbol(), { stored: "none" })).toStrictEqual({
      result: {
        name: "InputError",
        code: "SYMBOL_GRANULARITY_VIOLATION",
        message: violation("Zeta.apply, Zeta.render"),
      },
      calls: READ,
    });
  });

  test("judges an unknown title against every behavioral symbol", async () => {
    expect(
      (await outcome(symbol({ title: "Other" }), { stored: "none" })).result,
    ).toStrictEqual({
      name: "InputError",
      code: "SYMBOL_GRANULARITY_VIOLATION",
      message: violation("Zeta, Zeta.apply, Zeta.render, apply, beta, render"),
    });
  });

  test("accepts a declaration with no narrower behavioral symbols", async () => {
    for (const title of ["render", "beta", "LIMIT"]) {
      expect(
        await outcome(symbol({ title }), { stored: "none" }),
      ).toStrictEqual({ result: "ok", calls: READ });
    }
  });

  test("leaves the ignored note out when every symbol is behavioral", async () => {
    expect(
      (
        await outcome(symbol(), {
          stored: "none",
          content: "export class Zeta {\n  render(): void {}\n}\n",
        })
      ).result,
    ).toStrictEqual({
      name: "InputError",
      code: "SYMBOL_GRANULARITY_VIOLATION",
      message: violation("Zeta.render", ""),
    });
  });

  test("summarizes more than ten names", async () => {
    const methods = Array.from(
      { length: 12 },
      (_, i) => `  m${i + 10}(): void {}`,
    );
    const content = `export class Zeta {\n${methods.join("\n")}\n}\n`;
    expect(
      (await outcome(symbol(), { stored: "none", content })).result,
    ).toStrictEqual({
      name: "InputError",
      code: "SYMBOL_GRANULARITY_VIOLATION",
      message: violation(
        "Zeta.m10, Zeta.m11, Zeta.m12, Zeta.m13, Zeta.m14, Zeta.m15, Zeta.m16, Zeta.m17, Zeta.m18, Zeta.m19, and 2 more",
        "",
      ),
    });
  });

  test("ignores payloads that are not symbols", async () => {
    expect(
      await outcome(symbol({ type: "req" }), { stored: "none" }),
    ).toStrictEqual({ result: "ok", calls: [] });
  });

  test("ignores symbols without a traceability link", async () => {
    for (const relationships of [
      [],
      [{ type: "relates_to", from: "SYM-1", to: "REQ-1" }],
    ]) {
      expect(
        await outcome(symbol(), { stored: "none", relationships }),
      ).toStrictEqual({ result: "ok", calls: [] });
    }
  });

  test("accepts an allowed granularity reason", async () => {
    expect(
      await outcome(symbol({ granularity_reason: "legacy-link" }), {
        stored: "none",
      }),
    ).toStrictEqual({ result: "ok", calls: [] });
  });

  test("needs a string source file and title", async () => {
    for (const properties of [
      { sourceFile: 7 },
      { title: 7 },
      { title: undefined },
    ]) {
      expect(
        await outcome(symbol(properties), { stored: "none" }),
      ).toStrictEqual({ result: "ok", calls: [] });
    }
  });

  test("skips the check without a filesystem", async () => {
    expect(
      await outcome(symbol(), { stored: "none", noFs: true }),
    ).toStrictEqual({ result: "ok", calls: [] });
  });

  test("skips a source file outside the workspace", async () => {
    expect(
      await outcome(symbol({ sourceFile: "../outside.ts" }), {
        stored: "none",
      }),
    ).toStrictEqual({ result: "ok", calls: [] });
  });

  test("skips a source path that is not a file", async () => {
    expect(
      await outcome(symbol(), { stored: "none", isFile: false }),
    ).toStrictEqual({ result: "ok", calls: [`stat ${ROOT}/src/a.ts`] });
  });

  test("skips an unreadable file but rethrows a non-error failure", async () => {
    expect(
      await outcome(symbol(), { stored: "none", statError: new Error("gone") }),
    ).toStrictEqual({ result: "ok", calls: [`stat ${ROOT}/src/a.ts`] });
    await expect(
      validateSymbolGranularity(
        symbol(),
        LINK,
        contextWith(memoryFs({ statError: "boom" }).fs),
      ),
    ).rejects.toBe("boom");
  });

  test("falls back to the stored symbol's location fields", async () => {
    const payload = { type: "symbol", id: "SYM-1" };
    expect(
      (
        await outcome(payload, {
          stored: { title: "Zeta", sourceFile: "src/a.ts" },
        })
      ).result,
    ).toStrictEqual({
      name: "InputError",
      code: "SYMBOL_GRANULARITY_VIOLATION",
      message: violation("Zeta.apply, Zeta.render"),
    });
    expect(
      await outcome(payload, {
        stored: {
          title: "Zeta",
          sourceFile: "src/a.ts",
          granularity_reason: "test-suite",
        },
      }),
    ).toStrictEqual({ result: "ok", calls: [] });
  });

  test("keeps the payload's own fields over stored ones", async () => {
    expect(
      await outcome(symbol({ title: "render" }), {
        stored: { title: "Zeta", sourceFile: "src/other.ts" },
      }),
    ).toStrictEqual({ result: "ok", calls: READ });
    expect(
      (await outcome(symbol(), { stored: { granularity_reason: undefined } }))
        .result,
    ).toStrictEqual({
      name: "InputError",
      code: "SYMBOL_GRANULARITY_VIOLATION",
      message: violation("Zeta.apply, Zeta.render"),
    });
  });

  test("uses the payload alone when nothing is stored", async () => {
    for (const stored of [null, undefined]) {
      expect((await outcome(symbol(), { stored })).result).toStrictEqual({
        name: "InputError",
        code: "SYMBOL_GRANULARITY_VIOLATION",
        message: violation("Zeta.apply, Zeta.render"),
      });
    }
  });
});
