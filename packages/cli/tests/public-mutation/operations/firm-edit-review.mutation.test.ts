import { afterEach, describe, expect, test } from "bun:test";
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
  firmEditCodeHash,
  firmEditStatementHash,
  parseFirmEditReceipt,
} from "kibi-agent-core/firm-edit-review";
import { KbRejection } from "../../../src/cli-errors.js";
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
  now: () => new Date("2026-11-16T10:00:00.000Z"),
};

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
): Promise<string> {
  try {
    await executeReviewFirmEdit({ reviews }, context(root), deps);
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
    const expirePath =
      ".kb/firm-edit-reviews/REQ-key-expiry/src__keys.ts--expireKey.json";
    const renderPath =
      ".kb/firm-edit-reviews/REQ-key-expiry/src__keys.ts--renderKey.json";
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
    ).toEqual(["src__keys.ts--expireKey.json", "src__keys.ts--renderKey.json"]);
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

  test("a second review of the same symbol replaces the first", async () => {
    const root = workspace();
    await executeReviewFirmEdit({ reviews: [entry()] }, context(root), deps);
    await executeReviewFirmEdit(
      { reviews: [entry({ note: "Rechecked." })] },
      context(root),
      deps,
    );
    const file = path.join(
      root,
      ".kb/firm-edit-reviews/REQ-key-expiry/src__keys.ts--expireKey.json",
    );
    expect(parseFirmEditReceipt(readFileSync(file, "utf8"))?.note).toBe(
      "Rechecked.",
    );
    expect(readdirSync(path.dirname(file))).toEqual([
      "src__keys.ts--expireKey.json",
    ]);
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
      "Two reviews name the same requirement and symbol (.kb/firm-edit-reviews/REQ-key-expiry/src__keys.ts--expireKey.json).",
    );
    expect(existsSync(path.join(root, ".kb/firm-edit-reviews"))).toBe(false);
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
});
