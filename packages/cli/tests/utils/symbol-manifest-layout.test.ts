import { describe, expect, test } from "bun:test";
import { parseDocument } from "yaml";
import { blockifySymbolManifest } from "../../src/utils/symbol-manifest-layout.js";

describe("blockifySymbolManifest", () => {
  test("rewrites a flow symbols sequence and nested collections as block YAML", () => {
    const doc = parseDocument(
      "other: [1, 2]\nsymbols: [{ id: A, links: [REQ-1, REQ-2] }]\n",
    );
    expect(blockifySymbolManifest(doc)).toBe(true);
    expect(doc.toString()).toBe(
      "other: [ 1, 2 ]\nsymbols:\n  - id: A\n    links:\n      - REQ-1\n      - REQ-2\n",
    );
  });

  test("leaves a block symbols sequence untouched", () => {
    const source = "symbols:\n  - id: A\n    links: [ REQ-1 ]\n";
    const doc = parseDocument(source);
    expect(blockifySymbolManifest(doc)).toBe(false);
    expect(doc.toString()).toBe(source);
  });

  test("ignores a manifest whose symbols key is not a sequence", () => {
    const flowMap = parseDocument("symbols: { a: [1] }\n");
    expect(blockifySymbolManifest(flowMap)).toBe(false);
    expect(flowMap.toString()).toBe("symbols: { a: [ 1 ] }\n");
    expect(blockifySymbolManifest(parseDocument("other: 1\n"))).toBe(false);
  });
});
