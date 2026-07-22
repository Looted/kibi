import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listSpecs } from "../src/public/operations/catalog";

const resourcePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/public/skills/kibi-usage/resources/operation-access.md",
);

const VALID_INPUT_MODES = new Set([
  "--input JSON",
  "--input JSON or flags",
]);

type OperationAccessRow = {
  readonly mcpName: string;
  readonly cliRoute: string;
  readonly inputMode: string;
  readonly mutability: string;
  readonly requiresProlog: string;
  readonly effects: string;
  readonly preference: string;
};

function parseOperationRows(markdown: string): readonly OperationAccessRow[] {
  const tableLines = markdown
    .split("\n")
    .filter((line) => line.startsWith("| `kb_"));

  return tableLines.map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().replaceAll("`", ""));
    const [mcpName, cliRoute, inputMode, mutability, requiresProlog, effects, preference] =
      cells;
    return {
      mcpName: mcpName ?? "",
      cliRoute: cliRoute ?? "",
      inputMode: inputMode ?? "",
      mutability: mutability ?? "",
      requiresProlog: requiresProlog ?? "",
      effects: effects ?? "",
      preference: preference ?? "",
    };
  });
}

describe("operation-access skill resource", () => {
  test("lists exactly the catalog operations with executable dedicated routes", () => {
    const rows = parseOperationRows(readFileSync(resourcePath, "utf8"));
    const expected = listSpecs().map((spec) => ({
      mcpName: spec.name,
      cliRoute: spec.cliName.replaceAll(" ", "-"),
    }));

    expect(rows).toHaveLength(18);
    expect(
      rows.map(({ mcpName, cliRoute }) => ({ mcpName, cliRoute })),
    ).toEqual(expected);
    expect(new Set(rows.map((row) => row.mcpName)).size).toBe(rows.length);
  });

  test("records catalog effects, Prolog needs, mutability, input, and preference", () => {
    const rows = parseOperationRows(readFileSync(resourcePath, "utf8"));

    for (const [index, spec] of listSpecs().entries()) {
      const row = rows[index];
      expect(row).toBeDefined();
      expect(VALID_INPUT_MODES.has(row?.inputMode ?? "")).toBe(true);
      expect(row?.mutability).toBe(
        spec.effects.some((effect) => effect.endsWith("write")) ? "write" : "read",
      );
      expect(row?.requiresProlog).toBe(spec.requiresProlog ? "yes" : "no");
      expect(row?.effects.split(", ")).toEqual([...spec.effects]);
      expect(row?.preference).toBe("MCP-first; CLI-fallback");
    }
  });

  test("documents telemetry extraction and JSON stdin execution", () => {
    const markdown = readFileSync(resourcePath, "utf8");
    const bashBlocks = [...markdown.matchAll(/```bash\n([\s\S]*?)```/g)].map(
      (match) => match[1] ?? "",
    );

    expect(markdown).toContain("_diagnostic_telemetry");
    expect(
      bashBlocks.some(
        (block) => block.includes("--input -") && block.includes("echo '{"),
      ),
    ).toBe(true);
  });
});
