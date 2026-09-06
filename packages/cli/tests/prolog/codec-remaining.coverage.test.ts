// implements REQ-009
import { afterEach, describe, expect, test } from "bun:test";
import {
  entityFromBindingParts,
  fallbackWhenPairMissing,
  fileUriLeaf,
  firstTwoDefinedParts,
  parseAtomList,
  parseEntityFromBinding,
  parseEntityFromList,
  parsePairList,
  parsePrologValue,
  parsePropertyList,
  parseTriples,
  parseViolationRows,
  typedLiteralFromParts,
} from "../../src/prolog/codec.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
const previousExitCode = process.exitCode;

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (typeof previousExitCode === "number") process.exitCode = previousExitCode;
  else if (typeof process.exitCode === "number") process.exitCode = 0;
});

describe("prolog codec leftover parse branches", () => {
  test("covers typed literals, URI edges, quote failures, and list helpers", () => {
    restores.push(isolateKibiEnv());
    expect(parseEntityFromBinding("  ")).toEqual({});
    expect(parseEntityFromList(["only"])).toEqual({});
    expect(
      parsePropertyList(
        `[dup=1,dup=2,dup=3,rule_ir="{",semantic_inventory="not-json"]`,
      ).dup,
    ).toEqual(["1", "2", "3"]);
    expect(parsePrologValue(`^^(("nested"), extra)`)).toBe('("nested")');
    expect(parsePrologValue(`^^("3.5", http://example#decimal)`)).toBe(3.5);
    expect(parsePrologValue(`^^("2.5", http://example#double)`)).toBe(2.5);
    expect(parsePrologValue(`^^("false", http://example#boolean)`)).toBe(false);
    expect(parsePrologValue(`^^("[]", http://example#string)`)).toEqual([]);
    expect(parsePrologValue(`^^("[a,b]", http://example#string)`)).toEqual([
      "a",
      "b",
    ]);
    expect(parsePrologValue("file:///")).toBe("");
    expect(parsePrologValue('"\\uZZZZ"')).toBe("\\uZZZZ");
    expect(parseAtomList("[]")).toEqual([]);
    expect(parseAtomList("")).toEqual([]);
    expect(parseAtomList("['a','']")).toEqual(["a"]);
    expect(parsePairList("[]")).toEqual([]);
    expect(parsePairList("[[only]]")).toEqual([]);
    expect(parsePairList("[[a,b],[c,d,e]]")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseTriples("[[a,b],[c,d,e]]")).toEqual([["c", "d", "e"]]);
    expect(
      parseViolationRows(
        `violation(rule, id, "desc", "fix", 'src.md'), violation(too,short), other(x)`,
      ),
    ).toEqual([
      {
        rule: "rule",
        entityId: "id",
        description: "desc",
        suggestion: "fix",
        source: "src.md",
      },
    ]);
    expect(parseViolationRows("[]")).toEqual([]);
    expect(parseViolationRows("")).toEqual([]);
  });

  test("firstTwoDefinedParts and fileUriLeaf cover defensive holes", () => {
    restores.push(isolateKibiEnv());
    expect(firstTwoDefinedParts([])).toBeUndefined();
    expect(firstTwoDefinedParts(["only"])).toBeUndefined();
    const sparse: Array<string | undefined> = [];
    sparse[1] = "type";
    expect(firstTwoDefinedParts(sparse)).toBeUndefined();
    expect(firstTwoDefinedParts(["id", "req"])).toEqual(["id", "req"]);
    expect(fileUriLeaf("file:///tmp/app.ts")).toBe("app.ts");
    expect(fileUriLeaf("noslash")).toBe("noslash");
    const hole: Array<string | undefined> = [];
    hole[2] = "props";
    expect(entityFromBindingParts(hole)).toEqual({});
    expect(typedLiteralFromParts(hole, "^^(missing)")).toBe("^^(missing)");
    expect(fallbackWhenPairMissing(undefined, { empty: true })).toEqual({
      empty: true,
    });
    expect(fallbackWhenPairMissing(["id", "req"], "kept")).toBeNull();
  });
});
