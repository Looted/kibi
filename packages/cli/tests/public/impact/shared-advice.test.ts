import { describe, expect, test } from "bun:test";
import type { ChangedFileImpactResult } from "../../../src/public/impact-diagnostics.js";
import { withoutQuotedStatement } from "../../../src/public/impact/requirement-statements.js";
import {
  SEMANTIC_REVIEW_ADVICE,
  SEMANTIC_REVIEW_UNLINKED_ADVICE,
  STATEMENT_UNVERIFIED_ADVICE,
  STATEMENT_UNVERIFIED_FIRM_ADVICE,
  fillAdvice,
  sharedAdviceOf,
} from "../../../src/public/impact/shared-advice.js";
import { compactImpactDiagnostics } from "../../../src/public/operations/check-format-shared.js";

type Diagnostic = ChangedFileImpactResult["impactDiagnostics"][number];

describe("shared impact advice", () => {
  test("fills each placeholder and leaves an unknown one as written", () => {
    expect(
      fillAdvice(
        { text: "Ask {who} about {what}.", shared: {} },
        { who: "Ann" },
      ),
    ).toBe("Ask Ann about {what}.");
  });

  test("names the field that holds each value in the shared form", () => {
    const filled = fillAdvice(STATEMENT_UNVERIFIED_ADVICE, {
      requirement: "REQ-a",
    });
    expect(filled).toBe(
      "Confirm the changed code still does what REQ-a says. If it no longer does, the request conflicts with a recorded rule: ask whether to change REQ-a before keeping the change, then supersede or update it in the same change with the person's words, and say in the final answer which rule changed.",
    );
    expect(sharedAdviceOf(filled)).toBe(
      "Confirm the changed code still does what the requirement in entityId says. If it no longer does, the request conflicts with a recorded rule: ask whether to change the requirement in entityId before keeping the change, then supersede or update it in the same change with the person's words, and say in the final answer which rule changed.",
    );
  });

  test("tells the firm, linked and unlinked advice apart", () => {
    expect(
      sharedAdviceOf(
        fillAdvice(STATEMENT_UNVERIFIED_FIRM_ADVICE, { requirement: "REQ-f" }),
      ),
    ).toBe(
      "Confirm the changed code still does what the requirement in entityId says. If it no longer does, the request conflicts with a rule a person set: stop and ask whether to change the requirement in entityId; change it only with their words in origin.ref, and say in the final answer which rule changed.",
    );
    expect(
      sharedAdviceOf(
        fillAdvice(SEMANTIC_REVIEW_ADVICE, {
          file: "src/a.ts",
          linked: "REQ-a, TEST-a",
        }),
      ),
    ).toBe(
      "Use kb_search and kb_query for the file in files, then verify that the entities the message names actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.",
    );
    expect(
      sharedAdviceOf(
        fillAdvice(SEMANTIC_REVIEW_UNLINKED_ADVICE, {
          file: "src/a.ts",
          symbol: "run",
        }),
      ),
    ).toBe(
      'If the change adds or alters behavior, record it as part of this change; that is part of finishing it, not a separate request, so it needs no permission: kb_search({query:"<the behavior>", sourceLocations:[{path:"<the file in files>"}]}) for a requirement that already describes it and link the symbol in evidence.symbol to it; if none does, kb_upsert a requirement with a scenario and link the symbol with implements. If behavior is unchanged (a refactor, renaming), say so in the final report instead.',
    );
  });

  test("gives no shared advice for a suggestion no template gives", () => {
    expect(sharedAdviceOf("Review the change.")).toBeUndefined();
    // A template's text with something before or after it is not that advice.
    expect(
      sharedAdviceOf(
        `Also: ${fillAdvice(STATEMENT_UNVERIFIED_ADVICE, { requirement: "R" })}`,
      ),
    ).toBeUndefined();
    expect(
      sharedAdviceOf(
        `${fillAdvice(STATEMENT_UNVERIFIED_ADVICE, { requirement: "R" })} Then stop.`,
      ),
    ).toBeUndefined();
  });
});

describe("withoutQuotedStatement", () => {
  const statement = "Exports must be CSV.";
  const diagnostic = {
    id: "requirement_statement_unverified",
    message: `The change edits run, which implements REQ-a [default]: "${statement}" Kibi compared links and facts.`,
    evidence: { statement },
  };

  test("moves the quote out of the message, leaving it in evidence", () => {
    expect(withoutQuotedStatement(diagnostic)).toEqual({
      ...diagnostic,
      message:
        "The change edits run, which implements REQ-a [default]; its statement is in evidence.statement. Kibi compared links and facts.",
    });
  });

  test("returns any other diagnostic as it is", () => {
    const other = { ...diagnostic, id: "symbol_semantic_review_needed" };
    expect(withoutQuotedStatement(other)).toBe(other);
    const noStatement = { ...diagnostic, evidence: { statement: 3 } };
    expect(withoutQuotedStatement(noStatement)).toBe(noStatement);
    const noEvidence = { id: diagnostic.id, message: diagnostic.message };
    expect(withoutQuotedStatement(noEvidence)).toBe(noEvidence);
    const unquoted = { ...diagnostic, message: "The change edits run." };
    expect(withoutQuotedStatement(unquoted)).toBe(unquoted);
  });
});

describe("compactImpactDiagnostics", () => {
  const base = {
    severity: "warning",
    blocking: false,
    category: "symbol",
    files: ["src/a.ts"],
    docs: [],
  } as const;
  const review = (symbol: string, file: string): Diagnostic => ({
    ...base,
    id: "symbol_semantic_review_needed",
    files: [file],
    message: `Changed behavioral symbol ${symbol} needs semantic review against linked Kibi coverage: REQ-a`,
    suggestion: fillAdvice(SEMANTIC_REVIEW_ADVICE, { file, linked: "REQ-a" }),
    evidence: { symbol },
  });
  const statement: Diagnostic = {
    ...base,
    id: "requirement_statement_unverified",
    category: "requirement",
    entityId: "REQ-a",
    message:
      'The change edits run, which implements REQ-a [default]: "Say it." Kibi compared links and facts.',
    suggestion: fillAdvice(STATEMENT_UNVERIFIED_ADVICE, {
      requirement: "REQ-a",
    }),
    evidence: { requirement: "REQ-a", statement: "Say it." },
  };
  const own: Diagnostic = {
    ...base,
    id: "symbol_granularity_violation",
    message: "Too coarse.",
    suggestion: "Narrow the symbol.",
  };

  test("lists each shared advice once and points diagnostics at it", () => {
    const { diagnostics, advice } = compactImpactDiagnostics([
      review("run", "src/a.ts"),
      statement,
      own,
      review("stop", "src/b.ts"),
    ]);
    expect(advice).toEqual([
      sharedAdviceOf(review("run", "src/a.ts").suggestion) as string,
      sharedAdviceOf(statement.suggestion) as string,
    ]);
    const { suggestion: _first, ...firstRest } = review("run", "src/a.ts");
    const { suggestion: _last, ...lastRest } = review("stop", "src/b.ts");
    const { suggestion: _statement, ...statementRest } = statement;
    expect(diagnostics).toEqual([
      { ...firstRest, advice: 0 },
      {
        ...statementRest,
        message:
          "The change edits run, which implements REQ-a [default]; its statement is in evidence.statement. Kibi compared links and facts.",
        advice: 1,
      },
      own,
      { ...lastRest, advice: 0 },
    ]);
  });

  test("lists no advice when no diagnostic shares one", () => {
    expect(compactImpactDiagnostics([own])).toEqual({
      diagnostics: [own],
      advice: [],
    });
  });
});
