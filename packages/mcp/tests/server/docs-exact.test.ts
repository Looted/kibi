import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DOC_RESOURCES,
  PROMPTS,
  setupDocsAndPrompts,
} from "../../src/server/docs.js";
import { KIBI_ICONS } from "../../src/server/icons.js";
import { TOOLS } from "../../src/tools-config.js";

// The published prompts and docs, word for word. Regenerate the fixture when
// the wording changes on purpose.
const fixture = JSON.parse(
  readFileSync(
    path.join(import.meta.dir, "../fixtures/contracts/docs-and-prompts.json"),
    "utf8",
  ),
) as { prompts: unknown; resources: unknown };

describe("docs and prompts, exact", () => {
  test("prompts match the published wording", () => {
    expect(PROMPTS).toStrictEqual(fixture.prompts as never);
  });

  test("static doc resources match the published wording", () => {
    expect(
      DOC_RESOURCES.filter((resource) => resource.uri !== "kibi://docs/tools"),
    ).toStrictEqual(fixture.resources as never);
    expect(DOC_RESOURCES.map((resource) => resource.uri)).toStrictEqual([
      "kibi://docs/overview",
      "kibi://docs/tools",
      "kibi://docs/errors",
      "kibi://docs/examples",
    ]);
  });

  test("the tools doc lists every tool with its required parameters", () => {
    const tools = DOC_RESOURCES.find(
      (resource) => resource.uri === "kibi://docs/tools",
    );
    const rows = TOOLS.map((tool) => {
      const required = Array.isArray(tool.inputSchema.required)
        ? (tool.inputSchema.required as string[]).join(", ")
        : "";
      return `| \`${tool.name}\` | ${tool.description} | ${required || "none"} |`;
    });
    expect(tools).toStrictEqual({
      uri: "kibi://docs/tools",
      name: "kibi docs tools",
      title: "Kibi tools reference",
      description: "Available tools with summaries and required parameters.",
      mimeType: "text/markdown",
      text: [
        "# kibi-mcp Tools",
        "",
        "Use this reference to choose the correct tool before calling it.",
        "",
        "| Tool | Summary | Required Parameters |",
        "| --- | --- | --- |",
        ...rows,
        "",
        "Modeling note: Kibi has eight core entity types grouped into common authoring (req, scenario, test, fact) and supporting/system (adr, flag, event, symbol).",
        "Only strict domain facts (`fact_kind: subject` + `property_value`) participate in contradiction inference; use `flag` for runtime/config gates and `fact_kind: observation` or `meta` for bug/workaround notes.",
        "Predicate flow: before writing ontology prose, call `kb_model` (mode `predicates`); apply a suggested `fact_kind: predicate` via `requires_predicate`, or record the returned `review:ontology-gap` observation when no predicate fits.",
      ].join("\n"),
    });
    // Both a tool with required parameters and one without are listed.
    expect(rows.some((row) => row.endsWith("| none |"))).toBe(true);
    expect(rows.some((row) => !row.endsWith("| none |"))).toBe(true);
  });

  test("setupDocsAndPrompts registers each prompt and resource with its reader", async () => {
    const prompts: unknown[][] = [];
    const resources: unknown[][] = [];
    setupDocsAndPrompts({
      registerPrompt: (...args: unknown[]) => prompts.push(args),
      registerResource: (...args: unknown[]) => resources.push(args),
    } as never);
    expect(prompts.map((args) => args.slice(0, 2))).toStrictEqual(
      PROMPTS.map((prompt) => [
        prompt.name,
        { title: prompt.title, description: prompt.description },
      ]),
    );
    for (const [index, prompt] of PROMPTS.entries()) {
      const read = prompts[index]?.[2] as () => Promise<unknown>;
      expect(await read()).toStrictEqual({
        messages: [
          { role: "user", content: { type: "text", text: prompt.text } },
        ],
      });
    }
    expect(resources.map((args) => args.slice(0, 3))).toStrictEqual(
      DOC_RESOURCES.map((resource) => [
        resource.name,
        resource.uri,
        {
          title: resource.title,
          description: resource.description,
          mimeType: "text/markdown",
          icons: KIBI_ICONS,
        },
      ]),
    );
    for (const [index, resource] of DOC_RESOURCES.entries()) {
      const read = resources[index]?.[3] as () => Promise<unknown>;
      expect(await read()).toStrictEqual({
        contents: [
          {
            uri: resource.uri,
            mimeType: "text/markdown",
            text: resource.text,
          },
        ],
      });
    }
  });
});
