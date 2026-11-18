import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { firmRequirementsTouched } from "../src/decision-guard";
import {
  FIRM_EDIT_RECEIPT_VERSION,
  FIRM_EDIT_REMOVED_CODE_HASH,
  FIRM_EDIT_REVIEWS_DIR,
  type FirmEditReceipt,
  firmEditCodeHash,
  firmEditFileHash,
  firmEditLegacyReceiptPath,
  firmEditReceiptMismatch,
  firmEditReceiptPath,
  firmEditReviewed,
  firmEditStatementHash,
  parseFirmEditReceipt,
  readFirmEditReceipt,
  readRequirementStatement,
  requirementStatementFromDocument,
  serializeFirmEditReceipt,
} from "../src/firm-edit-review";
import type { EntitySummary, IndexedSymbol } from "../src/knowledge-index";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function sha(text: string): string {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

const SOURCE = [
  "export function expireKey(at: number, now: number): boolean {",
  "  return now - at > 90;   ",
  "}",
  "",
  "export function renderKey(key: string): string {",
  "  return key;",
  "}",
].join("\n");

const STATEMENT = "API keys must expire  ninety days\nafter they are created.";

function receipt(overrides: Partial<FirmEditReceipt> = {}): FirmEditReceipt {
  return {
    version: FIRM_EDIT_RECEIPT_VERSION,
    requirementId: "REQ-key-expiry",
    sourceFile: "src/keys.ts",
    symbol: "expireKey",
    verdict: "keeps",
    note: "Still ninety days.",
    statementHash: firmEditStatementHash(STATEMENT),
    codeHash: firmEditCodeHash(SOURCE, 1, 3) as string,
    startLine: 1,
    endLine: 3,
    recordedAt: "2026-11-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("hashes", () => {
  test("a statement hashes with its whitespace collapsed", () => {
    expect(firmEditStatementHash(STATEMENT)).toBe(
      sha("API keys must expire ninety days after they are created."),
    );
    expect(firmEditStatementHash(" a\n\tb ")).toBe(
      firmEditStatementHash("a b"),
    );
  });

  test("code hashes the span's lines without line endings or trailing blanks", () => {
    expect(firmEditCodeHash(SOURCE, 1, 3)).toBe(
      sha(
        [
          "export function expireKey(at: number, now: number): boolean {",
          "  return now - at > 90;",
          "}",
        ].join("\n"),
      ),
    );
    expect(firmEditCodeHash(SOURCE.replaceAll("\n", "\r\n"), 1, 3)).toBe(
      firmEditCodeHash(SOURCE, 1, 3) as string,
    );
    expect(firmEditCodeHash(SOURCE, 5, 5)).toBe(
      sha("export function renderKey(key: string): string {"),
    );
    expect(firmEditCodeHash(SOURCE, 7, 7)).toBe(sha("}"));
  });

  test("a file hash covers every line of the file", () => {
    expect(firmEditFileHash(SOURCE)).toBe(
      firmEditCodeHash(SOURCE, 1, SOURCE.split("\n").length) as string,
    );
    expect(firmEditFileHash("")).toBe(sha(""));
  });

  test("a span outside the text has no hash", () => {
    for (const [start, end] of [
      [0, 2],
      [3, 2],
      [1, 8],
      [1.5, 2],
      [1, 2.5],
    ] as const)
      expect(firmEditCodeHash(SOURCE, start, end)).toBeUndefined();
  });
});

describe("receipt paths", () => {
  const digest = (text: string) =>
    createHash("sha256").update(text).digest("hex").slice(0, 32);

  test("one file per requirement and symbol, named by a hash of both", () => {
    expect(firmEditReceiptPath("REQ-a", "src/keys.ts", "expireKey")).toBe(
      `${FIRM_EDIT_REVIEWS_DIR}/REQ-a/expireKey--${digest("src/keys.ts\0expireKey")}.json`,
    );
    expect(
      firmEditReceiptPath("REQ-a.b_c", "a b/c$d.ts", "Key Store/rotate"),
    ).toBe(
      `.kb/firm-edit-reviews/REQ-a.b_c/Key_Store__rotate--${digest("a b/c$d.ts\0Key Store/rotate")}.json`,
    );
  });

  test("paths that one file-safe name would merge get their own files", () => {
    expect(firmEditReceiptPath("REQ-a", "src/a b.ts", "f")).not.toBe(
      firmEditReceiptPath("REQ-a", "src/a_b.ts", "f"),
    );
    expect(firmEditLegacyReceiptPath("REQ-a", "src/a b.ts", "f")).toBe(
      firmEditLegacyReceiptPath("REQ-a", "src/a_b.ts", "f") as string,
    );
  });

  test("a long path or symbol name keeps the file name short", () => {
    const long = `src/${"a".repeat(300)}.ts`;
    const name = (firmEditReceiptPath("REQ-a", long, "s".repeat(300)) as string)
      .split("/")
      .at(-1) as string;
    expect(name).toBe(
      `${"s".repeat(48)}--${digest(`${long}\0${"s".repeat(300)}`)}.json`,
    );
    expect(firmEditLegacyReceiptPath("REQ-a", long, "f")).toBeUndefined();
  });

  test("the name earlier releases wrote", () => {
    expect(firmEditLegacyReceiptPath("REQ-a", "src/keys.ts", "expireKey")).toBe(
      `${FIRM_EDIT_REVIEWS_DIR}/REQ-a/src__keys.ts--expireKey.json`,
    );
    expect(
      firmEditLegacyReceiptPath("REQ-a.b_c", "a b/c$d.ts", "KeyStore.rotate"),
    ).toBe(".kb/firm-edit-reviews/REQ-a.b_c/a_b__c_d.ts--KeyStore.rotate.json");
  });

  test("an id that is not a requirement id has none", () => {
    for (const id of ["SYM-a", "REQ-", "REQ-a/b", "../REQ-a", "xREQ-a"]) {
      expect(firmEditReceiptPath(id, "a.ts", "f")).toBeUndefined();
      expect(firmEditLegacyReceiptPath(id, "a.ts", "f")).toBeUndefined();
    }
  });

  test("a receipt reads from its file, else from the earlier name, when it names the pair", () => {
    const files = new Map<string, string>();
    const read = () =>
      readFirmEditReceipt(
        "REQ-key-expiry",
        "src/keys.ts",
        "expireKey",
        (file) => files.get(file),
      );
    const legacy = firmEditLegacyReceiptPath(
      "REQ-key-expiry",
      "src/keys.ts",
      "expireKey",
    ) as string;
    const current = firmEditReceiptPath(
      "REQ-key-expiry",
      "src/keys.ts",
      "expireKey",
    ) as string;
    expect(read()).toBeUndefined();
    files.set(legacy, serializeFirmEditReceipt(receipt({ note: "old" })));
    expect(read()?.note).toBe("old");
    files.set(current, serializeFirmEditReceipt(receipt({ note: "new" })));
    expect(read()?.note).toBe("new");
    // A file holding another pair's receipt (a merged legacy name) is not it.
    for (const other of [
      receipt({ requirementId: "REQ-other" }),
      receipt({ sourceFile: "src/key_s.ts" }),
      receipt({ symbol: "renderKey" }),
    ]) {
      files.delete(current);
      files.set(legacy, serializeFirmEditReceipt(other));
      expect(read()).toBeUndefined();
    }
    expect(
      readFirmEditReceipt("SYM-a", "src/keys.ts", "expireKey", () => {
        throw new Error("not read");
      }),
    ).toBeUndefined();
  });
});

describe("requirement statements", () => {
  const doc = (front: string, body = "") =>
    `---\nid: REQ-a\n${front}---\n${body}`;

  test("semantic_text in every scalar form", () => {
    expect(
      requirementStatementFromDocument(doc("semantic_text: Keys expire.\n")),
    ).toBe("Keys expire.");
    expect(
      requirementStatementFromDocument(
        doc(
          "semantic_text: >-\n  Keys must\n  expire soon.\n\n  Second para.\ntitle: T\n",
        ),
      ),
    ).toBe("Keys must expire soon. Second para.");
    expect(
      requirementStatementFromDocument(
        doc("semantic_text: |\n  One.\n\n  Two.\n"),
      ),
    ).toBe("One. Two.");
    expect(
      requirementStatementFromDocument(
        doc('semantic_text: "Say \\"no\\" to\\told keys:\\n always\\\\."\n'),
      ),
    ).toBe('Say "no" to\told keys:\n always\\.');
    expect(
      requirementStatementFromDocument(doc('semantic_text: "open quote\n')),
    ).toBe("open quote");
    expect(
      requirementStatementFromDocument(
        doc("semantic_text: 'It''s ninety\n  days.'\n"),
      ),
    ).toBe("It's ninety days.");
    expect(
      requirementStatementFromDocument(doc("semantic_text: 'open\n")),
    ).toBe("open");
    expect(
      requirementStatementFromDocument(
        doc("semantic_text: Keys expire\n  after ninety days. # a comment\n"),
      ),
    ).toBe("Keys expire after ninety days.");
    expect(
      requirementStatementFromDocument(
        doc("semantic_text:\n  Indented plain.\n"),
      ),
    ).toBe("Indented plain.");
  });

  test("without semantic_text: the body without headings and context, else the title", () => {
    expect(
      requirementStatementFromDocument(
        doc(
          "title: T\n",
          "\n# Heading\n\n- First rule.\n\n> Quoted.\n\n## Context\n\nWhy.\n\n### Detail\n\nStill context.\n\n## Scope\n\n1. Back in.\n",
        ),
      ),
    ).toBe("First rule. Quoted. Back in.");
    expect(
      requirementStatementFromDocument(
        doc(
          "title: Keys expire\nsemantic_text: ''\n",
          "\n## **Notes**\n\nOnly context.\n",
        ),
      ),
    ).toBe("Keys expire");
    expect(
      requirementStatementFromDocument(doc("status: open\n")),
    ).toBeUndefined();
    expect(requirementStatementFromDocument(doc("title:\n"))).toBeUndefined();
    expect(requirementStatementFromDocument("no front matter")).toBeUndefined();
    expect(requirementStatementFromDocument("---\ntitle: T\n")).toBeUndefined();
    expect(requirementStatementFromDocument("---\r\ntitle: T\r\n---\r\n")).toBe(
      "T",
    );
  });

  test("read from the workspace's requirement document", () => {
    const root = workspace();
    fs.mkdirSync(path.join(root, ".kb/requirements"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".kb/requirements/REQ-a.md"),
      doc("semantic_text: Keys expire.\n"),
    );
    expect(readRequirementStatement(root, "REQ-a")).toBe("Keys expire.");
    expect(readRequirementStatement(root, "REQ-missing")).toBeUndefined();
    expect(readRequirementStatement(root, "../REQ-a")).toBeUndefined();
  });
});

describe("parse and serialize", () => {
  test("a written receipt reads back the same, with a stable key order", () => {
    const quoted = receipt({ requestQuote: "fix the expiry" });
    const { recordedAt, ...rest } = quoted;
    const text = serializeFirmEditReceipt({ recordedAt, ...rest });
    expect(text.endsWith("}\n")).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual([
      "version",
      "requirementId",
      "sourceFile",
      "symbol",
      "verdict",
      "note",
      "requestQuote",
      "statementHash",
      "codeHash",
      "startLine",
      "endLine",
      "recordedAt",
    ]);
    expect(parseFirmEditReceipt(text)).toEqual(quoted);
    const plain = serializeFirmEditReceipt(receipt());
    expect(plain).not.toContain("requestQuote");
    expect(plain).toBe(`${JSON.stringify(receipt(), null, 2)}\n`);
    expect(parseFirmEditReceipt(plain)).toEqual(receipt());
    expect(
      parseFirmEditReceipt(JSON.stringify(receipt({ verdict: "changes" }))),
    ).toEqual(receipt({ verdict: "changes" }));
    expect(
      parseFirmEditReceipt(JSON.stringify(receipt({ note: "" })))?.note,
    ).toBe("");
  });

  test("anything else is not a receipt", () => {
    const valid = receipt() as unknown as Record<string, unknown>;
    const broken: Record<string, unknown>[] = [
      { ...valid, version: 2 },
      { ...valid, requirementId: "" },
      { ...valid, requirementId: 1 },
      { ...valid, requirementId: "SYM-a" },
      { ...valid, sourceFile: "" },
      { ...valid, sourceFile: ["src/keys.ts"] },
      { ...valid, symbol: "" },
      { ...valid, verdict: "maybe" },
      { ...valid, note: 1 },
      { ...valid, requestQuote: 1 },
      { ...valid, statementHash: "" },
      { ...valid, codeHash: "" },
      { ...valid, startLine: 1.5 },
      { ...valid, endLine: "3" },
      { ...valid, recordedAt: 0 },
    ];
    for (const value of broken)
      expect(parseFirmEditReceipt(JSON.stringify(value))).toBeUndefined();
    for (const text of ["{", "null", "3", '"x"'])
      expect(parseFirmEditReceipt(text)).toBeUndefined();
  });
});

describe("firmEditReceiptMismatch", () => {
  test("matches the same statement and code, by hash or by the receipt's span", () => {
    expect(
      firmEditReceiptMismatch(receipt(), {
        statement: "API keys must expire ninety days after they are created.",
        content: SOURCE,
      }),
    ).toBeUndefined();
    expect(
      firmEditReceiptMismatch(receipt(), {
        statement: STATEMENT,
        codeHash: receipt().codeHash,
      }),
    ).toBeUndefined();
  });

  test("the receipt's code matches wherever it now sits in the file", () => {
    expect(
      firmEditReceiptMismatch(receipt(), {
        statement: STATEMENT,
        content: `// header\n\n${SOURCE}`,
      }),
    ).toBeUndefined();
    expect(
      firmEditReceiptMismatch(
        receipt({
          codeHash: FIRM_EDIT_REMOVED_CODE_HASH,
          startLine: 0,
          endLine: 0,
        }),
        { statement: STATEMENT, content: SOURCE },
      ),
    ).toBe("code-changed");
    expect(
      firmEditReceiptMismatch(receipt({ startLine: 3, endLine: 1 }), {
        statement: STATEMENT,
        content: SOURCE,
      }),
    ).toBe("code-changed");
  });

  test("names what changed since the receipt", () => {
    expect(
      firmEditReceiptMismatch(receipt(), {
        statement: "API keys must expire after thirty days.",
        content: SOURCE,
      }),
    ).toBe("statement-changed");
    expect(
      firmEditReceiptMismatch(receipt(), {
        statement: STATEMENT,
        content: SOURCE.replace("90", "91"),
      }),
    ).toBe("code-changed");
    expect(
      firmEditReceiptMismatch(receipt(), {
        statement: STATEMENT,
        codeHash: "sha256:other",
        content: SOURCE,
      }),
    ).toBe("code-changed");
    expect(firmEditReceiptMismatch(receipt(), { statement: STATEMENT })).toBe(
      "code-changed",
    );
  });
});

function workspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-firm-review-"));
  dirs.push(root);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src/keys.ts"), SOURCE);
  return root;
}

