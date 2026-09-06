import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  branchStoreReason,
  inspectBranchStore,
} from "../../src/utils/branch-store.js";
import {
  branchStorePath,
  expectedBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";

function tempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "kibi-branch-store-cov-"));
}

describe("inspectBranchStore remaining states", () => {
  test("classifies missing, legacy, incomplete, and unreadable stores", () => {
    const root = tempRoot();
    try {
      const missing = inspectBranchStore(root, "main");
      expect(missing.state).toBe("missing");
      expect(branchStoreReason(missing)?.code).toBe("branch_store_missing");

      const legacy = path.join(root, ".kb", "branches", "main");
      mkdirSync(legacy, { recursive: true });
      writeFileSync(path.join(legacy, "kb.rdf"), "legacy\n");
      const legacyInspect = inspectBranchStore(root, "main");
      expect(legacyInspect.state).toBe("incomplete");
      expect(legacyInspect.errorCode).toBe("legacy_branch_store");
      expect(branchStoreReason(legacyInspect)?.remediation).toMatchObject({
        applyRequired: true,
      });

      const hashed = branchStorePath(root, "main");
      mkdirSync(hashed, { recursive: true });
      writeFileSync(path.join(hashed, "not-a-store"), "x\n");
      const emptyHashed = inspectBranchStore(root, "main");
      expect(emptyHashed.state).toBe("unreadable");

      writeFileSync(
        path.join(hashed, "branch.json"),
        `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
      );
      writeFileSync(path.join(hashed, "storage.json"), "{}\n");
      const missingRdf = inspectBranchStore(root, "main");
      expect(missingRdf.errorCode).toBe("branch_store_missing_rdf");

      mkdirSync(path.join(hashed, "rdf"), { recursive: true });
      const missingCurrent = inspectBranchStore(root, "main");
      expect(missingCurrent.errorCode).toBe("sync_metadata_missing");

      writeFileSync(path.join(hashed, "CURRENT"), "not-a-generation\n");
      const badCurrent = inspectBranchStore(root, "main");
      expect(badCurrent.errorCode).toBe("branch_store_invalid_current");

      writeFileSync(path.join(hashed, "CURRENT"), "generation-abc:1\n");
      const healthy = inspectBranchStore(root, "main");
      expect(healthy.state).toBe("healthy");
      expect(branchStoreReason(healthy)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("accepts valid legacy RDF and rejects a file used as the store path", () => {
    const root = tempRoot();
    try {
      const hashed = branchStorePath(root, "develop");
      mkdirSync(path.dirname(hashed), { recursive: true });
      writeFileSync(hashed, "file-not-dir\n");
      const notDir = inspectBranchStore(root, "develop");
      expect(notDir.errorCode).toBe("branch_store_not_directory");

      rmSync(hashed, { force: true });
      mkdirSync(hashed, { recursive: true });
      writeFileSync(
        path.join(hashed, "branch.json"),
        `${JSON.stringify(expectedBranchStoreManifest("develop"), null, 2)}\n`,
      );
      writeFileSync(path.join(hashed, "kb.rdf"), "<not-rdf>\n");
      const invalidLegacy = inspectBranchStore(root, "develop");
      expect(invalidLegacy.errorCode).toBe("branch_store_invalid_legacy_rdf");

      writeFileSync(
        path.join(hashed, "kb.rdf"),
        '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>\n',
      );
      expect(inspectBranchStore(root, "develop").state).toBe("healthy");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
