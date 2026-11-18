import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  FIRM_EDIT_REMOVED_CODE_HASH,
  firmEditCodeHash,
  firmEditFileHash,
  firmEditLegacyReceiptPath,
  firmEditReceiptPath,
  firmEditStatementHash,
  parseFirmEditReceipt,
  serializeFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import type { IndexedSymbol } from "kibi-agent-core/knowledge-index";
import { KbRejection } from "../../../src/cli-errors.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import * as maintenance from "../../../src/plugins/maintenance-source-analysis.js";
import {
  type FirmEditReviewEntry,
  REVIEW_FIRM_EDIT_DEPS,
  type ReviewFirmEditDeps,
  executeReviewFirmEdit,
} from "../../../src/public/operations/firm-edit-review.js";
import type { OperationContext } from "../../../src/public/operations/types.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const SOURCE = [
  "export function expireKey(at: number, now: number): boolean {",
  "  return now - at > 90;",
  "}",
  "",
  "export function renderKey(key: string): string {",
  "  return key;",
  "}",
  "",
].join("\n");

const STATEMENT = "API keys must expire ninety days after they are created.";

function write(root: string, file: string, content: string): void {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), content);
}

function requirement(id: string, frontmatter = ""): string {
  return `---\nid: ${id}\ntitle: API keys expire\nstatus: open\nsemantic_text: ${STATEMENT}\n${frontmatter}---\n\n${STATEMENT}\n`;
}

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-firm-edit-review-"));
  roots.push(root);
  write(
    root,
    ".kb/requirements/REQ-key-expiry.md",
    requirement("REQ-key-expiry"),
  );
  write(
    root,
    ".kb/requirements/REQ-agent-pick.md",
    requirement("REQ-agent-pick", "origin:\n  kind: agent\n"),
  );
  write(
    root,
    ".kb/requirements/REQ-old.md",
    requirement("REQ-old").replace("status: open", "status: superseded"),
  );
  write(root, ".kb/requirements/REQ-other.md", requirement("REQ-other"));
  write(root, "src/keys.ts", SOURCE);
  return root;
}

function symbol(
  name: string,
  startLine: number,
  endLine: number,
  reqLinks: string[],
): ExtractedSymbol {
  return {
    id: `SYM-${name}`,
    name,
    kind: "function",
    role: "behavioral",
    location: { file: "src/keys.ts", startLine, endLine },
    hunkRanges: [],
    reqLinks,
  };
}

const SYMBOLS = [
  symbol("expireKey", 1, 3, ["REQ-key-expiry"]),
  symbol("renderKey", 5, 7, ["REQ-key-expiry", "REQ-other"]),
];

const calls: string[] = [];
const deps: ReviewFirmEditDeps = {
  symbolsOf: async (_root, sourceFile, content) => {
    calls.push(`${sourceFile}:${content.length}`);
    return SYMBOLS;
  },
  readStaged: () => undefined,
  indexedSymbols: () => [],
  headKnowledge: () => [],
  readHead: () => undefined,
  now: () => new Date("2026-11-16T10:00:00.000Z"),
};

const receiptFile = (symbolName: string, requirementId = "REQ-key-expiry") =>
  firmEditReceiptPath(requirementId, "src/keys.ts", symbolName) as string;
const receiptName = (symbolName: string) =>
  path.basename(receiptFile(symbolName));

function context(root: string): OperationContext {
  return { workspaceRoot: root } as OperationContext;
}

function entry(extra: Partial<FirmEditReviewEntry> = {}): FirmEditReviewEntry {
  return {
    requirementId: "REQ-key-expiry",
    sourceFile: "src/keys.ts",
    symbol: "expireKey",
    verdict: "keeps",
    note: "Still ninety days.",
    ...extra,
  };
}

async function refusal(
  root: string,
  reviews: FirmEditReviewEntry[],
  withDeps: ReviewFirmEditDeps = deps,
): Promise<string> {
  try {
    await executeReviewFirmEdit({ reviews }, context(root), withDeps);
  } catch (error) {
    expect(error).toBeInstanceOf(KbRejection);
    const rejection = error as KbRejection;
    expect(rejection.code).toBe("VALIDATION_FAILED");
    expect(rejection.issues).toEqual([
      { rule: "firm_edit_review_invalid", field: "reviews" },
    ]);
    return rejection.message;
  }
  throw new Error("expected a refusal");
}

