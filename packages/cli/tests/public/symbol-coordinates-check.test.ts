import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  SYMBOL_COORDINATES_MISSING_RULE,
  collectSymbolCoordinatesMissingViolations,
} from "../../src/public/operations/symbol-coordinates-check.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-coordinates-check-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

function prolog(rows: readonly string[]) {
  return {
    async query() {
      return { success: true, bindings: { Rows: `[${rows.join(",")}]` } };
    },
  };
}

describe("symbol-coordinates-missing", () => {
  test("warns on an active symbol Kibi could not place in an existing file", async () => {
    const root = workspace({
      "gravity.sh": "f() { :; }\n",
      "lib.rs": "fn g() {}\n",
    });
    const violations = await collectSymbolCoordinatesMissingViolations(
      prolog([
        '["SYM-unplaced",symbol,[title="timeit",status=active,sourceFile="gravity.sh"]]',
        '["SYM-placed",symbol,[title="g",status=active,sourceFile="lib.rs",sourceLine=1]]',
        '["SYM-gone",symbol,[title="h",status=active,sourceFile="missing.rs"]]',
        '["SYM-old",symbol,[title="f",status=deprecated,sourceFile="gravity.sh"]]',
      ]),
      root,
      new Set([SYMBOL_COORDINATES_MISSING_RULE]),
    );
    expect(violations.map((violation) => violation.entityId)).toEqual([
      "SYM-unplaced",
    ]);
    expect(violations[0]?.description).toContain(
      "has no symbol coordinates in gravity.sh",
    );
    expect(violations[0]?.suggestion).toContain(
      "kibi sync --refresh-symbol-coordinates",
    );
  });

  test("does nothing when the rule is not selected", async () => {
    const root = workspace({ "gravity.sh": "f() { :; }\n" });
    expect(
      await collectSymbolCoordinatesMissingViolations(
        prolog([
          '["SYM-unplaced",symbol,[title="f",status=active,sourceFile="gravity.sh"]]',
        ]),
        root,
        new Set(),
      ),
    ).toEqual([]);
  });
  test("fails loudly when the symbol projection query fails", async () => {
    const failing = (error?: string) => ({
      async query() {
        return { success: false, bindings: {}, ...(error ? { error } : {}) };
      },
    });
    const rules = new Set([SYMBOL_COORDINATES_MISSING_RULE]);
    await expect(
      collectSymbolCoordinatesMissingViolations(failing("no kb"), "/", rules),
    ).rejects.toThrow(
      "symbol-coordinates-missing symbol projection failed: no kb",
    );
    await expect(
      collectSymbolCoordinatesMissingViolations(failing(), "/", rules),
    ).rejects.toThrow(
      "symbol-coordinates-missing symbol projection failed: unknown error",
    );
  });
});
