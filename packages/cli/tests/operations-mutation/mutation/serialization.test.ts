import { describe, expect, test } from "bun:test";
import {
  buildPropertyList,
  buildRelationshipMetadata,
  parsePrologList,
} from "../../../src/operations/mutation/serialization.js";

describe("buildPropertyList", () => {
  test("quotes ids as atoms and skips type and empty values", () => {
    expect(
      buildPropertyList({ type: "req", id: "REQ-'1", a: undefined, b: null }),
    ).toBe("[id='REQ-''1']");
    expect(buildPropertyList({})).toBe("[]");
    expect(buildPropertyList({ id: 7 })).toBe("[id=7]");
  });

  test("writes every atom field as an atom", () => {
    const fields = [
      "status",
      "owner",
      "priority",
      "severity",
      "symbol_role",
      "granularity_reason",
      "verification_scope",
      "verification_perspective",
      "fact_kind",
      "operator",
      "value_type",
      "polarity",
      "expects",
      "firmness",
      "required_evidence",
    ];
    for (const field of fields) {
      expect(buildPropertyList({ [field]: "open" })).toBe(`[${field}=open]`);
      expect(buildPropertyList({ [field]: "Two words" })).toBe(
        `[${field}='Two words']`,
      );
    }
    expect(buildPropertyList({ title: "open", source: "s" })).toBe(
      '[title="open", source="s"]',
    );
  });

  test("writes structured fields as JSON strings", () => {
    for (const field of [
      "rule_ir",
      "argument_constants",
      "argument_aliases",
      "semantic_inventory",
      "proof_contract",
      "proof_bindings",
      "proof_receipts",
      "origin",
    ]) {
      expect(buildPropertyList({ [field]: { k: ["v"] } })).toBe(
        `[${field}="{\\"k\\":[\\"v\\"]}"]`,
      );
    }
  });

  test("writes lists, numbers, booleans and other values", () => {
    expect(
      buildPropertyList({
        tags: ["a", "b"],
        n: 1.5,
        yes: true,
        no: false,
        when: new Date(0),
        text: 'say "hi"\n',
      }),
    ).toBe(
      `[tags=["a","b"], n=1.5, yes=true, no=false, when="${String(new Date(0))}", text="say \\"hi\\"\\n"]`,
    );
  });
});

describe("buildRelationshipMetadata", () => {
  test("keeps metadata only, numbers bare and the rest as strings", () => {
    expect(
      buildRelationshipMetadata({
        type: "implements",
        from: "A",
        to: "B",
        confidence: 0.5,
        note: 'a "b"',
        flag: true,
      } as never),
    ).toBe('[confidence=0.5, note="a \\"b\\"", flag="true"]');
    expect(
      buildRelationshipMetadata({ type: "implements", from: "A", to: "B" }),
    ).toBe("[]");
  });
});

describe("parsePrologList", () => {
  test("splits top-level items and strips one pair of quotes", () => {
    expect(parsePrologList(" ['a', b, [c, d], 'e,f'] ")).toStrictEqual([
      "a",
      "b",
      "[c, d]",
      "e",
      "f",
    ]);
    expect(parsePrologList("[ x ,  'y' ]")).toStrictEqual(["x", "y"]);
    // Only the edge quotes go, before a comma and at the end alike.
    expect(parsePrologList("['it's', 'o'k']")).toStrictEqual(["it's", "o'k"]);
    expect(parsePrologList("[[a,[b,c]],d]")).toStrictEqual(["[a,[b,c]]", "d"]);
  });

  test("reads multi-line lists and drops a trailing empty item", () => {
    expect(parsePrologList("[a,\nb, ]")).toStrictEqual(["a", "b"]);
    expect(parsePrologList("[a,\n]")).toStrictEqual(["a"]);
  });

  test("returns nothing for empty or non-list text", () => {
    expect(parsePrologList("[]")).toStrictEqual([]);
    expect(parsePrologList("a, b")).toStrictEqual([]);
    expect(parsePrologList("x[a]")).toStrictEqual([]);
    expect(parsePrologList("[a]x")).toStrictEqual([]);
    expect(parsePrologList("[ ]")).toStrictEqual([]);
  });
});
