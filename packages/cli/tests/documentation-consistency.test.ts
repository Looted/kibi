import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const DOCS_ROOT = path.resolve(import.meta.dir, "../../../documentation");

function findMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function extractFrontmatterId(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\n[\s\S]*?^id:\s*(.+?)\s*$/m);
  return match ? match[1].trim() : null;
}

describe("documentation consistency", () => {
  test("all markdown frontmatter ids match their filename basename", () => {
    const files = findMarkdownFiles(DOCS_ROOT);
    const mismatches: string[] = [];

    for (const file of files) {
      const basename = path.basename(file, ".md");
      const id = extractFrontmatterId(file);
      if (id !== null && id !== basename) {
        mismatches.push(`${file}: id="${id}" but filename="${basename}"`);
      }
    }

    if (mismatches.length > 0) {
      throw new Error(
        `Frontmatter id/filename mismatches found:\n${mismatches.join("\n")}`,
      );
    }
    expect(mismatches).toHaveLength(0);
  });
});

// --- Flag / Fact canonical wording regression tests ---

const ROOT = path.resolve(import.meta.dir, "../../..");
const DOCS = path.resolve(ROOT, "docs");

function readDoc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("flag and fact canonical wording", () => {
  test("docs must not describe 'bug' as an entity type", () => {
    const filesToCheck = [
      "AGENTS.md",
      "docs/entity-schema.md",
      "docs/inference-rules.md",
      "docs/prompts/llm-rules.md",
      "docs/prompts/retroactive-init.md",
      "README.md",
      "docs/mcp-reference.md",
      "docs/cli-reference.md",
    ];
    const pseudoTypePatterns = [
      // Patterns that would suggest 'bug' is an entity type
      /type:\s*bug/i,
      /entity type.*bug/i,
      /bug.*entity type/i,
      /\btype: "bug"/i,
      /\btype:\s*'bug'/i,
    ];
    const violations: string[] = [];
    for (const f of filesToCheck) {
      let content: string;
      try {
        content = readDoc(f);
      } catch {
        continue;
      }
      for (const pat of pseudoTypePatterns) {
        if (pat.test(content)) {
          violations.push(`${f}: matched pattern ${pat}`);
        }
      }
    }
    expect(violations).toHaveLength(0);
  });

  test("README quick start must not mention nonexistent autopilot CLI command", () => {
    const content = readDoc("README.md");
    expect(content).not.toMatch(/npx\s+kibi\s+autopilot\s+generate/);
  });

  test("docs must not describe 'workaround' as an entity type", () => {
    const filesToCheck = [
      "AGENTS.md",
      "docs/entity-schema.md",
      "docs/prompts/llm-rules.md",
      "docs/prompts/retroactive-init.md",
    ];
    const pseudoTypePatterns = [
      /type:\s*workaround/i,
      /entity type.*workaround/i,
      /workaround.*entity type/i,
      /\btype: "workaround"/i,
    ];
    const violations: string[] = [];
    for (const f of filesToCheck) {
      let content: string;
      try {
        content = readDoc(f);
      } catch {
        continue;
      }
      for (const pat of pseudoTypePatterns) {
        if (pat.test(content)) {
          violations.push(`${f}: matched pattern ${pat}`);
        }
      }
    }
    expect(violations).toHaveLength(0);
  });

  test("AGENTS.md must list all eight canonical entity types", () => {
    const content = readDoc("AGENTS.md");
    const requiredTypes = [
      "req",
      "scenario",
      "test",
      "adr",
      "flag",
      "event",
      "symbol",
      "fact",
    ];
    const missing = requiredTypes.filter((t) => !content.includes(`\`${t}\``));
    expect(missing).toHaveLength(0);
  });

  test("docs/entity-schema.md must list all eight canonical entity types", () => {
    const content = readDoc("docs/entity-schema.md");
    const requiredTypes = [
      "req",
      "scenario",
      "test",
      "adr",
      "flag",
      "event",
      "symbol",
      "fact",
    ];
    const missing = requiredTypes.filter((t) => !content.includes(t));
    expect(missing).toHaveLength(0);
  });
});

describe("symbol traceability taxonomy rubric", () => {
  test("entity schema keeps ownership, production coverage, and executable test identity disjoint", () => {
    const content = readDoc("docs/entity-schema.md");

    expect(content).toContain(
      "`implements` is frozen to requirement ownership only (`symbol -> req`).",
    );
    expect(content).toContain(
      "`covered_by` is frozen to production coverage evidence only (`symbol -> test`).",
    );
    expect(content).toContain(
      "`executable_for` is frozen to executable test code identity only (`symbol -> test`).",
    );
    expect(content).toContain("symbol-traceability-taxonomy.md");
  });

  test("symbol taxonomy doc defines the three symbol classes, N/A rules, and anti-blanket checklist", () => {
    const content = readDoc("docs/symbol-traceability-taxonomy.md");

    expect(content).toContain("Production runtime symbols");
    expect(content).toContain("Executable test symbols");
    expect(content).toContain("Metadata / non-executable symbols");
    expect(content).toContain("`implements` = direct requirement ownership");
    expect(content).toContain("`covered_by` = production coverage evidence");
    expect(content).toContain(
      "`executable_for` = executable test code identity",
    );
    expect(content).toContain(
      "Never use `covered_by` as ownership and never use `executable_for` as production coverage.",
    );
    expect(content).toContain(
      "A symbol that uses `executable_for` must not also carry `implements` or `covered_by`.",
    );
    expect(content).toContain("When integration/e2e evidence is required");
    expect(content).toContain(
      "Explicit N/A rationale is allowed only when all of the following are true",
    );
    expect(content).toContain("Anti-blanket requirement checklist");
    expect(content).toContain(
      "If any checkbox fails, split the requirement before adding more symbol links.",
    );
  });
});

// Regression tests for stale symbol aliases
describe("symbols.yaml regression", () => {
  test("SYM-KibiMCPServer must not be present", () => {
    const syms = fs.readFileSync(path.join(DOCS_ROOT, "symbols.yaml"), "utf8");
    expect(syms.includes("SYM-KibiMCPServer")).toBe(false);
  });

  test("title: startServer appears exactly once (canonical SYM-010)", () => {
    const syms = fs.readFileSync(path.join(DOCS_ROOT, "symbols.yaml"), "utf8");
    const matches = syms.match(/^\s*title:\s*startServer$/gm) || [];
    expect(matches.length).toBe(1);
  });
});
