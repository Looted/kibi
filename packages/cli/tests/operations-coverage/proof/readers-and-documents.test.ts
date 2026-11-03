import { afterEach, describe, expect, test } from "bun:test";
import ts from "typescript";
import { currentReceiptBindingHashes } from "../../../src/operations/proof/code-scope.js";
import { executeMigrateLegacyReceipts } from "../../../src/operations/proof/migrate-legacy-receipts.js";
import { patchReceiptsIntoDocument } from "../../../src/operations/proof/receipt-document.js";
import {
  UnsupportedPattern,
  languageAccepts,
} from "../../../src/operations/proof/regular-language.js";
import { extractScriptReferences } from "../../../src/operations/proof/source-code-readers.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";
import { context, scratch } from "../helpers.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const contract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-1", target: "default" }],
  success_policy: "all_required_first_attempt",
};

describe("environment references in scripts", () => {
  const env = (code: string) =>
    extractScriptReferences(ts, "src/file.ts", code, {
      reader: "references",
      extract: "env",
    } as unknown as SourceSpec);

  test("reads Deno.env.get with a literal name and reports a computed one", () => {
    const result = env('Deno.env.get("API_KEY");\nDeno.env.get(name);\n');
    expect(result.members).toStrictEqual(["API_KEY"]);
    expect(result.unresolved).toHaveLength(1);
  });

  test("reports import.meta handed on", () => {
    expect(env("send(import.meta);\n").unresolved).toHaveLength(1);
  });
});

describe("regular languages", () => {
  const pattern = (source: string, flavor: "js" | "python", flags = "") => ({
    type: "pattern" as const,
    source,
    flags,
    flavor,
    mode: "full" as const,
  });

  test("refuses Unicode digit classes in Python str patterns", () => {
    expect(() => languageAccepts(pattern("\\d", "python"), "1")).toThrow(
      UnsupportedPattern,
    );
    expect(languageAccepts(pattern("\\d", "python", "a"), "1")).toBe(true);
  });

  test("reads the whitespace class", () => {
    expect(languageAccepts(pattern("\\s", "js"), " ")).toBe(true);
    expect(languageAccepts(pattern("\\S", "js"), " ")).toBe(false);
  });
});

describe("receipt documents and bindings", () => {
  test("replaces only the receipts block when a key follows it", () => {
    const patched = patchReceiptsIntoDocument(
      "---\nid: TEST-1\nproof_receipts:\n  - receipt_id: OLD\ntitle: T\n---\nBody.\n",
      [{ receipt_id: "NEW" }],
    );
    expect(patched).toBe(
      "---\nid: TEST-1\nproof_receipts:\n  - receipt_id: NEW\ntitle: T\n---\nBody.\n",
    );
  });

  test("binds the project sources a contract reads", async () => {
    const workspace = scratch({
      "docs/TEST-1.md": "---\nid: TEST-1\n---\nBody.\n",
      "data.json": "{}\n",
    });
    cleanups.push(workspace.cleanup);
    const hashes = await currentReceiptBindingHashes({
      workspaceRoot: workspace.root,
      readFile: (file) => nodeFilesystem.readFile(file),
      test: {
        source: "docs/TEST-1.md",
        proof_contract: { ...contract, source: { reader: "json", file: "data.json" } },
      },
      coveredBySymbols: [],
    });
    const without = await currentReceiptBindingHashes({
      workspaceRoot: workspace.root,
      readFile: (file) => nodeFilesystem.readFile(file),
      test: { source: "docs/TEST-1.md", proof_contract: contract },
      coveredBySymbols: [],
    });
    expect(hashes).toHaveLength(1);
    expect(hashes?.[0]).not.toBe(without?.[0]);
  });

  test("skips a test whose source is not a markdown document", async () => {
    const workspace = scratch();
    cleanups.push(workspace.cleanup);
    const result = await executeMigrateLegacyReceipts(
      { testId: "TEST-1" },
      {
        ...context(workspace.root, [
          {
            id: "TEST-1",
            type: "test",
            source: "tests/flow.spec.ts",
            proof_contract: JSON.stringify(contract),
          },
        ]),
        fs: nodeFilesystem,
      } as OperationContext,
    );
    expect(result.structuredContent.tests).toStrictEqual([]);
  });
});
