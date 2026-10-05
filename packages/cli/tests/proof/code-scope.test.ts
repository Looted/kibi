import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  currentReceiptBindingHash,
  loadCoveredBySymbolsByTest,
  receiptCodeScopeSymbolIds,
} from "../../src/operations/proof/code-scope.js";

// Receipt ingest and coverage must derive the same receipt code scope: the
// test's own contracted code plus the production code linked covered_by it.

describe("receiptCodeScopeSymbolIds", () => {
  test("unions required proofs, declared bindings, and covered production symbols", () => {
    expect(
      receiptCodeScopeSymbolIds(
        {
          required_proofs: [
            { symbol_id: "SYM-TEST-CODE", target: "default" },
            { symbol_id: "SYM-SHARED", target: "default" },
          ],
        },
        [{ symbol_id: "SYM-BOUND" }, { symbol_id: "SYM-SHARED" }],
        ["SYM-PROD-B", "SYM-PROD-A", "SYM-BOUND"],
      ),
    ).toEqual([
      "SYM-BOUND",
      "SYM-PROD-A",
      "SYM-PROD-B",
      "SYM-SHARED",
      "SYM-TEST-CODE",
    ]);
  });

  test("ignores malformed contract and binding entries", () => {
    expect(
      receiptCodeScopeSymbolIds(
        { required_proofs: [{ target: "default" }, null, { symbol_id: "" }] },
        "not-a-list",
        [],
      ),
    ).toEqual([]);
    expect(receiptCodeScopeSymbolIds(undefined, undefined, ["SYM-P"])).toEqual([
      "SYM-P",
    ]);
  });
});

describe("loadCoveredBySymbolsByTest", () => {
  test("groups covered_by symbols by test with normalized ids", async () => {
    const goals: string[] = [];
    const byTest = await loadCoveredBySymbolsByTest({
      query: async (goal: string) => {
        goals.push(goal);
        return {
          success: true,
          bindings: {
            Rels: "[['kb:entity/SYM-A','kb:entity/TEST-1',covered_by],['kb:entity/SYM-B','kb:entity/TEST-1',covered_by],['kb:entity/SYM-A','kb:entity/TEST-2',covered_by]]",
          },
        };
      },
    });
    expect(goals).toHaveLength(1);
    expect(byTest.get("TEST-1")).toEqual(["SYM-A", "SYM-B"]);
    expect(byTest.get("TEST-2")).toEqual(["SYM-A"]);
    expect(byTest.get("TEST-3")).toBeUndefined();
  });

  test("propagates engine failures instead of treating them as no coverage", async () => {
    await expect(
      loadCoveredBySymbolsByTest({
        query: async () => ({
          success: false,
          bindings: {},
          error: "Query exceeded bounded Prolog output capacity (ENOBUFS)",
        }),
      }),
    ).rejects.toThrow(/covered_by relationship query failed: .*ENOBUFS/);
  });
});

describe("currentReceiptBindingHash", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  const contract = {
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-flow", target: "default" }],
    success_policy: "all_required_first_attempt",
  };

  function checkout(
    prefix: string,
    options: { sourceFile: string; receipts: string; code?: string },
  ): string {
    const root = mkdtempSync(path.join(tmpdir(), prefix));
    roots.push(root);
    mkdirSync(path.join(root, ".kb", "tests"), { recursive: true });
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "flow.ts"),
      options.code ?? "export const flow = 1;\n",
    );
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      `symbols:\n  - id: SYM-flow\n    title: flow\n    sourceFile: '${options.sourceFile.replaceAll("<root>", root)}'\n`,
    );
    writeFileSync(
      path.join(root, ".kb", "tests", "TEST-flow.md"),
      `---\nid: TEST-flow\ntitle: Flow\nproof_receipts:\n${options.receipts}---\nBody\n`,
    );
    return root;
  }

  const binding = (root: string, source: string) =>
    currentReceiptBindingHash({
      workspaceRoot: root,
      readFile: (absolute) => readFile(absolute, "utf8"),
      test: {
        id: "TEST-flow",
        source: source.replaceAll("<root>", root),
        proof_contract: contract,
      },
      coveredBySymbols: [],
    });

  test("binds the same commit identically in a CI runner and a local checkout", async () => {
    const ci = checkout("kibi-binding-ci-", {
      sourceFile: "src/flow.ts",
      receipts: "  - receipt_id: PR-CI\n",
    });
    const local = checkout("kibi-binding-local-elsewhere-", {
      sourceFile: "<root>/src/flow.ts",
      receipts: "  - receipt_id: PR-LOCAL-1\n  - receipt_id: PR-LOCAL-2\n",
    });

    const ciBinding = await binding(ci, ".kb/tests/TEST-flow.md");
    expect(ciBinding).toMatch(/^[a-f0-9]{64}$/);
    expect(await binding(local, "./.kb/tests/TEST-flow.md")).toBe(ciBinding);
    expect(await binding(local, "<root>/.kb/tests/TEST-flow.md")).toBe(
      ciBinding,
    );
    expect(await binding(local, ".kb\\tests\\TEST-flow.md")).toBe(ciBinding);
  });

  test("follows scoped code content and refuses documents outside the repository", async () => {
    const before = checkout("kibi-binding-before-", {
      sourceFile: "src/flow.ts",
      receipts: "  - receipt_id: PR-ONE\n",
    });
    const edited = checkout("kibi-binding-edited-", {
      sourceFile: "src/flow.ts",
      receipts: "  - receipt_id: PR-ONE\n",
      code: "export const flow = 2;\n",
    });

    expect(await binding(edited, ".kb/tests/TEST-flow.md")).not.toBe(
      await binding(before, ".kb/tests/TEST-flow.md"),
    );
    expect(
      await binding(before, "../elsewhere/.kb/tests/TEST-flow.md"),
    ).toBeUndefined();
    expect(await binding(before, "src/flow.ts")).toBeUndefined();
  });
});
