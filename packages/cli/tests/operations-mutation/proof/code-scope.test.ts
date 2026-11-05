import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  contractCodeSymbolIds,
  contractSources,
  currentReceiptBindingHashes,
  loadCoveredBySymbolsByTest,
  receiptBindingContract,
  receiptCodeScopeSymbolIds,
} from "../../../src/operations/proof/code-scope.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";

describe("receipt code scope", () => {
  test("joins required proofs, declared bindings and covered_by symbols, sorted once", () => {
    expect(
      receiptCodeScopeSymbolIds(
        { required_proofs: [{ symbol_id: "SYM-c" }, { symbol_id: "SYM-a" }, null, 3, { symbol_id: 4 }, { symbol_id: "" }, {}] },
        [{ symbol_id: "SYM-b" }, { symbol_id: "SYM-a" }, "SYM-z", null],
        ["SYM-d", "SYM-b"],
      ),
    ).toEqual(["SYM-a", "SYM-b", "SYM-c", "SYM-d"]);
  });

  test("reads nothing from a contract or bindings of the wrong shape", () => {
    for (const contract of [null, undefined, "x", 3, [], {}, { required_proofs: "SYM-a" }, { required_proofs: { symbol_id: "SYM-a" } }])
      expect(receiptCodeScopeSymbolIds(contract, { symbol_id: "SYM-b" }, [])).toEqual([]);
    expect(receiptCodeScopeSymbolIds(null, null, ["SYM-x"])).toEqual(["SYM-x"]);
  });
});

describe("covered_by symbols by test", () => {
  const port = (answer: unknown, goals: string[] = []) => ({
    query: async (goal: string) => {
      goals.push(goal);
      return answer as never;
    },
  });

  test("group each symbol under the test it is covered by", async () => {
    const goals: string[] = [];
    const map = await loadCoveredBySymbolsByTest(
      port(
        {
          success: true,
          bindings: {
            Rels: "[['file:///w/SYM-a','TEST-1',covered_by],[sym_b,'TEST-1',covered_by],['SYM-c','file:///w/TEST-2',covered_by]]",
          },
        },
        goals,
      ),
    );
    expect([...map.entries()]).toEqual([
      ["TEST-1", ["SYM-a", "sym_b"]],
      ["TEST-2", ["SYM-c"]],
    ]);
    expect(goals).toEqual(["findall([From,To,'covered_by'], kb_relationship(covered_by, From, To), Rels)"]);
  });

  test("read no relationships from an answer without them", async () => {
    expect((await loadCoveredBySymbolsByTest(port({ success: true, bindings: {} }))).size).toBe(0);
  });

  test("throw the store's error, or name an unknown one", async () => {
    await expect(loadCoveredBySymbolsByTest(port({ success: false, bindings: {}, error: "busy" }))).rejects.toThrow(
      "covered_by relationship query failed: busy",
    );
    await expect(loadCoveredBySymbolsByTest(port({ success: false, bindings: {} }))).rejects.toThrow(
      "covered_by relationship query failed: Unknown error",
    );
  });
});

describe("receipt binding contract", () => {
  test("refuse anything but an object", () => {
    for (const raw of [null, undefined, "x", 3, [], [{ version: 1 }]]) expect(receiptBindingContract(raw)).toBeNull();
  });

  test("project only the fields a binding hashes", () => {
    expect(
      receiptBindingContract({
        version: 2,
        integration: "bun",
        required_proofs: [{ symbol_id: "SYM-a", target: "t", extra: 1 }, { symbol_id: 3 }, null, "x"],
        success_policy: "all",
        cosmetic: "dropped",
        kind: "exhaustive",
      }) as unknown,
    ).toStrictEqual({
      version: 2,
      integration: "bun",
      required_proofs: [
        { symbol_id: "SYM-a", target: "t" },
        { symbol_id: "3", target: "" },
        { symbol_id: "", target: "" },
        { symbol_id: "", target: "" },
      ],
      success_policy: "all",
      kind: "exhaustive",
    });
  });

  test("default a missing integration and required proofs", () => {
    expect(receiptBindingContract({ required_proofs: "SYM-a" }) as unknown).toStrictEqual({
      version: undefined,
      integration: "",
      required_proofs: [],
      success_policy: undefined,
    });
  });
});

const contract = (fields: Record<string, unknown>) => fields as unknown as ProofContract;

describe("contract code symbols", () => {
  test("list every symbol a certificate loads, sorted once", () => {
    expect(
      contractCodeSymbolIds(
        contract({
          domain_source: { symbol_id: "SYM-e" },
          initial_source: { symbol_id: "SYM-d" },
          pattern_source: { symbol_id: "SYM-c" },
          value_source: [{ symbol_id: "SYM-b" }, { source: { reader: "x" } }, { symbol_id: "" }],
          domains: { a: { symbol_id: "SYM-a" }, b: { symbol_id: 7 } },
          predicate_source: { p: { symbol_id: "SYM-f" }, q: { symbol_id: "SYM-g" } },
        }),
      ),
    ).toEqual(["SYM-a", "SYM-b", "SYM-c", "SYM-d", "SYM-e", "SYM-f", "SYM-g"]);
  });

  test("list none for a contract without symbols", () => {
    expect(contractCodeSymbolIds(contract({}))).toEqual([]);
    expect(contractCodeSymbolIds(contract({ domain_source: null, value_source: [null, "x"] }))).toEqual([]);
  });
});

