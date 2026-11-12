import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  FINGERPRINT_COMPONENT_NAMES,
  canonicalJson,
  effectiveProofFingerprint,
  environmentHash,
  fingerprintDrift,
  jsonDigest,
  proofContractHash,
  receiptBindingHash,
  stripCosmetic,
} from "../../src/public/proof-fingerprint.js";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("stripCosmetic", () => {
  test("drops every cosmetic key at any depth and sorts keys", () => {
    const cosmetic = {
      description: 1,
      label: 1,
      labels: 1,
      comment: 1,
      comments: 1,
      displayName: 1,
      display_name: 1,
      docs: 1,
      notes: 1,
    };
    const stripped = stripCosmetic({
      z: 1,
      ...cosmetic,
      a: [{ ...cosmetic, keep: "x" }, 2],
      n: null,
    });
    expect(stripped).toStrictEqual({ a: [{ keep: "x" }, 2], n: null, z: 1 });
    expect(Object.keys(stripped as object)).toStrictEqual(["a", "n", "z"]);
    expect(stripCosmetic("ab")).toBe("ab");
    expect(stripCosmetic(null)).toBeNull();
    expect(stripCosmetic([{ label: 1 }])).toStrictEqual([{}]);
  });
});

describe("canonicalJson", () => {
  test("writes sorted keys, nulls for undefined and plain JSON scalars", () => {
    expect(canonicalJson(undefined)).toBe("null");
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson('a"b')).toBe('"a\\"b"');
    expect(canonicalJson([1, undefined, [true]])).toBe("[1,null,[true]]");
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [] }, B: "x" })).toBe(
      '{"a":{"c":[],"d":null},"b":1,"B":"x"}',
    );
    expect(jsonDigest({ b: 1, a: 2 })).toBe(sha('{"a":2,"b":1}'));
  });
});

const contract = { kind: "c", proves: ["x"] } as never;

describe("hashes", () => {
  test("environment, contract and receipt binding", () => {
    expect(environmentHash({ os: "linux", notes: "n" } as never)).toBe(
      sha('{"os":"linux"}'),
    );
    expect(proofContractHash(contract)).toBe(
      sha('{"kind":"c","proves":["x"]}'),
    );
    const contractHash = sha('{"kind":"c","proves":["x"]}');
    const doc = sha("doc");
    expect(receiptBindingHash(contract, "doc")).toBe(
      sha(
        `{"binding":"kibi.receipt-binding.v1","codeScope":[],"contract":"${contractHash}","testDoc":"${doc}"}`,
      ),
    );
    expect(
      receiptBindingHash(contract, "doc", [
        { symbolId: "b", sourceHash: "2", extra: 1 } as never,
        { symbolId: "a", sourceHash: "1" },
      ]),
    ).toBe(
      sha(
        `{"binding":"kibi.receipt-binding.v1","codeScope":[{"sourceHash":"1","symbolId":"a"},{"sourceHash":"2","symbolId":"b"}],"contract":"${contractHash}","testDoc":"${doc}"}`,
      ),
    );
  });
});

describe("effectiveProofFingerprint", () => {
  test("hashes the bare integration and bindings", () => {
    const result = effectiveProofFingerprint({
      contract,
      integration: { id: "i", producer: "p", command: ["run"] },
      bindings: [{ symbol_id: "S", target: "t" } as never],
    });
    const components = {
      contract: sha('{"kind":"c","proves":["x"]}'),
      integration: sha('{"command":["run"],"id":"i","producer":"p"}'),
      command: sha('["run"]'),
      bindings: sha('[{"symbol_id":"S","target":"t"}]'),
      producer: sha('{"producer":"p"}'),
    };
    expect(result).toStrictEqual({
      fingerprint: sha(
        `{"bindings":"${components.bindings}","command":"${components.command}","contract":"${components.contract}","integration":"${components.integration}","producer":"${components.producer}"}`,
      ),
      components,
    });
  });

  test("hashes every optional field and sorts bindings by target then symbol", () => {
    const result = effectiveProofFingerprint({
      contract,
      integration: {
        id: "i",
        producer: "p",
        producer_version: "1",
        command: ["run"],
        artifact: "a.json",
        targets: ["t1"],
        options: { z: 1, label: "x" },
      },
      bindings: [
        { symbol_id: "Z", target: "t1" } as never,
        {
          symbol_id: "B",
          target: "t2",
          native_id: "n",
          aliases: ["al"],
          source_file: "f.ts",
          line: 3,
          extra: 1,
        } as never,

        { symbol_id: "A", target: "t1" } as never,
      ],
    });
    expect(result.components.integration).toBe(
      sha(
        '{"artifact":"a.json","command":["run"],"id":"i","options":{"z":1},"producer":"p","producer_version":"1","targets":["t1"]}',
      ),
    );
    expect(result.components.bindings).toBe(
      sha(
        '[{"symbol_id":"A","target":"t1"},{"symbol_id":"Z","target":"t1"},{"aliases":["al"],"line":3,"native_id":"n","source_file":"f.ts","symbol_id":"B","target":"t2"}]',
      ),
    );
    expect(result.components.producer).toBe(
      sha('{"producer":"p","version":"1"}'),
    );
  });

  test("explicitly undefined optional fields hash like absent ones", () => {
    const bare = effectiveProofFingerprint({
      contract,
      integration: { id: "i", producer: "p", command: ["run"] },
      bindings: [{ symbol_id: "S", target: "t" } as never],
    });
    const undefinedFields = effectiveProofFingerprint({
      contract,
      integration: {
        id: "i",
        producer: "p",
        producer_version: undefined,
        command: ["run"],
        artifact: undefined,
        targets: undefined,
        options: undefined,
      } as never,
      bindings: [
        {
          symbol_id: "S",
          target: "t",
          native_id: undefined,
          aliases: undefined,
          source_file: undefined,
          line: undefined,
        } as never,
      ],
    });
    expect(undefinedFields).toStrictEqual(bare);
  });
});

describe("fingerprintDrift", () => {
  test("names the drifted components in order", () => {
    expect(FINGERPRINT_COMPONENT_NAMES).toStrictEqual([
      "contract",
      "integration",
      "command",
      "bindings",
      "producer",
    ]);
    const base = {
      contract: "a",
      integration: "b",
      command: "c",
      bindings: "d",
      producer: "e",
    };
    expect(fingerprintDrift(base, base)).toStrictEqual([]);
    expect(
      fingerprintDrift(base, {
        contract: "x",
        integration: "b",
        command: "y",
        bindings: "d",
        producer: "z",
      }),
    ).toStrictEqual(["contract", "command", "producer"]);
    expect(
      fingerprintDrift(base, { ...base, integration: "x", bindings: "y" }),
    ).toStrictEqual(["integration", "bindings"]);
  });
});
