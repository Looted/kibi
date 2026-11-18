import { describe, expect, test } from "bun:test";
import {
  FIRM_EDIT_RECEIPT_VERSION,
  FIRM_EDIT_REMOVED_CODE_HASH,
  type FirmEditReceipt,
  firmEditCodeHash,
  firmEditReceiptPath,
  firmEditStatementHash,
  serializeFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../../src/extractors/markdown.js";
import {
  type FirmEditGateOptions,
  createFirmEditGateDiagnostics,
  firmRequirementRestated,
  firmSymbolEdited,
  implementedRequirementIds,
  isCurrentFirmRequirement,
  removedSymbolRecords,
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
    extra?: Partial<FirmEditGateOptions>;
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
    ...options.extra,
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

  test("the statement is read from the document as the hooks read it, else the semantic text, else the title", () => {
    expect(requirementStatement(req("REQ-a"))).toBe(STATEMENT);
    expect(
      requirementStatement(req("REQ-a", { semantic_text: undefined })),
    ).toBe("Title of REQ-a");
    expect(
      requirementStatement(
        req("REQ-a"),
        "---\nsemantic_text: >-\n  One.\n\n  Two.\n---\n",
      ),
    ).toBe("One. Two.");
    expect(requirementStatement(req("REQ-a"), "no front matter")).toBe(
      STATEMENT,
    );
  });

  test("a requirement is restated only by a new statement, status or supersede", () => {
    const doc = (text: string) => `---\nsemantic_text: ${text}\n---\n`;
    const restated = (
      extra: Partial<Parameters<typeof firmRequirementRestated>[0]>,
    ) =>
      firmRequirementRestated({
        requirement: req("REQ-a"),
        documentText: `${doc(STATEMENT)}\n## Notes\n\nA note.\n`,
        baseText: doc(STATEMENT),
        baseStatus: "open",
        supersededInChange: false,
        ...extra,
      });
    // A note, tag or link is not a restatement.
    expect(restated({})).toBe(false);
    expect(restated({ baseText: doc("Keys never expire.") })).toBe(true);
    expect(restated({ baseStatus: "draft" })).toBe(true);
    expect(restated({ baseText: undefined })).toBe(true);
    expect(restated({ supersededInChange: true })).toBe(true);
  });

  test("a symbol is edited by a line it owns or lines removed inside it", () => {
    const outer = symbol("Store", {
      location: { file: "src/keys.ts", startLine: 1, endLine: 10 },
      hunkRanges: [],
    });
    const inner = symbol("rotate", {
      location: { file: "src/keys.ts", startLine: 3, endLine: 6 },
      hunkRanges: [],
    });
    const twin = symbol("twin", {
      location: { file: "src/keys.ts", startLine: 1, endLine: 10 },
      hunkRanges: [],
    });
    const all = [outer, inner, twin];
    expect(firmSymbolEdited(symbol("f"), all, [])).toBe(true);
    expect(firmSymbolEdited(outer, all, [])).toBe(false);
    // Lines removed between lines 1 and 2 are inside Store, outside rotate.
    expect(firmSymbolEdited(outer, all, [1])).toBe(true);
    expect(firmSymbolEdited(inner, all, [1])).toBe(false);
    // Removed between lines 4 and 5: inside rotate, so not Store's own.
    expect(firmSymbolEdited(inner, all, [4])).toBe(true);
    expect(firmSymbolEdited(outer, all, [4])).toBe(false);
    // After the last line or before the first is outside.
    expect(firmSymbolEdited(inner, all, [6])).toBe(false);
    expect(firmSymbolEdited(inner, all, [2])).toBe(false);
    // A twin with the same span is not nested.
    expect(firmSymbolEdited(outer, all, [8])).toBe(true);
  });

  test("removed symbol records are those the current knowledge lacks, with what they implemented", () => {
    const record = (
      id: string,
      relationships: ExtractionResult["relationships"],
      extra: Partial<ExtractionResult> = {},
    ): ExtractionResult => ({
      entity: {
        id,
        type: "symbol",
        title: id.replace("SYM-", ""),
        source: ".kb/symbols.yaml",
      } as ExtractedEntity,
      relationships,
      sourceFile: "src/keys.ts",
      ...extra,
    });
    const implementsReq = (to: string) => ({
      type: "implements",
      from: "x",
      to,
    });
    const base = [
      record("SYM-kept", [implementsReq("REQ-a")]),
      record("SYM-gone", [
        implementsReq("REQ-a"),
        implementsReq("REQ-a"),
        implementsReq("TEST-x"),
        { type: "covered_by", from: "x", to: "REQ-b" },
      ]),
      record("SYM-unlinked", [{ type: "covered_by", from: "x", to: "TEST-a" }]),
      record("SYM-nofile", [implementsReq("REQ-c")], { sourceFile: undefined }),
      {
        entity: req("REQ-a"),
        relationships: [implementsReq("REQ-b")],
      } as ExtractionResult,
    ];
    expect(
      removedSymbolRecords(base, [
        record("SYM-kept", []),
        { entity: req("SYM-gone"), relationships: [] } as ExtractionResult,
      ]),
    ).toEqual([
      { sourceFile: "src/keys.ts", symbol: "gone", requirementIds: ["REQ-a"] },
      {
        sourceFile: ".kb/symbols.yaml",
        symbol: "nofile",
        requirementIds: ["REQ-c"],
      },
    ]);
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
    for (const status of ["superseded", "deprecated", "Retired", "archived"])
      expect(isCurrentFirmRequirement(req("REQ-a", { status }))).toBe(false);
    // A closed requirement is done and still governs, as the hooks treat it.
    expect(isCurrentFirmRequirement(req("REQ-a", { status: "closed" }))).toBe(
      true,
    );
    expect(
      isCurrentFirmRequirement(
        req("REQ-a", { status: undefined as unknown as string }),
      ),
    ).toBe(true);
    expect(isCurrentFirmRequirement(req("ADR-a", { type: "adr" }))).toBe(false);
  });
});

