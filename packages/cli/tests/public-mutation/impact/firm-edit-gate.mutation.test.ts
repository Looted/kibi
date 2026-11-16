import { describe, expect, test } from "bun:test";
import {
  FIRM_EDIT_RECEIPT_VERSION,
  type FirmEditReceipt,
  firmEditCodeHash,
  firmEditReceiptPath,
  firmEditStatementHash,
  serializeFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import type { ExtractedEntity } from "../../../src/extractors/markdown.js";
import {
  createFirmEditGateDiagnostics,
  implementedRequirementIds,
  isCurrentFirmRequirement,
  requirementStatement,
  reviewState,
} from "../../../src/public/impact/firm-edit-gate.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

const SOURCE = [
  "export function expireKey(at: number, now: number): boolean {",
  "  return now - at > 90;",
  "}",
  "export function renderKey(key: string): string {",
  "  return key;",
  "}",
].join("\n");

const STATEMENT = "API keys must expire ninety days after they are created.";

function symbol(
  name: string,
  extra: Partial<ExtractedSymbol> = {},
): ExtractedSymbol {
  return {
    id: `SYM-${name}`,
    name,
    kind: "function",
    role: "behavioral",
    location: { file: "src/keys.ts", startLine: 1, endLine: 3 },
    hunkRanges: [{ start: 2, end: 2 }],
    reqLinks: ["REQ-key-expiry"],
    ...extra,
  };
}

const RENDER = symbol("renderKey", {
  location: { file: "src/keys.ts", startLine: 4, endLine: 6 },
});

function req(
  id: string,
  extra: Partial<ExtractedEntity> = {},
): ExtractedEntity {
  return {
    id,
    type: "req",
    title: `Title of ${id}`,
    status: "open",
    semantic_text: STATEMENT,
    source: `.kb/requirements/${id}.md`,
    ...extra,
  } as ExtractedEntity;
}

function receipt(
  target: ExtractedSymbol,
  overrides: Partial<FirmEditReceipt> = {},
): FirmEditReceipt {
  return {
    version: FIRM_EDIT_RECEIPT_VERSION,
    requirementId: "REQ-key-expiry",
    sourceFile: target.location.file,
    symbol: target.name,
    verdict: "keeps",
    note: "Still ninety days.",
    statementHash: firmEditStatementHash(STATEMENT),
    codeHash: firmEditCodeHash(
      SOURCE,
      target.location.startLine,
      target.location.endLine,
    ) as string,
    startLine: target.location.startLine,
    endLine: target.location.endLine,
    recordedAt: "2026-11-16T00:00:00.000Z",
    ...overrides,
  };
}

function receipts(
  ...list: FirmEditReceipt[]
): (relativePath: string) => string | undefined {
  const files = new Map(
    list.map((entry) => [
      firmEditReceiptPath(
        entry.requirementId,
        entry.sourceFile,
        entry.symbol,
      ) as string,
      serializeFirmEditReceipt(entry),
    ]),
  );
  return (relativePath) => files.get(relativePath);
}

function gate(
  symbols: ExtractedSymbol[],
  options: {
    requirements?: Record<string, ExtractedEntity>;
    readReceipt?: (relativePath: string) => string | undefined;
    changed?: readonly string[];
    content?: string | undefined;
  } = {},
) {
  const requirements = options.requirements ?? {
    "REQ-key-expiry": req("REQ-key-expiry"),
  };
  const files = new Map<string, ExtractedSymbol[]>();
  for (const entry of symbols) {
    const list = files.get(entry.location.file) ?? [];
    list.push(entry);
    files.set(entry.location.file, list);
  }
  return createFirmEditGateDiagnostics({
    symbolsByFile: files,
    readContent: (file) =>
      file === "src/keys.ts"
        ? "content" in options
          ? options.content
          : SOURCE
        : undefined,
    readRequirement: (id) => requirements[id],
    requirementChanged: (requirement) =>
      (options.changed ?? []).includes(requirement.id),
    readReceipt: options.readReceipt ?? (() => undefined),
  });
}

describe("helpers", () => {
  test("implementedRequirementIds reads manifest links and implements edges once", () => {
    expect(
      implementedRequirementIds(
        symbol("f", {
          reqLinks: ["REQ-a", "SCEN-x"],
          relationships: [
            { type: "implements", to: "REQ-b" },
            { type: "implements", to: "REQ-a" },
            { type: "covered_by", to: "REQ-c" },
          ],
        }),
      ),
    ).toEqual(["REQ-a", "REQ-b"]);
    expect(implementedRequirementIds(symbol("f", { reqLinks: [] }))).toEqual(
      [],
    );
  });

  test("the statement is the semantic text, else the title", () => {
    expect(requirementStatement(req("REQ-a"))).toBe(STATEMENT);
    expect(
      requirementStatement(req("REQ-a", { semantic_text: undefined })),
    ).toBe("Title of REQ-a");
  });

  test("only a current firm requirement is gated", () => {
    expect(isCurrentFirmRequirement(req("REQ-a"))).toBe(true);
    expect(
      isCurrentFirmRequirement(
        req("REQ-a", { firmness: "firm", origin: { kind: "agent" } }),
      ),
    ).toBe(true);
    expect(
      isCurrentFirmRequirement(req("REQ-a", { origin: { kind: "agent" } })),
    ).toBe(false);
    expect(
      isCurrentFirmRequirement(req("REQ-a", { firmness: "default" })),
    ).toBe(false);
    for (const status of ["superseded", "closed", "deprecated", "Retired"])
      expect(isCurrentFirmRequirement(req("REQ-a", { status }))).toBe(false);
    expect(
      isCurrentFirmRequirement(
        req("REQ-a", { status: undefined as unknown as string }),
      ),
    ).toBe(true);
    expect(isCurrentFirmRequirement(req("ADR-a", { type: "adr" }))).toBe(false);
  });
});

describe("reviewState", () => {
  const state = (
    readReceipt: (relativePath: string) => string | undefined,
    target: ExtractedSymbol = symbol("expireKey"),
    content: string | undefined = SOURCE,
    statement = STATEMENT,
  ) =>
    reviewState({
      requirementId: "REQ-key-expiry",
      statement,
      symbol: target,
      content,
      readReceipt,
    }).state;
  const expire = symbol("expireKey");

  test("reads the receipt the symbol's path names", () => {
    expect(state(receipts(receipt(expire)))).toBe("kept");
    expect(state(receipts(receipt(expire, { verdict: "changes" })))).toBe(
      "changes",
    );
    expect(state(() => undefined)).toBe("missing");
    expect(state(() => "not json")).toBe("missing");
  });

  test("a receipt for another requirement, file or symbol is missing", () => {
    const file = firmEditReceiptPath(
      "REQ-key-expiry",
      "src/keys.ts",
      "expireKey",
    );
    for (const other of [
      receipt(expire, { requirementId: "REQ-other" }),
      receipt(expire, { sourceFile: "src/other.ts" }),
      receipt(expire, { symbol: "renderKey" }),
    ]) {
      const text = serializeFirmEditReceipt(other);
      expect(
        state((relativePath) => (relativePath === file ? text : undefined)),
      ).toBe("missing");
    }
  });

  test("a changed statement or code makes the receipt stale", () => {
    expect(
      state(receipts(receipt(expire)), expire, SOURCE, "Keys never expire."),
    ).toBe("statement-changed");
    expect(
      state(receipts(receipt(expire)), expire, SOURCE.replace("90", "91")),
    ).toBe("code-changed");
    // Moved code keeps its hash; the current span is what is hashed.
    const moved = symbol("expireKey", {
      location: { file: "src/keys.ts", startLine: 2, endLine: 4 },
    });
    expect(state(receipts(receipt(expire)), moved, `\n${SOURCE}`)).toBe("kept");
    // Without the text, the code cannot be shown to be the reviewed code.
    expect(
      reviewState({
        requirementId: "REQ-key-expiry",
        statement: STATEMENT,
        symbol: expire,
        content: undefined,
        readReceipt: receipts(receipt(expire)),
      }).state,
    ).toBe("code-changed");
    const outside = symbol("expireKey", {
      location: { file: "src/keys.ts", startLine: 1, endLine: 99 },
    });
    expect(state(receipts(receipt(expire)), outside)).toBe("code-changed");
  });
});

describe("createFirmEditGateDiagnostics", () => {
  test("blocks an edit of firm code that has no review, naming the call to make", () => {
    const [diagnostic, ...rest] = gate([
      symbol("expireKey"),
      { ...RENDER, reqLinks: ["REQ-key-expiry"] },
    ]);
    expect(rest).toEqual([]);
    expect(diagnostic).toEqual({
      id: "firm_edit_unreviewed",
      severity: "error",
      blocking: true,
      category: "requirement",
      entityId: "REQ-key-expiry",
      files: ["src/keys.ts"],
      docs: ["docs/entity-schema.md"],
      message: `The change edits code that implements REQ-key-expiry, a firm rule the person set, without a current review of that code: expireKey in src/keys.ts (no review recorded); renderKey in src/keys.ts (no review recorded). Statement: "${STATEMENT}"`,
      suggestion:
        'Read the changed code against REQ-key-expiry. If it still does what REQ-key-expiry says, record that with kb_review_firm_edit (CLI: kibi review-firm-edit) and verdict "keeps" and a one-line note; this receipt is the agent\'s judgment, not the person\'s approval. If it no longer does, record verdict "changes" and ask the person before keeping the change.',
      evidence: {
        requirement: "REQ-key-expiry",
        statement: STATEMENT,
        reviews: [
          { sourceFile: "src/keys.ts", symbol: "expireKey", state: "missing" },
          { sourceFile: "src/keys.ts", symbol: "renderKey", state: "missing" },
        ],
        reviewInput: {
          reviews: [
            {
              requirementId: "REQ-key-expiry",
              sourceFile: "src/keys.ts",
              symbol: "expireKey",
            },
            {
              requirementId: "REQ-key-expiry",
              sourceFile: "src/keys.ts",
              symbol: "renderKey",
            },
          ],
        },
      },
    });
  });

  test("a current keeps receipt for every edited symbol clears it", () => {
    const expire = symbol("expireKey");
    expect(gate([expire], { readReceipt: receipts(receipt(expire)) })).toEqual(
      [],
    );
    const stillOpen = gate([expire, RENDER], {
      readReceipt: receipts(receipt(expire)),
    });
    expect(stillOpen.map((entry) => entry.message)).toEqual([
      `The change edits code that implements REQ-key-expiry, a firm rule the person set, without a current review of that code: renderKey in src/keys.ts (no review recorded). Statement: "${STATEMENT}"`,
    ]);
  });

  test("names why each review no longer counts", () => {
    const expire = symbol("expireKey");
    const stale = gate([expire, RENDER], {
      readReceipt: receipts(
        receipt(expire, { codeHash: "sha256:old" }),
        receipt(RENDER, { statementHash: "sha256:old" }),
      ),
    });
    expect(stale[0]?.message).toContain(
      "expireKey in src/keys.ts (the code changed after the review); renderKey in src/keys.ts (the requirement changed after the review).",
    );
    expect(stale[0]?.evidence?.reviews).toEqual([
      { sourceFile: "src/keys.ts", symbol: "expireKey", state: "code-changed" },
      {
        sourceFile: "src/keys.ts",
        symbol: "renderKey",
        state: "statement-changed",
      },
    ]);
  });

  test("a changes verdict keeps it blocked until the rule is superseded", () => {
    const expire = symbol("expireKey");
    const [diagnostic] = gate([expire, RENDER], {
      readReceipt: receipts(receipt(expire, { verdict: "changes" })),
    });
    expect(diagnostic?.id).toBe("firm_edit_breaks_rule");
    expect(diagnostic?.blocking).toBe(true);
    expect(diagnostic?.message).toBe(
      `The change edits code that implements REQ-key-expiry, a firm rule the person set, and the recorded review says the change breaks it: expireKey in src/keys.ts (reviewed as changing the rule); renderKey in src/keys.ts (no review recorded). Statement: "${STATEMENT}"`,
    );
    expect(diagnostic?.suggestion).toBe(
      "Ask the person whether REQ-key-expiry should change. With their words, supersede REQ-key-expiry with kb_upsert (a new requirement with a supersedes link and their words in origin.ref) in this change; otherwise undo the edit.",
    );
  });

  test("judges only changed behavioral code of current firm requirements", () => {
    expect(gate([symbol("expireKey", { role: "structural" })])).toEqual([]);
    expect(gate([symbol("expireKey", { hunkRanges: [] })])).toEqual([]);
    expect(gate([symbol("expireKey", { reqLinks: ["REQ-unknown"] })])).toEqual(
      [],
    );
    expect(
      gate([symbol("expireKey")], {
        requirements: {
          "REQ-key-expiry": req("REQ-key-expiry", { firmness: "default" }),
        },
      }),
    ).toEqual([]);
    // A requirement rewritten in the same change is left to the firmness
    // and supersede checks.
    expect(
      gate([symbol("expireKey")], { changed: ["REQ-key-expiry"] }),
    ).toEqual([]);
  });

  test("one diagnostic per requirement, in id order, with sorted symbols and files", () => {
    const requirements = {
      "REQ-b": req("REQ-b"),
      "REQ-a": req("REQ-a", { semantic_text: "  Keys   rotate.\n" }),
    };
    const other = symbol("zeta", {
      reqLinks: ["REQ-a"],
      location: { file: "src/a.ts", startLine: 1, endLine: 1 },
    });
    const diagnostics = gate(
      [symbol("expireKey", { reqLinks: ["REQ-b", "REQ-a"] }), other],
      { requirements },
    );
    expect(diagnostics.map((entry) => entry.entityId)).toEqual([
      "REQ-a",
      "REQ-b",
    ]);
    expect(diagnostics[0]?.files).toEqual(["src/a.ts", "src/keys.ts"]);
    expect(diagnostics[0]?.message).toBe(
      'The change edits code that implements REQ-a, a firm rule the person set, without a current review of that code: zeta in src/a.ts (no review recorded); expireKey in src/keys.ts (no review recorded). Statement: "Keys rotate."',
    );
    expect(diagnostics[0]?.evidence?.statement).toBe("Keys rotate.");
  });
});
