import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { SESSION_BRIEF } from "kibi-agent-core/session-brief";
import { serverInstructions } from "../../src/server.js";
import {
  BOOTSTRAP_TOOLS,
  DEFAULT_PROFILE_TOOLS,
  TOOLS,
  buildBaseTools,
  knowledgeBaseIsEmpty,
  profileToolNames,
  resolveToolProfile,
} from "../../src/tools-config.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-tool-profile-"));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}

describe("MCP tool profile", () => {
  test("the core profile names the seven core tools, the receipt tool and the bootstrap pair", () => {
    expect([...DEFAULT_PROFILE_TOOLS]).toEqual([
      "kb_search",
      "kb_query",
      "kb_record",
      "kb_upsert",
      "kb_check",
      "kb_status",
      "kb_skills",
      "kb_review_firm_edit",
    ]);
    expect([...BOOTSTRAP_TOOLS]).toEqual([
      "kb_plan_bootstrap",
      "kb_apply_plan",
    ]);
    const catalog = TOOLS.map((tool) => tool.name);
    for (const name of [...DEFAULT_PROFILE_TOOLS, ...BOOTSTRAP_TOOLS])
      expect(catalog).toContain(name);
  });

  test("lists every tool when full, and the core tools plus the bootstrap tools while the KB is empty when core", () => {
    expect([...(profileToolNames("core", false) ?? [])]).toEqual([
      ...DEFAULT_PROFILE_TOOLS,
    ]);
    expect([...(profileToolNames("core", true) ?? [])]).toEqual([
      ...DEFAULT_PROFILE_TOOLS,
      ...BOOTSTRAP_TOOLS,
    ]);
    expect(profileToolNames("full", true)).toBeUndefined();
    expect(profileToolNames("full", false)).toBeUndefined();
  });

  test("a value that names no profile is ignored and named on stderr", () => {
    const warnings: string[] = [];
    const warn = (message: string) => {
      warnings.push(message);
    };
    const recorded = workspace({
      "package.json": JSON.stringify({ kibi: { mcpTools: "default" } }),
      ".kb/setup.json": JSON.stringify({ mcpTools: "minimal" }),
    });
    expect(
      resolveToolProfile(recorded, { KIBI_MCP_TOOLS: "Default" }, warn),
    ).toBe("full");
    expect(warnings).toStrictEqual([
      '[KIBI-MCP] KIBI_MCP_TOOLS is "Default", which names no tool profile (full or core); it is ignored.\n',
      '[KIBI-MCP] kibi.mcpTools in package.json is "default", which names no tool profile (full or core); it is ignored.\n',
      '[KIBI-MCP] mcpTools in .kb/setup.json is "minimal", which names no tool profile (full or core); it is ignored.\n',
    ]);
    warnings.length = 0;
    expect(resolveToolProfile(workspace(), { KIBI_MCP_TOOLS: " " }, warn)).toBe(
      "full",
    );
    expect(warnings).toStrictEqual([]);
  });

  test("KIBI_MCP_TOOLS wins, then the recorded choice, then full", () => {
    const plain = workspace();
    // Every host gets every tool unless a profile is chosen.
    expect(resolveToolProfile(plain, {})).toBe("full");
    expect(resolveToolProfile(plain, { KIBI_MCP_HOST: "cursor" })).toBe("full");
    expect(resolveToolProfile(plain, { KIBI_MCP_TOOLS: " CORE " })).toBe(
      "core",
    );
    expect(resolveToolProfile(plain, { KIBI_MCP_TOOLS: "default" })).toBe(
      "full",
    );
    const fromPackage = workspace({
      "package.json": JSON.stringify({ kibi: { mcpTools: "core" } }),
      ".kb/setup.json": JSON.stringify({ mcpTools: "full" }),
    });
    expect(resolveToolProfile(fromPackage, {})).toBe("core");
    expect(resolveToolProfile(fromPackage, { KIBI_MCP_TOOLS: "full" })).toBe(
      "full",
    );
    const fromSetup = workspace({
      "package.json": JSON.stringify({ kibi: { mcpTools: "some" } }),
      ".kb/setup.json": JSON.stringify({ mcpTools: "core" }),
    });
    expect(resolveToolProfile(fromSetup, {})).toBe("core");
    // A malformed file or a package.json without a kibi block names none.
    expect(
      resolveToolProfile(
        workspace({ "package.json": "{", ".kb/setup.json": "null" }),
        {},
      ),
    ).toBe("full");
    expect(
      resolveToolProfile(
        workspace({
          "package.json": "null",
          ".kb/setup.json": JSON.stringify({ mcpTools: "core" }),
        }),
        {},
      ),
    ).toBe("core");
    expect(
      resolveToolProfile(
        workspace({
          "package.json": JSON.stringify({ kibi: null }),
          ".kb/setup.json": "{",
        }),
        {},
      ),
    ).toBe("full");
    expect(
      resolveToolProfile(
        workspace({
          "package.json": JSON.stringify({ name: "x" }),
          ".kb/setup.json": JSON.stringify({ mcpTools: 1 }),
        }),
        {},
      ),
    ).toBe("full");
  });

  test("the KB is empty until a lane holds an entity file", () => {
    expect(knowledgeBaseIsEmpty(workspace())).toBe(true);
    expect(
      knowledgeBaseIsEmpty(
        workspace({
          ".kb/manifest.json": "{}",
          ".kb/symbols.yaml": "symbols: []\n",
          ".kb/requirements/notes.txt": "x",
        }),
      ),
    ).toBe(true);
    // A lane that is a file holds no entity.
    expect(knowledgeBaseIsEmpty(workspace({ ".kb/requirements": "x" }))).toBe(
      true,
    );
    expect(
      knowledgeBaseIsEmpty(
        workspace({
          ".kb/requirements/notes.txt": "x",
          ".kb/requirements/REQ-1.md": "---\n---\n",
        }),
      ),
    ).toBe(false);
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "facts",
      "adr",
      "flags",
      "events",
    ])
      expect(
        knowledgeBaseIsEmpty(workspace({ [`.kb/${lane}/X.md`]: "---\n---\n" })),
      ).toBe(false);
    expect(
      knowledgeBaseIsEmpty(workspace({ ".kb/other/X.md": "---\n---\n" })),
    ).toBe(true);
  });

  test("the instructions name the listed tools and where the others are", () => {
    const full = serverInstructions();
    expect(full).toBe(
      [
        SESSION_BRIEF,
        "kb_search answers a question with the governing requirements, facts, ADRs and tests; kb_query looks up an exact id or sourceFile; kb_record records a stated rule; kb_upsert writes and models; kb_check validates; kb_status reports freshness.",
        "Workflow guidance: kb_skills with action load and id kibi-usage. For first-time repository setup, use the kibi-bootstrap prompt.",
      ].join("\n"),
    );
    const listed = serverInstructions(new Set(["kb_search", "kb_query"]));
    expect(listed).toBe(
      `${full}\nThis server lists kb_search, kb_query. The other Kibi operations (kb_status, kb_skills, kb_find_gaps, kb_coverage, kb_graph, kb_model, kb_upsert, kb_record, kb_delete, kb_check, kb_review_firm_edit, kb_prepare_impact_review, kb_plan_bootstrap, kb_compile_intent, kb_apply_plan, kb_ingest_proof) run through the project CLI with the same input: npx --no-install kibi <command> (kibi --help lists them; JSON routes read --input -).`,
    );
    // An optional tool enabled by name is listed, so it is not sent to the CLI.
    const withSparql = serverInstructions(
      new Set(["kb_search"]),
      buildBaseTools(new Set(["kb_sparql_remote"])),
    );
    expect(withSparql).toContain("(kb_query, kb_status,");
    expect(withSparql).not.toContain("kb_sparql_remote");
  });
});
