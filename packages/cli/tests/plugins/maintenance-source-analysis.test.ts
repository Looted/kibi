// executable_for TEST-source-analysis-v2-contract
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMaintenanceSourceAnalysisService,
  verifyApprovedSourceAnalyzer,
} from "../../src/plugins/maintenance-source-analysis.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function temporary() {
  const root = mkdtempSync(join(tmpdir(), "kibi-source-trust-"));
  roots.push(root);
  return root;
}
function hash(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

describe("maintenance source trust", () => {
  test("unrelated configured capabilities do not import any external code", async () => {
    const root = temporary();
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        kibi: {
          plugins: [
            {
              package: "uninstalled-classifier",
              capabilities: {
                "kibi.semantic-classifier.v1": { mode: "replace" },
              },
            },
          ],
        },
      }),
    );
    const result = await createMaintenanceSourceAnalysisService(
      root,
    ).analyzeTextV2("a.py", "pass");
    expect(result.status).toBe("unsupported");
    expect(result.providerId).toBeNull();
  });
  test("an unapproved name cannot execute a source plugin entrypoint", async () => {
    const root = temporary();
    const packageRoot = join(root, "node_modules", "kibi-plugin-unapproved");
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({
        name: "kibi-plugin-unapproved",
        version: "1.0.0",
        type: "module",
        main: "index.js",
      }),
    );
    writeFileSync(
      join(packageRoot, "index.js"),
      "throw new Error('ENTRYPOINT_EXECUTED');\n",
    );
    const result = await createMaintenanceSourceAnalysisService(root, {
      plugins: [
        {
          package: "kibi-plugin-unapproved",
          capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
        },
      ],
    }).analyzeTextV2("a.py", "pass");
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]?.message).toContain("not approved");
    expect(result.diagnostics[0]?.message).not.toContain("ENTRYPOINT_EXECUTED");
  });
  test("pins package identity and every approved file before execution", () => {
    const root = temporary();
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "qualified", version: "1.0.0" }),
    );
    writeFileSync(join(root, "entry.js"), "export const value = 1;\n");
    const approval = {
      packageName: "qualified",
      version: "1.0.0",
      files: {
        "package.json": hash(join(root, "package.json")),
        "entry.js": hash(join(root, "entry.js")),
      },
      dependencies: [],
    };
    expect(verifyApprovedSourceAnalyzer(root, approval)).toHaveLength(64);
    writeFileSync(join(root, "entry.js"), "export const value = 2;\n");
    expect(() => verifyApprovedSourceAnalyzer(root, approval)).toThrow(
      "integrity mismatch",
    );
    expect(() =>
      verifyApprovedSourceAnalyzer(root, { ...approval, files: {} }),
    ).toThrow("executable closure");
  });
  test("rejects an approved path that resolves outside its package", () => {
    const root = temporary();
    const outside = temporary();
    writeFileSync(join(outside, "entry.js"), "outside");
    symlinkSync(join(outside, "entry.js"), join(root, "entry.js"));
    const approval = {
      packageName: "qualified",
      version: "1.0.0",
      files: { "entry.js": hash(join(outside, "entry.js")) },
      dependencies: [],
    };
    expect(() => verifyApprovedSourceAnalyzer(root, approval)).toThrow(
      "escapes",
    );
  });
});
