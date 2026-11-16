import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ADVERTISED_DESCRIPTION } from "../../src/public/operations/advertised-schema.js";
import { listSpecs } from "../../src/public/operations/catalog.js";
import {
  operationFieldReference,
  shortenedFields,
} from "../../src/public/operations/field-reference.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

const long = (text: string) => ({
  type: "string",
  description: text,
  [ADVERTISED_DESCRIPTION]: "Short.",
});

describe("operation field reference", () => {
  test("lists each field advertised in short by its path, once", () => {
    expect(
      shortenedFields({
        type: "object",
        description: "The input.",
        [ADVERTISED_DESCRIPTION]: "Input.",
        properties: {
          a: long("Full a."),
          plain: { type: "string", description: "Advertised in full." },
          nested: {
            type: "object",
            properties: { b: long("Full b.") },
          },
          list: { type: "array", items: long("Full item.") },
          either: { oneOf: [long("First."), long("Second.")] },
          // Only a string description counts.
          odd: { [ADVERTISED_DESCRIPTION]: "Short.", description: 1 },
          noDescription: { [ADVERTISED_DESCRIPTION]: "Short." },
          // A field named properties is a field, not a properties map.
          properties: long("Full properties."),
        },
        notAMap: { properties: "x" },
        nothing: null,
      }),
    ).toEqual([
      ["", "The input."],
      ["a", "Full a."],
      ["nested.b", "Full b."],
      ["list[]", "Full item."],
      ["either", "First."],
      ["properties", "Full properties."],
    ]);
  });

  test("renders one section per operation with shortened fields, after workspaceRoot", () => {
    const text = operationFieldReference([
      {
        name: "kb_none",
        cliName: "none",
        businessInputSchema: { type: "object", properties: {} },
      },
      {
        name: "kb_one",
        cliName: "one",
        businessInputSchema: {
          type: "object",
          properties: { a: long("Full a."), b: long("Full b.") },
        },
      },
    ] as never);
    expect(text.startsWith("# Kibi Operation Fields\n\nGenerated from")).toBe(
      true,
    );
    expect(text).toContain(
      "## `workspaceRoot` (every MCP tool)\n\n- `workspaceRoot`: Optional absolute path",
    );
    expect(text).not.toContain("kb_none");
    expect(
      text.endsWith(
        "## `kb_one` (`kibi one`)\n\n- `a`: Full a.\n- `b`: Full b.\n",
      ),
    ).toBe(true);
  });

  test("the generated kibi-usage resource and its copies are current", () => {
    const expected = operationFieldReference(listSpecs());
    for (const dir of [
      "packages/runtime/src/skills",
      "packages/cli/src/public/skills",
      "packages/cursor/agent-plugin/skills",
    ]) {
      expect(
        readFileSync(
          resolve(root, dir, "kibi-usage/resources/operation-fields.md"),
          "utf8",
        ),
        `${dir}: run bun run scripts/generate-operation-fields.ts`,
      ).toBe(expected);
    }
  });
});