describe("reviewState", () => {
  const expire = symbol("expireKey");
  const hashOf = (target: ExtractedSymbol, content = SOURCE) =>
    firmEditCodeHash(
      content,
      target.location.startLine,
      target.location.endLine,
    );
  const state = (
    readReceipt: (relativePath: string) => string | undefined,
    codeHash: string | undefined = hashOf(expire),
    statement = STATEMENT,
  ) =>
    reviewState({
      requirementId: "REQ-key-expiry",
      statement,
      sourceFile: "src/keys.ts",
      symbol: "expireKey",
      codeHash,
      readReceipt,
    }).state;

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
      state(receipts(receipt(expire)), hashOf(expire), "Keys never expire."),
    ).toBe("statement-changed");
    expect(
      state(
        receipts(receipt(expire)),
        hashOf(expire, SOURCE.replace("90", "91")),
      ),
    ).toBe("code-changed");
    // Without the code, it cannot be shown to be the reviewed code.
    expect(
      reviewState({
        requirementId: "REQ-key-expiry",
        statement: STATEMENT,
        sourceFile: "src/keys.ts",
        symbol: "expireKey",
        codeHash: undefined,
        readReceipt: receipts(receipt(expire)),
      }).state,
    ).toBe("code-changed");
  });

  test("a removed symbol matches only a receipt recorded for its removal", () => {
    const removedReceipt = receipt(expire, {
      codeHash: FIRM_EDIT_REMOVED_CODE_HASH,
      startLine: 0,
      endLine: 0,
    });
    expect(state(receipts(removedReceipt), FIRM_EDIT_REMOVED_CODE_HASH)).toBe(
      "kept",
    );
    expect(state(receipts(receipt(expire)), FIRM_EDIT_REMOVED_CODE_HASH)).toBe(
      "code-changed",
    );
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
      suggestion: `Read the changed code against REQ-key-expiry. If it still does what REQ-key-expiry says, write a one-line note on why into this input and send it to kb_review_firm_edit (without MCP: pipe it to kibi review-firm-edit --input -), then stage the receipt it writes: ${JSON.stringify(
        {
          reviews: [
            {
              requirementId: "REQ-key-expiry",
              sourceFile: "src/keys.ts",
              symbol: "expireKey",
              verdict: "keeps",
              note: "",
            },
            {
              requirementId: "REQ-key-expiry",
              sourceFile: "src/keys.ts",
              symbol: "renderKey",
              verdict: "keeps",
              note: "",
            },
          ],
        },
      )}. The receipt is your judgment, not the person's approval. If the change no longer does what REQ-key-expiry says, set verdict "changes" and ask the person before keeping the change.`,
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
              verdict: "keeps",
              note: "",
            },
            {
              requirementId: "REQ-key-expiry",
              sourceFile: "src/keys.ts",
              symbol: "renderKey",
              verdict: "keeps",
              note: "",
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
      // The statement is quoted with its whitespace collapsed.
      requirements: {
        "REQ-key-expiry": req("REQ-key-expiry", {
          semantic_text: ` ${STATEMENT.replace("expire ", "expire \n  ")}`,
        }),
      },
    });
    expect(diagnostic?.id).toBe("firm_edit_breaks_rule");
    // Two symbols of one file name it once.
    expect(diagnostic?.files).toEqual(["src/keys.ts"]);
    expect(diagnostic?.blocking).toBe(true);
    expect(diagnostic?.message).toBe(
      `The change edits code that implements REQ-key-expiry, a firm rule the person set, and the recorded review says the change breaks it: expireKey in src/keys.ts (reviewed as changing the rule); renderKey in src/keys.ts (no review recorded). Statement: "${STATEMENT}"`,
    );
    expect(diagnostic?.suggestion).toBe(
      "Ask the person whether REQ-key-expiry should change. With their words, supersede REQ-key-expiry with kb_upsert (a new requirement with a supersedes link and their words in origin.ref) in this change; otherwise undo the edit.",
    );
  });

  test("judges any changed code of current firm requirements, whatever its role", () => {
    for (const role of ["structural", "unknown"] as const)
      expect(
        gate([symbol("KEY_MAX_AGE", { role, kind: "variable" })]).map(
          (entry) => entry.id,
        ),
      ).toEqual(["firm_edit_unreviewed"]);
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

  test("lines removed inside a symbol edit it", () => {
    const expire = symbol("expireKey", { hunkRanges: [] });
    expect(
      gate([expire], {
        extra: { deletedAfterByFile: new Map([["src/keys.ts", [1]]]) },
      }).map((entry) => entry.id),
    ).toEqual(["firm_edit_unreviewed"]);
    expect(
      gate([expire], {
        extra: { deletedAfterByFile: new Map([["src/other.ts", [1]]]) },
      }),
    ).toEqual([]);
  });

  test("a removed symbol record that implemented a firm rule needs a review of its removal", () => {
    const removed = {
      sourceFile: "src/keys.ts",
      symbol: "expireKey",
      requirementIds: ["REQ-key-expiry"],
    };
    const [diagnostic] = gate([], { extra: { removedSymbols: [removed] } });
    expect(diagnostic?.message).toContain(
      "expireKey in src/keys.ts (removed, no review recorded)",
    );
    expect(diagnostic?.evidence?.reviewInput).toEqual({
      reviews: [
        {
          requirementId: "REQ-key-expiry",
          sourceFile: "src/keys.ts",
          symbol: "expireKey",
          verdict: "keeps",
          note: "",
        },
      ],
    });
    expect(
      gate([], {
        extra: { removedSymbols: [removed] },
        readReceipt: receipts(
          receipt(symbol("expireKey"), {
            codeHash: FIRM_EDIT_REMOVED_CODE_HASH,
            startLine: 0,
            endLine: 0,
          }),
        ),
      }),
    ).toEqual([]);
    // One symbol reached twice is reviewed once.
    expect(
      gate([symbol("expireKey")], {
        extra: { removedSymbols: [removed] },
      })[0]?.evidence?.reviews,
    ).toHaveLength(1);
  });

  test("files with unstaged edits get a staged review input", () => {
    const [diagnostic] = gate(
      [
        symbol("expireKey"),
        symbol("zeta", {
          location: { file: "src/a.ts", startLine: 1, endLine: 1 },
        }),
      ],
      { extra: { hasUnstagedChanges: () => true } },
    );
    expect(diagnostic?.evidence?.reviewInput).toMatchObject({ staged: true });
    expect(diagnostic?.suggestion).toContain(
      'src/a.ts, src/keys.ts also have unstaged edits, so the input records the staged code ("staged": true).',
    );
    const [single] = gate([symbol("expireKey")], {
      extra: { hasUnstagedChanges: (file) => file === "src/keys.ts" },
    });
    expect(single?.suggestion).toContain(
      'src/keys.ts also has unstaged edits, so the input records the staged code ("staged": true).',
    );
  });

  test("the statement comes from the requirement document when it can be read", () => {
    const [diagnostic] = gate([symbol("expireKey")], {
      extra: {
        readRequirementText: () =>
          "---\nsemantic_text: >-\n  Keys expire.\n\n  Always.\n---\n",
      },
    });
    expect(diagnostic?.evidence?.statement).toBe("Keys expire. Always.");
  });
});
