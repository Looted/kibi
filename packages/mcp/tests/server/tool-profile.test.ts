import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

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
  test("the default profile names the six core tools and the bootstrap pair", () => {
    expect([...DEFAULT_PROFILE_TOOLS]).toEqual([
      "kb_search",
      "kb_query",
      "kb_upsert",
      "kb_check",
      "kb_status",
      "kb_skills",
    ]);
    expect([...BOOTSTRAP_TOOLS]).toEqual([
      "kb_plan_bootstrap",
      "kb_apply_plan",
    ]);
    const catalog = TOOLS.map((tool) => tool.name);
    for (const name of [...DEFAULT_PROFILE_TOOLS, ...BOOTSTRAP_TOOLS])
      expect(catalog).toContain(name);
  });

  test("lists the core tools, adds the bootstrap tools while the KB is empty, and every tool when full", () => {
    expect([...(profileToolNames("default", false) ?? [])]).toEqual([
      ...DEFAULT_PROFILE_TOOLS,
    ]);
    expect([...(profileToolNames("default", true) ?? [])]).toEqual([
      ...DEFAULT_PROFILE_TOOLS,
      ...BOOTSTRAP_TOOLS,
    ]);
    expect(profileToolNames("full", true)).toBeUndefined();
    expect(profileToolNames("full", false)).toBeUndefined();
  });

  test("KIBI_MCP_TOOLS wins, then the recorded choice, then default", () => {
    const plain = workspace();
    expect(resolveToolProfile(plain, {})).toBe("default");
    expect(resolveToolProfile(plain, { KIBI_MCP_TOOLS: " FULL " })).toBe(
      "full",
    );
    expect(resolveToolProfile(plain, { KIBI_MCP_TOOLS: "everything" })).toBe(
      "default",
    );
    const fromPackage = workspace({
      "package.json": JSON.stringify({ kibi: { mcpTools: "full" } }),
      ".kb/setup.json": JSON.stringify({ mcpTools: "default" }),
    });
    expect(resolveToolProfile(fromPackage, {})).toBe("full");
    expect(resolveToolProfile(fromPackage, { KIBI_MCP_TOOLS: "default" })).toBe(
      "default",
    );
    const fromSetup = workspace({
      "package.json": JSON.stringify({ kibi: { mcpTools: "some" } }),
      ".kb/setup.json": JSON.stringify({ mcpTools: "full" }),
    });
    expect(resolveToolProfile(fromSetup, {})).toBe("full");
    // A malformed file or a package.json without a kibi block names none.
    expect(
      resolveToolProfile(
        workspace({ "package.json": "{", ".kb/setup.json": "null" }),
        {},
      ),
    ).toBe("default");
    expect(
      resolveToolProfile(
        workspace({
          "package.json": "null",
          ".kb/setup.json": JSON.stringify({ mcpTools: "full" }),
        }),
        {},
      ),
    ).toBe("full");
    expect(
      resolveToolProfile(
        workspace({
          "package.json": JSON.stringify({ kibi: null }),
          ".kb/setup.json": "{",
        }),
        {},
      ),
    ).toBe("default");
    expect(
      resolveToolProfile(
        workspace({
          "package.json": JSON.stringify({ name: "x" }),
          ".kb/setup.json": JSON.stringify({ mcpTools: 1 }),
        }),
        {},
      ),
    ).toBe("default");
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
        "Kibi is a branch-local requirements knowledge base for software traceability.",
        "Start with kb_search (ask it a question; its answer layer names the governing requirements, facts, ADRs and tests), then kb_query for exact lookups before any mutation.",
        "Model requirements as linked facts via kb_model (mode requirement) or kb_upsert (create endpoints before linking them); preflight writes with kb_upsert dryRun:true.",
        "Mutate sequentially with kb_upsert and kb_delete; validate with kb_check during iteration and run an unfiltered kb_check before completion.",
        "Confirm branch freshness with kb_status. For first-time repository setup, use the kibi-bootstrap prompt.",
      ].join(" "),
    );
    const listed = serverInstructions(new Set(["kb_search", "kb_query"]));
    expect(listed).toBe(
      `${full} This server lists kb_search, kb_query. The other Kibi operations (kb_status, kb_skills, kb_find_gaps, kb_coverage, kb_graph, kb_model, kb_upsert, kb_delete, kb_check, kb_prepare_impact_review, kb_plan_bootstrap, kb_compile_intent, kb_apply_plan, kb_ingest_proof) run through the project CLI with the same input: npx --no-install kibi <command> (kibi --help lists them; JSON routes read --input -). Set KIBI_MCP_TOOLS=full to list them all here.`,
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
