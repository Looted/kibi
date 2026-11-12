import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const packagesRoot = path.resolve(import.meta.dir, "../..");
const HOSTS = ["claude", "codex", "cursor", "zcode"] as const;

/** Every TypeScript source file of a host package, as one text. */
function hostSource(host: string): string {
  const srcRoot = path.join(packagesRoot, host, "src");
  return fs
    .readdirSync(srcRoot, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(srcRoot, file), "utf8"))
    .join("\n");
}

/** The names a source imports from one kibi-agent-core module. */
function sharedImports(source: string, module: string): string[] {
  const pattern = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*"kibi-agent-core/${module}"`,
    "g",
  );
  return [...source.matchAll(pattern)].flatMap((match) =>
    (match[1] as string)
      .split(",")
      .map((name) => name.trim().split(/\s+as\s+/)[0] as string)
      .filter((name) => name.length > 0),
  );
}

/** Local function declarations whose body is not a call to a shared alias. */
function ownDeclarations(source: string, name: string): string[] {
  const pattern = new RegExp(
    `function ${name}\\([^)]*\\)[^{]*\\{([^}]*)\\}`,
    "g",
  );
  return [...source.matchAll(pattern)]
    .map((match) => (match[1] as string).trim())
    .filter((body) => !/^return \w*Shared\w*\(/.test(body));
}

describe("hosts decide hook inputs through kibi-agent-core", () => {
  for (const host of HOSTS) {
    const source = hostSource(host);

    test(`${host} classifies workspace paths with the shared classifyPath`, () => {
      expect(sharedImports(source, "path-policy")).toContain("classifyPath");
      expect(ownDeclarations(source, "classifyPath")).toEqual([]);
    });

    test(`${host} loads the knowledge index with the shared loadKnowledgeIndex`, () => {
      expect(sharedImports(source, "knowledge-index")).toContain(
        "loadKnowledgeIndex",
      );
      expect(ownDeclarations(source, "loadKnowledgeIndex")).toEqual([]);
    });

    test(`${host} recognizes Kibi MCP tool calls with the shared name rule`, () => {
      const imported = sharedImports(source, "kb-mcp-tools");
      expect(
        imported.includes("extractKbMcpToolCall") ||
          imported.includes("canonicalKbToolName"),
      ).toBe(true);
      expect(ownDeclarations(source, "extractKbMcpToolCall")).toEqual([]);
      expect(ownDeclarations(source, "canonicalKbToolName")).toEqual([]);
    });
  }

  test("a host that reimplements a decision is caught", () => {
    const forked = [
      'import { classifyPath as classifySharedPath } from "kibi-agent-core/path-policy";',
      "export function classifyPath(p: string) { return p.endsWith('.md') ? 'kb' : 'source'; }",
    ].join("\n");
    expect(sharedImports(forked, "path-policy")).toEqual(["classifyPath"]);
    expect(ownDeclarations(forked, "classifyPath")).toHaveLength(1);
  });
});