function store(root: string, value: FirmEditReceipt | string): void {
  const file = path.join(
    root,
    firmEditReceiptPath("REQ-key-expiry", "src/keys.ts", "expireKey") as string,
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    typeof value === "string" ? value : serializeFirmEditReceipt(value),
  );
}

function requirement(root: string, front: string): void {
  fs.mkdirSync(path.join(root, ".kb/requirements"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".kb/requirements/REQ-key-expiry.md"),
    `---\nid: REQ-key-expiry\n${front}---\n`,
  );
}

describe("firmEditReviewed", () => {
  const expire = { title: "expireKey" };
  const askedAt = Date.parse("2026-11-15T00:00:00.000Z");
  const asked = (id: string) => (id === "REQ-key-expiry" ? askedAt : undefined);

  test("a keeps receipt recorded after this session asked reviews the symbol", () => {
    const root = workspace();
    requirement(
      root,
      "semantic_text: >-\n  API keys must expire  ninety days\n\n  after they are created.\n",
    );
    store(root, receipt());
    const reviewed = firmEditReviewed(root, "src/keys.ts", asked);
    expect(reviewed("REQ-key-expiry", expire)).toBe(true);
    // The file is read once, so a second answer reuses it.
    fs.rmSync(path.join(root, "src/keys.ts"));
    expect(reviewed("REQ-key-expiry", expire)).toBe(true);
  });

  test("a receipt from before the question, or with no question asked, does not", () => {
    const root = workspace();
    requirement(root, `semantic_text: ${STATEMENT.replace("\n", " ")}\n`);
    store(root, receipt());
    expect(
      firmEditReviewed(
        root,
        "src/keys.ts",
        () => undefined,
      )("REQ-key-expiry", expire),
    ).toBe(false);
    expect(
      firmEditReviewed(
        root,
        "src/keys.ts",
        () => Date.parse(receipt().recordedAt) + 1,
      )("REQ-key-expiry", expire),
    ).toBe(false);
    expect(
      firmEditReviewed(root, "src/keys.ts", () =>
        Date.parse(receipt().recordedAt),
      )("REQ-key-expiry", expire),
    ).toBe(true);
    store(root, receipt({ recordedAt: "not a time" }));
    expect(
      firmEditReviewed(root, "src/keys.ts", asked)("REQ-key-expiry", expire),
    ).toBe(false);
  });

  test("no receipt, a stale one, a changes verdict or another symbol's does not", () => {
    const root = workspace();
    const reviewed = () => firmEditReviewed(root, "src/keys.ts", asked);
    requirement(root, `semantic_text: ${STATEMENT.replace("\n", " ")}\n`);
    expect(reviewed()("REQ-key-expiry", expire)).toBe(false);
    for (const value of [
      receipt({ verdict: "changes" }),
      receipt({ requirementId: "REQ-other" }),
      receipt({ sourceFile: "src/other.ts" }),
      receipt({ symbol: "renderKey" }),
      receipt({ codeHash: "sha256:old" }),
      receipt({ statementHash: "sha256:old" }),
      "not json",
    ]) {
      store(root, value);
      expect(reviewed()("REQ-key-expiry", expire)).toBe(false);
    }
    store(root, receipt());
    expect(reviewed()("REQ-key-expiry", expire)).toBe(true);
    // Without prose the title is the statement.
    requirement(root, `title: ${STATEMENT.replace("\n", " ")}\n`);
    expect(reviewed()("REQ-key-expiry", expire)).toBe(true);
    // Without the requirement's document nothing can match.
    fs.rmSync(path.join(root, ".kb/requirements/REQ-key-expiry.md"));
    expect(reviewed()("REQ-key-expiry", expire)).toBe(false);
    requirement(root, `semantic_text: ${STATEMENT.replace("\n", " ")}\n`);
    fs.rmSync(path.join(root, "src/keys.ts"));
    expect(reviewed()("REQ-key-expiry", expire)).toBe(false);
  });
});

