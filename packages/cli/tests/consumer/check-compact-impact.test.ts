import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of a kb_check scoped to changed code: `kibi check` on the
 * built CLI quotes each requirement statement once (in evidence), lists the
 * advice that impact diagnostics share once, and lists changed symbols
 * without the links linkedEntities already carries.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Diagnostic = {
  id: string;
  entityId?: string;
  message: string;
  suggestion?: string;
  advice?: number;
  evidence?: Json;
};

const STATEMENTS: Record<string, string> = {
  "REQ-EXPORT-CSV": "The report export must write CSV.",
  "REQ-EXPORT-HEADER": "The report export must start with a header row.",
};

describe("kibi check scoped to changed code", () => {
  test("quotes each statement once, lists shared advice once and leaves links to linkedEntities", () => {
    const ws = createConsumerWorkspace("kibi-check-compact-");
    workspace = ws;
    for (const [id, statement] of Object.entries(STATEMENTS))
      ws.write(
        `.kb/requirements/${id}.md`,
        doc(
          `
id: ${id}
title: ${statement.replace(/\.$/, "")}
type: req
status: open
priority: should
firmness: default
origin:
  kind: agent
semantic_text: ${statement}
`,
          statement,
        ),
      );
    ws.write(
      "src/export.ts",
      [
        "export function exportCsv(rows: string[][]): string {",
        '  return rows.map((row) => row.join(",")).join("\\n");',
        "}",
        "",
        "export function headerRow(columns: string[]): string {",
        '  return columns.join(",");',
        "}",
        "",
      ].join("\n"),
    );
    ws.write(
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-export-csv",
        "    title: exportCsv",
        "    sourceFile: src/export.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-EXPORT-CSV",
        "  - id: SYM-header-row",
        "    title: headerRow",
        "    sourceFile: src/export.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-EXPORT-HEADER",
        "",
      ].join("\n"),
    );
    ws.sync();
    // Committed, so the requirements count as unchanged by this edit.
    ws.git("add", ".");
    ws.git("commit", "-qm", "base");

    const result = ws.json(["check"], {
      sourceFiles: ["src/export.ts"],
      includeImpactDiagnostics: true,
    });
    const data = result.data as Json;
    const diagnostics = data.impactDiagnostics as Diagnostic[];
    const advice = (data.impactAdvice ?? []) as string[];

    const statements = diagnostics.filter(
      (diagnostic) => diagnostic.id === "requirement_statement_unverified",
    );
    expect(statements.map((diagnostic) => diagnostic.entityId)).toEqual([
      "REQ-EXPORT-CSV",
      "REQ-EXPORT-HEADER",
    ]);
    for (const diagnostic of statements) {
      const statement = STATEMENTS[diagnostic.entityId as string] as string;
      expect((diagnostic.evidence as Json).statement).toBe(statement);
      expect(diagnostic.message).not.toContain(statement);
      expect(diagnostic.message).toContain(
        `implements ${diagnostic.entityId} [default]; its statement is in evidence.statement.`,
      );
    }

    // The two statement warnings share one advice, given once.
    expect(new Set(advice).size).toBe(advice.length);
    expect(statements.map((diagnostic) => diagnostic.advice)).toEqual([
      statements[0]?.advice,
      statements[0]?.advice,
    ]);
    for (const diagnostic of diagnostics) {
      if (diagnostic.advice === undefined) {
        expect(diagnostic.suggestion).toBeString();
        continue;
      }
      expect(diagnostic.suggestion).toBeUndefined();
      expect(advice[diagnostic.advice]).toBeString();
    }
    expect(advice[statements[0]?.advice as number]).toContain(
      "the requirement in entityId",
    );

    const symbols = data.extractedSymbols as Json[];
    expect(symbols.map((symbol) => symbol.id).sort()).toEqual([
      "SYM-export-csv",
      "SYM-header-row",
    ]);
    for (const symbol of symbols)
      expect("linkedEntityIds" in symbol).toBe(false);
    expect(
      (data.linkedEntities as Json[]).map((link) => [
        link.sourceSymbolId,
        link.id,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["SYM-export-csv", "REQ-EXPORT-CSV"],
        ["SYM-header-row", "REQ-EXPORT-HEADER"],
      ]),
    );
  }, 300_000);
});
