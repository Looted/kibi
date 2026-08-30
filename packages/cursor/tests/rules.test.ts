import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workflowRule = fs.readFileSync(
  path.join(packageRoot, "rules", "kibi-workflow.mdc"),
  "utf8",
);

describe("kibi-workflow always-on rule", () => {
  test("always applies in Cursor sessions", () => {
    expect(workflowRule).toContain("alwaysApply: true");
  });

  test("includes the exact non-installing CLI recipe", () => {
    expect(workflowRule).toContain("npx --no-install kibi search --input -");
    expect(workflowRule).toContain("printf '%s\\n'");
    expect(workflowRule).toContain("bunx --no-install kibi");
  });

  test("prefers MCP when Kibi tools are visible", () => {
    expect(workflowRule).toContain(
      "If any `kb_*` or `kibi_kb_*` tool is in the tool list, use MCP only",
    );
  });

  test("missing MCP tools does not mean Kibi is unavailable", () => {
    expect(workflowRule).toContain(
      "Missing MCP tools does not mean Kibi is unavailable",
    );
  });

  test("untrusted or no-shell paths stop without probing the CLI", () => {
    expect(workflowRule).toContain("stop and tell the operator");
    expect(workflowRule).toContain("Do not probe the CLI");
  });

  test("forbids globals, installing runners, and direct .kb access", () => {
    expect(workflowRule).toContain(
      "Never use a global fallback, an installing runner",
    );
    expect(workflowRule).toContain("npx --no-install kibi");
    expect(workflowRule).toContain("Do not read or edit `.kb/` files directly");
  });

  test("maps MCP names to CLI routes", () => {
    expect(workflowRule).toContain("kb_search` → `search");
    expect(workflowRule).toContain("kb_find_gaps` → `find-gaps");
  });
});