describe("executeReviewFirmEdit", () => {
  test("writes one receipt per entry, bound to the statement and the code", async () => {
    const root = workspace();
    calls.length = 0;
    const result = await executeReviewFirmEdit(
      {
        reviews: [
          entry({
            requirementId: " REQ-key-expiry ",
            sourceFile: "./src/keys.ts",
            symbol: " expireKey ",
            note: "  Still ninety days. ",
            requestQuote: "  fix the off-by-one ",
          }),
          entry({ symbol: "renderKey", verdict: "changes", requestQuote: " " }),
        ],
      },
      context(root),
      deps,
    );
    expect(calls).toEqual([
      `src/keys.ts:${SOURCE.length}`,
      `src/keys.ts:${SOURCE.length}`,
    ]);
    const expirePath = receiptFile("expireKey");
    const renderPath = receiptFile("renderKey");
    const expire = {
      version: 1,
      requirementId: "REQ-key-expiry",
      sourceFile: "src/keys.ts",
      symbol: "expireKey",
      verdict: "keeps",
      note: "Still ninety days.",
      requestQuote: "fix the off-by-one",
      statementHash: firmEditStatementHash(STATEMENT),
      codeHash: firmEditCodeHash(SOURCE, 1, 3),
      startLine: 1,
      endLine: 3,
      recordedAt: "2026-11-16T10:00:00.000Z",
    };
    expect(
      parseFirmEditReceipt(readFileSync(path.join(root, expirePath), "utf8")),
    ).toEqual(expire as never);
    const render = parseFirmEditReceipt(
      readFileSync(path.join(root, renderPath), "utf8"),
    );
    expect(render?.verdict).toBe("changes");
    expect(render?.requestQuote).toBeUndefined();
    expect(render?.codeHash).toBe(firmEditCodeHash(SOURCE, 5, 7) as string);
    expect(
      readdirSync(
        path.join(root, ".kb/firm-edit-reviews/REQ-key-expiry"),
      ).sort(),
    ).toEqual([receiptName("expireKey"), receiptName("renderKey")].sort());
    expect(result.structuredContent).toEqual({
      dryRun: false,
      receipts: [
        { path: expirePath, ...expire },
        { path: renderPath, ...(render as object) },
      ],
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: [
          "Recorded 2 firm-edit reviews: REQ-key-expiry keeps (expireKey in src/keys.ts); REQ-key-expiry changes (renderKey in src/keys.ts).",
          "A receipt is the agent's judgment, not the person's approval; it stops matching when the requirement or the code changes.",
          'A "changes" verdict keeps kibi check --staged blocked until the requirement is superseded with the person\'s words: ask them about REQ-key-expiry.',
        ].join("\n"),
      },
    ]);
  });

  test("names each requirement a changes verdict leaves blocked once", async () => {
    const root = workspace();
    const result = await executeReviewFirmEdit(
      {
        dryRun: true,
        reviews: [
          entry({ verdict: "changes" }),
          entry({ symbol: "renderKey", verdict: "changes" }),
          entry({
            requirementId: "REQ-other",
            symbol: "renderKey",
            verdict: "changes",
          }),
        ],
      },
      context(root),
      deps,
    );
    expect(result.content[0]?.text).toEndWith(
      "ask them about REQ-key-expiry, REQ-other.",
    );
  });

  test("a second review of the same symbol replaces the first", async () => {
    const root = workspace();
    await executeReviewFirmEdit({ reviews: [entry()] }, context(root), deps);
    await executeReviewFirmEdit(
      { reviews: [entry({ note: "Rechecked." })] },
      context(root),
      deps,
    );
    const file = path.join(root, receiptFile("expireKey"));
    expect(parseFirmEditReceipt(readFileSync(file, "utf8"))?.note).toBe(
      "Rechecked.",
    );
    expect(readdirSync(path.dirname(file))).toEqual([receiptName("expireKey")]);
  });

  test("a review replaces the receipt an earlier release wrote for the pair", async () => {
    const root = workspace();
    const legacy = firmEditLegacyReceiptPath(
      "REQ-key-expiry",
      "src/keys.ts",
      "expireKey",
    ) as string;
    const legacyRender = firmEditLegacyReceiptPath(
      "REQ-key-expiry",
      "src/keys.ts",
      "renderKey",
    ) as string;
    const old = {
      version: 1 as const,
      requirementId: "REQ-key-expiry",
      sourceFile: "src/keys.ts",
      symbol: "expireKey",
      verdict: "keeps" as const,
      note: "old",
      statementHash: "sha256:old",
      codeHash: "sha256:old",
      startLine: 1,
      endLine: 3,
      recordedAt: "2026-11-01T00:00:00.000Z",
    };
    write(root, legacy, serializeFirmEditReceipt(old));
    // A legacy file holding another pair's receipt is left alone.
    write(
      root,
      legacyRender,
      serializeFirmEditReceipt({ ...old, sourceFile: "src/key_s.ts" }),
    );
    await executeReviewFirmEdit(
      { reviews: [entry(), entry({ symbol: "renderKey" })] },
      context(root),
      deps,
    );
    expect(existsSync(path.join(root, legacy))).toBe(false);
    expect(existsSync(path.join(root, legacyRender))).toBe(true);
    expect(existsSync(path.join(root, receiptFile("expireKey")))).toBe(true);
  });

  test("a source path too long for one flat file name still gets a receipt", async () => {
    const root = workspace();
    const long = `src/${"a".repeat(120)}/${"b".repeat(140)}/keys.ts`;
    write(root, long, SOURCE);
    const result = await executeReviewFirmEdit(
      { reviews: [entry({ sourceFile: long })] },
      context(root),
      deps,
    );
    const written = (
      result.structuredContent as { receipts: { path: string }[] }
    ).receipts[0]?.path as string;
    expect(written).toBe(
      firmEditReceiptPath("REQ-key-expiry", long, "expireKey") as string,
    );
    expect(existsSync(path.join(root, written))).toBe(true);
  });

  test("a coarse symbol is bound to its whole file, as the commit gate judges it", async () => {
    const root = workspace();
    const coarse = (extra: Partial<IndexedSymbol>): ReviewFirmEditDeps => ({
      ...deps,
      indexedSymbols: (_root, sourceFile) =>
        sourceFile === "src/keys.ts" || sourceFile === "src/gone.ts"
          ? [
              {
                id: "SYM-keys-module",
                title: "keys module",
                implements: ["REQ-key-expiry"],
                coveredBy: [],
                executableFor: [],
                ...extra,
              },
            ]
          : [],
    });
    for (const extra of [{ line: 5, endLine: 7 }, { line: 5 }, {}]) {
      const result = await executeReviewFirmEdit(
        { reviews: [entry({ symbol: "keys module" })] },
        context(root),
        coarse(extra),
      );
      expect(
        (result.structuredContent as { receipts: Record<string, unknown>[] })
          .receipts[0],
      ).toMatchObject({
        symbol: "keys module",
        codeHash: firmEditFileHash(SOURCE),
        startLine: 1,
        endLine: SOURCE.split("\n").length,
      });
    }
    // A file the workspace removed is reviewed as removed when HEAD has it,
    // and cannot be read otherwise.
    const gone = (head: string | undefined) => ({
      ...coarse({}),
      readHead: (_root: string, file: string) =>
        file === "src/gone.ts" ? head : undefined,
    });
    const removed = await executeReviewFirmEdit(
      {
        reviews: [entry({ symbol: "keys module", sourceFile: "src/gone.ts" })],
      },
      context(root),
      gone("{}\n"),
    );
    expect(
      (removed.structuredContent as { receipts: Record<string, unknown>[] })
        .receipts[0],
    ).toMatchObject({
      codeHash: FIRM_EDIT_REMOVED_CODE_HASH,
      startLine: 0,
      endLine: 0,
    });
    expect(
      await refusal(
        root,
        [entry({ symbol: "keys module", sourceFile: "src/gone.ts" })],
        gone(undefined),
      ),
    ).toBe("src/gone.ts cannot be read.");
    expect(await refusal(root, [entry({ symbol: "other" })], coarse({}))).toBe(
      "other in src/keys.ts does not implement REQ-key-expiry. Symbols there that implement it: expireKey, renderKey, keys module.",
    );
  });

  test("refuses a binary or non-UTF-8 source file", async () => {
    const root = workspace();
    for (const text of [`${SOURCE}// caf\uFFFD\n`, `${SOURCE}\u0000`]) {
      write(root, "src/keys.ts", text);
      expect(await refusal(root, [entry()])).toBe(
        "src/keys.ts is binary or not UTF-8 text, so Kibi cannot read the firm code in it; restore it as UTF-8 source before recording a review.",
      );
    }
  });

  test("a symbol the workspace removed since HEAD is reviewed as removed", async () => {
    const root = workspace();
    const record = (
      title: string,
      sourceFile: string,
      to = "REQ-key-expiry",
    ): ExtractionResult =>
      ({
        entity: {
          id: `SYM-${title}`,
          type: "symbol",
          title,
          source: ".kb/symbols.yaml",
        },
        relationships: [{ type: "implements", from: `SYM-${title}`, to }],
        sourceFile,
      }) as ExtractionResult;
    const removed: ReviewFirmEditDeps = {
      ...deps,
      headKnowledge: () => [
        record("dropKey", "src/keys.ts"),
        record("goneFile", "src/gone.ts"),
        record("otherRule", "src/keys.ts", "REQ-other"),
      ],
    };
    const result = await executeReviewFirmEdit(
      {
        reviews: [
          entry({ symbol: "dropKey" }),
          entry({ symbol: "goneFile", sourceFile: "src/gone.ts" }),
        ],
      },
      context(root),
      removed,
    );
    expect(
      (
        result.structuredContent as { receipts: Record<string, unknown>[] }
      ).receipts.map((receipt) => [
        receipt.symbol,
        receipt.codeHash,
        receipt.startLine,
        receipt.endLine,
      ]),
    ).toEqual([
      ["dropKey", FIRM_EDIT_REMOVED_CODE_HASH, 0, 0],
      ["goneFile", FIRM_EDIT_REMOVED_CODE_HASH, 0, 0],
    ]);
    // A record HEAD has for another requirement, or another file, is not it.
    expect(
      await refusal(root, [entry({ symbol: "otherRule" })], removed),
    ).toContain("otherRule in src/keys.ts does not implement REQ-key-expiry.");
    expect(
      await refusal(
        root,
        [entry({ symbol: "dropKey", sourceFile: "src/gone.ts" })],
        removed,
      ),
    ).toBe("src/gone.ts cannot be read.");
  });

  test("a declaration the HEAD file has and the file no longer declares is reviewed as removed", async () => {
    const root = workspace();
    const head = "export function oldKey() {}\n";
    const asked: string[] = [];
    const moved: ReviewFirmEditDeps = {
      ...deps,
      symbolsOf: async (_root, _file, content) =>
        content === head ? [symbol("oldKey", 1, 1, [])] : SYMBOLS,
      readHead: (_root, file) => {
        asked.push(file);
        return head;
      },
    };
    const result = await executeReviewFirmEdit(
      { reviews: [entry({ symbol: "oldKey" })] },
      context(root),
      moved,
    );
    expect(
      (
        result.structuredContent as { receipts: Record<string, unknown>[] }
      ).receipts.map((receipt) => [
        receipt.symbol,
        receipt.codeHash,
        receipt.startLine,
        receipt.endLine,
      ]),
    ).toEqual([["oldKey", FIRM_EDIT_REMOVED_CODE_HASH, 0, 0]]);
    expect(asked).toEqual(["src/keys.ts"]);
    // A name HEAD's file does not declare either, or a file HEAD lacks, is
    // still refused.
    expect(
      await refusal(root, [entry({ symbol: "neverKey" })], moved),
    ).toContain("neverKey in src/keys.ts does not implement REQ-key-expiry.");
    expect(
      await refusal(root, [entry({ symbol: "oldKey" })], {
        ...moved,
        readHead: () => undefined,
      }),
    ).toContain("oldKey in src/keys.ts does not implement REQ-key-expiry.");
    // A name the file still declares, for another requirement, is not removed.
    asked.length = 0;
    expect(
      await refusal(root, [entry({ symbol: "renderKey" })], {
        ...moved,
        symbolsOf: async () => [symbol("renderKey", 5, 7, ["REQ-other"])],
      }),
    ).toContain("renderKey in src/keys.ts does not implement REQ-key-expiry.");
    expect(asked).toEqual([]);
  });

  test("staged reviews read the code and the requirement from the index", async () => {
    const root = workspace();
    const staged = SOURCE.replace("90", "91");
    const read: string[] = [];
    const fromIndex: ReviewFirmEditDeps = {
      ...deps,
      readStaged: (_root, file) => {
        read.push(file);
        return file === "src/keys.ts"
          ? staged
          : requirement("REQ-key-expiry").replace(
              `semantic_text: ${STATEMENT}`,
              "semantic_text: Keys expire in the index.",
            );
      },
    };
    const result = await executeReviewFirmEdit(
      { staged: true, reviews: [entry()] },
      context(root),
      fromIndex,
    );
    expect(read).toEqual(["src/keys.ts", ".kb/requirements/REQ-key-expiry.md"]);
    expect(
      (result.structuredContent as { receipts: Record<string, unknown>[] })
        .receipts[0],
    ).toMatchObject({
      codeHash: firmEditCodeHash(staged, 1, 3),
      statementHash: firmEditStatementHash("Keys expire in the index."),
    });
  });

  test("a dry run previews the receipts and writes nothing", async () => {
    const root = workspace();
    const result = await executeReviewFirmEdit(
      { reviews: [entry()], dryRun: true },
      context(root),
      deps,
    );
    expect(existsSync(path.join(root, ".kb/firm-edit-reviews"))).toBe(false);
    expect((result.structuredContent as { dryRun: boolean }).dryRun).toBe(true);
    expect(result.content[0]?.text).toBe(
      [
        "Would record 1 firm-edit review: REQ-key-expiry keeps (expireKey in src/keys.ts).",
        "A receipt is the agent's judgment, not the person's approval; it stops matching when the requirement or the code changes.",
      ].join("\n"),
    );
  });

  test("refuses a requirement that is unknown, not firm or not current", async () => {
    const root = workspace();
    expect(await refusal(root, [entry({ requirementId: "REQ-none" })])).toBe(
      "REQ-none is not a requirement in .kb/requirements.",
    );
    expect(
      await refusal(root, [entry({ requirementId: "REQ-agent-pick" })]),
    ).toBe(
      "REQ-agent-pick is not a current firm requirement, so an edit of its code needs no review.",
    );
    expect(await refusal(root, [entry({ requirementId: "REQ-old" })])).toBe(
      "REQ-old is not a current firm requirement, so an edit of its code needs no review.",
    );
    // A closed requirement a current one supersedes no longer guards.
    write(
      root,
      ".kb/requirements/REQ-key-expiry.md",
      requirement("REQ-key-expiry").replace("status: open", "status: closed"),
    );
    write(
      root,
      ".kb/requirements/REQ-key-expiry-v2.md",
      requirement("REQ-key-expiry-v2").replace(
        "status: open",
        "status: open\nlinks:\n  - type: supersedes\n    target: REQ-key-expiry",
      ),
    );
    expect(await refusal(root, [entry()])).toBe(
      "REQ-key-expiry is superseded by REQ-key-expiry-v2, so it no longer guards its code; review the edit against REQ-key-expiry-v2 if that one is firm.",
    );
  });

  test("refuses a file outside the workspace or one it cannot read", async () => {
    const root = workspace();
    expect(await refusal(root, [entry({ sourceFile: "../keys.ts" })])).toBe(
      "../keys.ts is not a file inside the workspace.",
    );
    const outside = mkdtempSync(path.join(tmpdir(), "kibi-outside-"));
    roots.push(outside);
    write(outside, "keys.ts", SOURCE);
    symlinkSync(path.join(outside, "keys.ts"), path.join(root, "src/link.ts"));
    expect(await refusal(root, [entry({ sourceFile: "src/link.ts" })])).toBe(
      "src/link.ts is not a file inside the workspace.",
    );
    expect(await refusal(root, [entry({ sourceFile: "src/gone.ts" })])).toBe(
      "src/gone.ts cannot be read.",
    );
  });

  test("refuses a symbol that does not implement the requirement, naming those that do", async () => {
    const root = workspace();
    expect(await refusal(root, [entry({ symbol: "expire" })])).toBe(
      "expire in src/keys.ts does not implement REQ-key-expiry. Symbols there that implement it: expireKey, renderKey.",
    );
    write(root, ".kb/requirements/REQ-other.md", requirement("REQ-other"));
    expect(
      await refusal(root, [
        entry({ requirementId: "REQ-other", symbol: "expireKey" }),
      ]),
    ).toBe(
      "expireKey in src/keys.ts does not implement REQ-other. Symbols there that implement it: renderKey.",
    );
    write(root, ".kb/requirements/REQ-free.md", requirement("REQ-free"));
    expect(await refusal(root, [entry({ requirementId: "REQ-free" })])).toBe(
      "expireKey in src/keys.ts does not implement REQ-free. No symbol in src/keys.ts implements REQ-free.",
    );
  });

  test("refuses an empty note and two reviews of one symbol, writing nothing", async () => {
    const root = workspace();
    expect(
      await refusal(root, [
        entry(),
        entry({ symbol: "renderKey", note: "  " }),
      ]),
    ).toBe(
      "The review of renderKey for REQ-key-expiry needs a note saying why the change keeps or changes the rule.",
    );
    expect(await refusal(root, [entry(), entry({ verdict: "changes" })])).toBe(
      `Two reviews name the same requirement and symbol (${receiptFile("expireKey")}).`,
    );
    expect(existsSync(path.join(root, ".kb/firm-edit-reviews"))).toBe(false);
  });

  test("the default deps analyze the file with the workspace's analysis service", async () => {
    const root = workspace();
    const extra = `${SOURCE}export function extraKey(): number {\n  return 1;\n}\n`;
    const workspaceAnalysis = await maintenance
      .createMaintenanceSourceAnalysisService(root)
      .analyzeTextV2("src/keys.ts", extra);
    const asked: string[] = [];
    const spy = spyOn(
      maintenance,
      "createMaintenanceSourceAnalysisService",
    ).mockImplementation(
      (workspaceRoot: string) =>
        ({
          analyzeTextV2: async (file: string, text: string) => {
            asked.push(`${workspaceRoot === root} ${file} ${text === SOURCE}`);
            return workspaceAnalysis;
          },
        }) as unknown as ReturnType<
          typeof maintenance.createMaintenanceSourceAnalysisService
        >,
    );
    try {
      const symbols = await REVIEW_FIRM_EDIT_DEPS.symbolsOf(
        root,
        "src/keys.ts",
        SOURCE,
      );
      expect(symbols.map((entry) => entry.name)).toContain("extraKey");
      expect(asked).toEqual(["true src/keys.ts true"]);
    } finally {
      spy.mockRestore();
    }
  });

  test("the default deps read the symbols and links from the workspace", async () => {
    const root = workspace();
    write(
      root,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-expire-key",
        "    title: expireKey",
        "    sourceFile: src/keys.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-key-expiry",
        "",
      ].join("\n"),
    );
    const symbols = await REVIEW_FIRM_EDIT_DEPS.symbolsOf(
      root,
      "src/keys.ts",
      SOURCE,
    );
    expect(
      symbols.map((entry) => [
        entry.name,
        entry.location.startLine,
        entry.location.endLine,
        entry.reqLinks,
      ]),
    ).toEqual([
      ["expireKey", 1, 3, ["REQ-key-expiry"]],
      ["renderKey", 5, 7, []],
    ]);
    const before = Date.now();
    const now = REVIEW_FIRM_EDIT_DEPS.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
    const result = await executeReviewFirmEdit(
      { reviews: [entry()] },
      context(root),
    );
    expect(
      (result.structuredContent as { receipts: { symbol: string }[] })
        .receipts[0]?.symbol,
    ).toBe("expireKey");
  });

  test("the default deps read the index, the Git index and HEAD", async () => {
    const root = workspace();
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, stdio: "ignore" });
    expect(
      REVIEW_FIRM_EDIT_DEPS.readStaged(root, "src/keys.ts"),
    ).toBeUndefined();
    expect(REVIEW_FIRM_EDIT_DEPS.headKnowledge(root)).toEqual([]);
    expect(REVIEW_FIRM_EDIT_DEPS.readHead(root, "src/keys.ts")).toBeUndefined();
    git("init", "-q");
    write(
      root,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-keys-module",
        "    title: keys module",
        "    sourceFile: src/keys.ts",
        "    sourceLine: 5",
        "    sourceEndLine: 7",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-key-expiry",
        "",
      ].join("\n"),
    );
    git("add", "src/keys.ts", ".kb");
    expect(REVIEW_FIRM_EDIT_DEPS.readStaged(root, "src/keys.ts")).toBe(SOURCE);
    expect(
      REVIEW_FIRM_EDIT_DEPS.indexedSymbols(root, "src/keys.ts").map(
        (indexed) => [indexed.title, indexed.line, indexed.endLine],
      ),
    ).toEqual([["keys module", 5, 7]]);
    expect(REVIEW_FIRM_EDIT_DEPS.indexedSymbols(root, "src/none.ts")).toEqual(
      [],
    );
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-qm",
      "base",
    );
    expect(
      REVIEW_FIRM_EDIT_DEPS.headKnowledge(root)
        .filter((result) => result.entity.type === "symbol")
        .map((result) => result.entity.id),
    ).toEqual(["SYM-keys-module"]);
    expect(REVIEW_FIRM_EDIT_DEPS.readHead(root, "src/keys.ts")).toBe(SOURCE);
    expect(REVIEW_FIRM_EDIT_DEPS.readHead(root, "src/none.ts")).toBeUndefined();
  });
});
