import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { SESSION_BRIEF } from "kibi-agent-core/session-brief";
import { type OperationName, getSpec } from "kibi-runtime";
import { serverInstructions } from "../../src/server.js";
import {
  BOOTSTRAP_TOOLS,
  DEFAULT_PROFILE_TOOLS,
  IMPACT_REVIEW_TOOLS,
  REMEMBER_KNOWLEDGE_TOOLS,
  REMEMBER_UNLISTED_TOOLS,
  TOOLS,
  buildBaseTools,
  hasImpactPolicy,
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

  test("pins the tool list for each level, profile, empty knowledge base and impact policy", () => {
    const knowledge = [
      "kb_query",
      "kb_search",
      "kb_status",
      "kb_skills",
      "kb_graph",
      "kb_model",
      "kb_upsert",
      "kb_record",
      "kb_delete",
      "kb_check",
      "kb_review_firm_edit",
      "kb_apply_plan",
    ];
    const list = (
      profile: "full" | "core",
      kbEmpty: boolean,
      level: "remember" | "test",
      impactPolicy: boolean,
    ) => {
      const names = profileToolNames(profile, kbEmpty, level, impactPolicy);
      return names === undefined ? undefined : [...names];
    };
    for (const kbEmpty of [false, true])
      for (const impactPolicy of [false, true]) {
        // At test the full profile lists the whole catalog and core is unchanged.
        expect(list("full", kbEmpty, "test", impactPolicy)).toBeUndefined();
        expect(list("core", kbEmpty, "test", impactPolicy)).toEqual([
          ...DEFAULT_PROFILE_TOOLS,
          ...(kbEmpty ? BOOTSTRAP_TOOLS : []),
        ]);
        // At remember core is as at test (it holds no verification tool).
        expect(list("core", kbEmpty, "remember", impactPolicy)).toEqual(
          list("core", kbEmpty, "test", impactPolicy),
        );
      }
    expect(list("full", false, "remember", false)).toEqual(knowledge);
    expect(list("full", true, "remember", false)).toEqual([
      ...knowledge.slice(0, -1),
      "kb_plan_bootstrap",
      "kb_compile_intent",
      "kb_apply_plan",
    ]);
    expect(list("full", false, "remember", true)).toEqual([
      ...knowledge.slice(0, -1),
      "kb_prepare_impact_review",
      "kb_author_impact_review",
      "kb_apply_plan",
    ]);
    expect(list("full", true, "remember", true)).toEqual([
      ...knowledge.slice(0, -1),
      "kb_prepare_impact_review",
      "kb_author_impact_review",
      "kb_plan_bootstrap",
      "kb_compile_intent",
      "kb_apply_plan",
    ]);
    expect([...REMEMBER_KNOWLEDGE_TOOLS].map(String).sort()).toEqual(
      [...knowledge].sort(),
    );
    expect([...IMPACT_REVIEW_TOOLS]).toEqual([
      "kb_prepare_impact_review",
      "kb_author_impact_review",
    ]);
    // The level filters the catalog the server registers; no host has its own.
    expect(profileToolNames("full", false)).toBeUndefined();
  });

  test("at Kibi level remember no profile lists kb_ingest_proof or kb_coverage, and the instructions offer every hidden tool but kb_ingest_proof through the CLI", () => {
    expect([...REMEMBER_UNLISTED_TOOLS]).toEqual(["kb_ingest_proof"]);
    for (const profile of ["full", "core"] as const)
      for (const kbEmpty of [false, true])
        for (const impactPolicy of [false, true]) {
          const listed = profileToolNames(
            profile,
            kbEmpty,
            "remember",
            impactPolicy,
          );
          expect(listed?.has("kb_ingest_proof")).toBe(false);
          expect(listed?.has("kb_coverage")).toBe(false);
        }
    const listed = profileToolNames("full", false, "remember") ?? new Set();
    const instructions = serverInstructions(
      listed,
      TOOLS,
      REMEMBER_UNLISTED_TOOLS,
    );
    const hidden = TOOLS.map((tool) => tool.name).filter(
      (name) =>
        !listed.has(name) &&
        !REMEMBER_UNLISTED_TOOLS.has(name) &&
        name !== "kb_sparql_remote" &&
        name !== "kb_job_status",
    );
    expect(hidden).toEqual([
      "kb_find_gaps",
      "kb_coverage",
      "kb_prepare_impact_review",
      "kb_author_impact_review",
      "kb_plan_bootstrap",
      "kb_compile_intent",
    ]);
    // Every hidden tool is named as reachable through the CLI peer route.
    expect(instructions).toContain(
      `The other Kibi operations (${hidden.join(", ")}) run through the project CLI`,
    );
    expect(instructions).not.toContain("kb_ingest_proof");
    expect(serverInstructions(new Set(["kb_search"]))).toContain(
      "kb_ingest_proof",
    );
    // Each hidden tool, verification ones included, has a CLI peer command.
    expect(
      [...hidden, ...REMEMBER_UNLISTED_TOOLS].map(
        (name) => getSpec(name as OperationName).cliName,
      ),
    ).toEqual([
      "find-gaps",
      "coverage",
      "prepare-impact-review",
      "author-impact-review",
      "plan-bootstrap",
      "compile-intent",
      "ingest-proof",
    ]);
  });

  test("an impact policy is a file at .kibi/impact-policy.json", () => {
    expect(hasImpactPolicy(workspace())).toBe(false);
    expect(
      hasImpactPolicy(workspace({ ".kibi/impact-policy.json/x": "{}" })),
    ).toBe(false);
    expect(
      hasImpactPolicy(workspace({ ".kibi/impact-policy.json": "{}" })),
    ).toBe(true);
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
      `${full}\nThis server lists kb_search, kb_query. The other Kibi operations (kb_status, kb_skills, kb_find_gaps, kb_coverage, kb_graph, kb_model, kb_upsert, kb_record, kb_delete, kb_check, kb_review_firm_edit, kb_prepare_impact_review, kb_author_impact_review, kb_plan_bootstrap, kb_compile_intent, kb_apply_plan, kb_ingest_proof) run through the project CLI with the same input: npx --no-install kibi <command> (kibi --help lists them; JSON routes read --input -).`,
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
