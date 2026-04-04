import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import { type PathKind, analyzePath } from "../src/path-kind";

// implements REQ-opencode-kibi-plugin-v1

describe("path-kind analyzePath", () => {
  const cwd = "/home/project";

  it("classifies code files (.ts, .tsx, .js, .jsx, .py)", () => {
    const cases: Array<{ path: string; expected: PathKind }> = [
      { path: "src/app/main.ts", expected: "code" },
      { path: "src/components/Button.tsx", expected: "code" },
      { path: "lib/utils.js", expected: "code" },
      { path: "pages/index.jsx", expected: "code" },
      { path: "src/models.py", expected: "code" },
      { path: "utils/helpers.py", expected: "code" },
    ];

    for (const tc of cases) {
      const result = analyzePath(tc.path, cwd);
      assert.equal(
        result.kind,
        tc.expected,
        `Expected ${tc.path} to be ${tc.expected}`,
      );
      assert.equal(result.isUnderKb, false);
    }
  });

  it("classifies requirement files", () => {
    const result = analyzePath("documentation/requirements/REQ-001.md", cwd);
    assert.equal(result.kind, "requirement");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies scenario files", () => {
    const result = analyzePath("documentation/scenarios/SCEN-001.md", cwd);
    assert.equal(result.kind, "scenario");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies test files", () => {
    const result = analyzePath("documentation/tests/TEST-001.md", cwd);
    assert.equal(result.kind, "test");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies code-adjacent test patterns as test", () => {
    for (const testPath of [
      "src/foo.test.ts",
      "src/bar.spec.tsx",
      "tests/unit/auth.test.js",
      "src/__tests__/login.py",
    ]) {
      const result = analyzePath(testPath, cwd);
      assert.equal(result.kind, "test", `Expected ${testPath} to be test`);
    }
  });

  it("classifies ADR files", () => {
    const result = analyzePath("documentation/adr/ADR-001.md", cwd);
    assert.equal(result.kind, "adr");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies fact files", () => {
    const result = analyzePath("documentation/facts/FACT-001.md", cwd);
    assert.equal(result.kind, "fact");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies event files as fact", () => {
    const result = analyzePath("documentation/events/EVT-001.md", cwd);
    assert.equal(result.kind, "event");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies flag files as flag", () => {
    const result = analyzePath("documentation/flags/FLAG-001.md", cwd);
    assert.equal(result.kind, "flag");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("classifies symbols manifest as symbol", () => {
    const result = analyzePath("documentation/symbols.yaml", cwd);
    assert.equal(result.kind, "symbol");
    assert.equal(result.isKibiDocRelevant, true);
  });

  it("detects files under .kb/**", () => {
    const result = analyzePath(".kb/config.json", cwd);
    assert.equal(result.kind, "kb");
    assert.equal(result.isUnderKb, true);
    assert.equal(result.isKibiDocRelevant, false);
  });

  it("detects relationship shards under .kb/**", () => {
    const result = analyzePath(".kb/relationships/abc123.yml", cwd);
    assert.equal(result.kind, "kb");
    assert.equal(result.isUnderKb, true);
  });

  it("handles absolute paths", () => {
    const result = analyzePath(
      "/home/project/documentation/requirements/REQ-001.md",
      cwd,
    );
    assert.equal(result.kind, "requirement");
  });

  it("returns unknown for unrelated files", () => {
    const result = analyzePath("README.md", cwd);
    assert.equal(result.kind, "unknown");
    assert.equal(result.isKibiDocRelevant, false);
  });

  it("returns unknown for config files", () => {
    const result = analyzePath("package.json", cwd);
    assert.equal(result.kind, "unknown");
  });
});