describe("firmRequirementsTouched with receipts", () => {
  const summaries: Record<string, EntitySummary> = {
    "REQ-a": { id: "REQ-a", firmness: "firm" },
    "REQ-b": { id: "REQ-b", firmness: "firm" },
  };
  const summarize = (id: string): EntitySummary => summaries[id] ?? { id };
  const symbol = (
    title: string,
    line: number,
    implementsIds: string[],
  ): IndexedSymbol => ({
    id: `SYM-${title}`,
    title,
    line,
    endLine: line + 1,
    implements: implementsIds,
    coveredBy: [],
    executableFor: [],
  });
  const symbols = [
    symbol("f", 1, ["REQ-a", "REQ-b"]),
    symbol("g", 5, ["REQ-a"]),
  ];

  test("a requirement every touched symbol has a receipt for is not counted", () => {
    const reviewedPairs = new Set(["REQ-a f", "REQ-a g"]);
    const reviewed = (id: string, target: IndexedSymbol) =>
      reviewedPairs.has(`${id} ${target.title}`);
    expect(
      firmRequirementsTouched({
        symbols,
        focus: undefined,
        wholeFile: true,
        summarize,
        reviewed,
      }).ids,
    ).toEqual(["REQ-b"]);
    reviewedPairs.delete("REQ-a g");
    expect(
      firmRequirementsTouched({
        symbols,
        focus: undefined,
        wholeFile: true,
        summarize,
        reviewed,
      }).ids,
    ).toEqual(["REQ-a", "REQ-b"]);
    // Only the touched symbols need one: g is outside the edit.
    expect(
      firmRequirementsTouched({
        symbols,
        focus: [{ start: 1, end: 1 }],
        wholeFile: false,
        summarize,
        reviewed,
      }).ids,
    ).toEqual(["REQ-b"]);
    // A symbol that does not implement the requirement needs no receipt.
    expect(
      firmRequirementsTouched({
        symbols,
        focus: undefined,
        wholeFile: true,
        summarize,
        reviewed: (id, target) => id === "REQ-b" && target.title === "f",
      }).ids,
    ).toEqual(["REQ-a"]);
  });
});