describe("contract sources", () => {
  test("list the contract's source, then value and domain sources", () => {
    const own = { reader: "json", file: "a.json" };
    const value = { reader: "yaml", file: "b.yaml" };
    const domain = { reader: "csv", file: "c.csv" };
    expect(
      contractSources(
        contract({
          source: own,
          value_source: [{ symbol_id: "SYM-a" }, { source: value }],
          domains: { a: { symbol_id: "SYM-b" }, b: { source: domain } },
        }),
      ) as unknown,
    ).toEqual([own, value, domain]);
    expect(contractSources(contract({}))).toEqual([]);
  });
});

describe("current receipt binding hashes", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const base = {
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-flow", target: "default" }],
    success_policy: "all_required_first_attempt",
  };

  /** A checkout with one symbol, a data file and a test document. */
  function checkout(files: Readonly<Record<string, string>> = {}): string {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-code-scope-"));
    roots.push(root);
    const all = {
      ".kb/symbols.yaml":
        "symbols:\n  - id: SYM-flow\n    title: flow\n    sourceFile: src/flow.ts\n  - id: SYM-other\n    title: other\n    sourceFile: src/other.ts\n",
      "src/flow.ts": "export const flow = 1;\n",
      "src/other.ts": "export const other = 1;\n",
      "data.json": '{"a":1}\n',
      ".kb/tests/TEST-flow.md": "---\nid: TEST-flow\n---\nBody\n",
      ...files,
    };
    for (const [relative, body] of Object.entries(all)) {
      mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      writeFileSync(path.join(root, relative), body);
    }
    return root;
  }

  const hashes = (root: string, test: Record<string, unknown> = {}, coveredBySymbols: string[] = []) =>
    currentReceiptBindingHashes({
      workspaceRoot: root,
      readFile: async (absolute) => readFileSync(absolute, "utf8"),
      test: { source: ".kb/tests/TEST-flow.md", proof_contract: base, ...test },
      coveredBySymbols,
    });

  test("bind only a contract on a markdown document inside the repository", async () => {
    const root = checkout({ "notes.md.txt": "x\n", ".kb/tests/TEST-flow.MDX": "---\nid: TEST-flow\n---\n" });
    expect(await hashes(root)).toHaveLength(1);
    expect(await hashes(root, { source: ".kb/tests/TEST-flow.MDX" })).toHaveLength(1);
    for (const test of [
      { proof_contract: null },
      { source: 5 },
      { source: undefined },
      { source: [".kb/tests/TEST-flow.md"] },
      { source: "notes.md.txt" },
      { source: "../outside.md" },
      { source: ".kb/tests/missing.md" },
    ])
      expect(await hashes(root, test)).toBeUndefined();
  });

  test("keep the hash written before links left the binding", async () => {
    const plain = await hashes(checkout());
    const linked = await hashes(checkout({ ".kb/tests/TEST-flow.md": "---\nid: TEST-flow\nlinks:\n  - REQ-1\n---\nBody\n" }));
    expect(linked).toHaveLength(2);
    // The current hash leaves the links out, so it matches the unlinked document's.
    expect(linked?.[0]).toBe(plain?.[0]);
    expect(linked?.[1]).not.toBe(plain?.[0]);
    // Receipts never enter either hash.
    expect(await hashes(checkout({ ".kb/tests/TEST-flow.md": "---\nid: TEST-flow\nproof_receipts:\n  - receipt_id: R\n---\nBody\n" }))).toEqual(
      plain,
    );
  });

  test("change when a bound symbol's file or a source the contract reads changes", async () => {
    const scoped = async (files: Record<string, string>, test: Record<string, unknown>, covered: string[] = []) =>
      (await hashes(checkout(files), test, covered))?.[0];
    const edited = { "src/other.ts": "export const other = 2;\n" };
    const cases: [Record<string, unknown>, string[]][] = [
      [{ proof_bindings: [{ symbol_id: "SYM-other" }] }, []],
      [{}, ["SYM-other"]],
      [{ proof_contract: { ...base, kind: "exhaustive", domain_source: { symbol_id: "SYM-other" } } }, []],
    ];
    for (const [test, covered] of cases)
      expect(await scoped(edited, test, covered)).not.toBe(await scoped({}, test, covered));
    expect(await scoped(edited, {})).toBe(await scoped({}, {}));
    const reading = { proof_contract: { ...base, kind: "value", source: { reader: "json", file: "data.json", path: "$.a" } } };
    expect(await scoped({ "data.json": '{"a":2}\n' }, reading)).not.toBe(await scoped({}, reading));
  });
});
