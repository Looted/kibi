import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SYMBOL_COORDINATES_MISSING_RULE,
  collectSymbolCoordinatesMissingViolations,
} from "../../../src/public/operations/symbol-coordinates-check.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-coordinates-mutation-"));
  roots.push(root);
  writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
  mkdirSync(join(root, "dir"));
  return root;
}

function prolog(bindings: Record<string, string>) {
  const queries: string[] = [];
  return {
    queries,
    async query(goal: string) {
      queries.push(goal);
      return { success: true, bindings };
    },
  };
}

const RULES = new Set([SYMBOL_COORDINATES_MISSING_RULE]);
const SUGGESTION =
  "Run kibi sync --refresh-symbol-coordinates and read its failed lines; use the name the extractor gives the declaration, install the plugins and grammar packs kibi doctor names, or add symbol_role and granularity_reason for a file-level link.";

function rows(...entries: string[]): Record<string, string> {
  return { Rows: `[${entries.join(",")}]` };
}

describe("collectSymbolCoordinatesMissingViolations", () => {
  test("names the rule", () => {
    expect(SYMBOL_COORDINATES_MISSING_RULE).toBe("symbol-coordinates-missing");
  });

  test("queries the symbol placement projection and reports exact violations", async () => {
    const root = workspace();
    const port = prolog(
      rows(
        '["SYM-a",symbol,[title="alpha",status=active,sourceFile="a.ts"]]',
        '["SYM-b",symbol,[title=[x,y],status=[deprecated],sourceFile="a.ts"]]',
      ),
    );
    const violations = await collectSymbolCoordinatesMissingViolations(
      port,
      root,
      RULES,
    );
    expect(port.queries).toStrictEqual([
      "findall([Id,symbol,Fields], (kb_entity(Id, symbol, Props), include([Key=_]>>memberchk(Key, [title,status,sourceFile,sourceLine]), Props, Fields)), Rows)",
    ]);
    expect(violations).toStrictEqual([
      {
        rule: "symbol-coordinates-missing",
        entityId: "SYM-a",
        source: "a.ts",
        description:
          "SYM-a (alpha) has no symbol coordinates in a.ts: Kibi could not place it, so its links are checked against no code",
        suggestion: SUGGESTION,
      },
      {
        rule: "symbol-coordinates-missing",
        entityId: "SYM-b",
        source: "a.ts",
        description:
          "SYM-b (SYM-b) has no symbol coordinates in a.ts: Kibi could not place it, so its links are checked against no code",
        suggestion: SUGGESTION,
      },
    ]);
  });

  test("skips rows that cannot or need not be reported", async () => {
    const root = workspace();
    const violations = await collectSymbolCoordinatesMissingViolations(
      prolog(
        rows(
          '["SYM-short",symbol]',
          '["SYM-nofile",symbol,[status=active]]',
          '["SYM-listfile",symbol,[status=active,sourceFile=[a]]]',
          '["SYM-emptyfile",symbol,[status=active,sourceFile=""]]',
          '["",symbol,[status=active,sourceFile="a.ts"]]',
          '["SYM-deprecated",symbol,[status=deprecated,sourceFile="a.ts"]]',
          '["SYM-removed",symbol,[status=removed,sourceFile="a.ts"]]',
          '["SYM-retired",symbol,[status=retired,sourceFile="a.ts"]]',
          '["SYM-superseded",symbol,[status=superseded,sourceFile="a.ts"]]',
          '["SYM-placed",symbol,[status=active,sourceFile="a.ts",sourceLine=1]]',
          '["SYM-missing",symbol,[status=active,sourceFile="missing.ts"]]',
          '["SYM-dir",symbol,[status=active,sourceFile="dir"]]',
          '["SYM-nostatus",symbol,[sourceFile="a.ts"]]',
        ),
      ),
      root,
      RULES,
    );
    expect(violations.map((violation) => violation.entityId)).toStrictEqual([
      "SYM-nostatus",
    ]);
  });

  test("returns nothing when the projection binds no rows", async () => {
    expect(
      await collectSymbolCoordinatesMissingViolations(
        prolog({}),
        workspace(),
        RULES,
      ),
    ).toStrictEqual([]);
  });

  test("does not query when the rule is not selected", async () => {
    const port = prolog(rows());
    expect(
      await collectSymbolCoordinatesMissingViolations(
        port,
        workspace(),
        new Set(["other"]),
      ),
    ).toStrictEqual([]);
    expect(port.queries).toStrictEqual([]);
  });

  test("fails loudly when the projection fails", async () => {
    const failing = (error?: string) => ({
      async query() {
        return error === undefined
          ? { success: false, bindings: {} }
          : { success: false, bindings: {}, error };
      },
    });
    await expect(
      collectSymbolCoordinatesMissingViolations(failing("oops"), "/", RULES),
    ).rejects.toThrow(
      new Error("symbol-coordinates-missing symbol projection failed: oops"),
    );
    await expect(
      collectSymbolCoordinatesMissingViolations(failing(), "/", RULES),
    ).rejects.toThrow(
      new Error(
        "symbol-coordinates-missing symbol projection failed: unknown error",
      ),
    );
  });
});
