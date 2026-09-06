import { describe, expect, test } from "bun:test";
import * as branchResolver from "../../src/public/branch-resolver.js";
import * as manifest from "../../src/public/extractors/manifest.js";
import * as markdown from "../../src/public/extractors/markdown.js";
import * as prolog from "../../src/public/prolog/index.js";
import type { ProofReceiptOutcome } from "../../src/proof/receipt-outcome.js";
import * as receiptOutcome from "../../src/proof/receipt-outcome.js";

describe("public re-export barrels", () => {
  test("manifest barrel re-exports extractor functions", () => {
    expect(typeof manifest.extractFromManifest).toBe("function");
    expect(typeof manifest.extractFromManifestString).toBe("function");
    expect(typeof manifest.readManifestWithCoordinateOverlay).toBe("function");
  });

  test("markdown barrel re-exports extractor functions", () => {
    expect(typeof markdown.extractFromMarkdown).toBe("function");
    expect(typeof markdown.extractFromMarkdownString).toBe("function");
    expect(typeof markdown.inferTypeFromPath).toBe("function");
  });

  test("prolog barrel re-exports process helpers", () => {
    expect(typeof prolog.PrologProcess).toBe("function");
    expect(typeof prolog.resolveKbPlPath).toBe("function");
  });

  test("branch-resolver barrel re-exports resolver and store helpers", () => {
    expect(typeof branchResolver.resolveBranchAttachment).toBe("function");
    expect(typeof branchResolver.resolveActiveBranch).toBe("function");
    expect(typeof branchResolver.isValidBranchName).toBe("function");
    expect(typeof branchResolver.branchStorePath).toBe("function");
    expect(typeof branchResolver.ensureBranchStoreManifest).toBe("function");
    expect(typeof branchResolver.readBranchStoreManifest).toBe("function");
  });

  test("receipt-outcome module is importable as a type catalog", () => {
    const outcomes: readonly ProofReceiptOutcome[] = [
      "passed",
      "failed",
      "errored",
      "cancelled",
      "timed_out",
      "interrupted",
    ];
    expect(outcomes).toHaveLength(6);
    expect(receiptOutcome).toBeDefined();
  });
});
