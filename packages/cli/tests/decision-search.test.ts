import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { SearchHintsEntity } from "kibi-plugin-sdk";

import {
  DECISION_CARD_LIMIT,
  MEANING_LIST_LIMIT,
  MEANING_WEIGHT,
  WEAK_COVERAGE,
  creditedScore,
  searchDecisions,
} from "../src/decision-search.js";

let workspace: string;
let runtime: string;
const previousRuntime = process.env.KIBI_RUNTIME_DIR;

function write(relative: string, text: string): void {
  const file = path.join(workspace, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function requirement(
  id: string,
  title: string,
  body: string,
  extra = "",
): void {
  write(
    `.kb/requirements/${id}.md`,
    `---\nid: ${id}\ntitle: ${title}\nstatus: open\n${extra}---\n${body}\n`,
  );
}

beforeAll(() => {
  workspace = mkdtempSync(path.join(tmpdir(), "kibi-decisions-"));
  runtime = mkdtempSync(path.join(tmpdir(), "kibi-decisions-rt-"));
  process.env.KIBI_RUNTIME_DIR = runtime;
  requirement(
    "REQ-card-line",
    "A decision card is one short line",
    "A card line must hold at most 300 characters.",
    "firmness: firm\n",
  );
  requirement(
    "REQ-export-pdf",
    "Exports are written as PDF files",
    "Export must write a PDF document.",
  );
  requirement(
    "REQ-old-export",
    "Exports are written as Word files",
    "Export wrote a Word document.",
  );
  for (let index = 0; index < 9; index += 1)
    requirement(
      `REQ-filler-${index}`,
      `Unrelated filler rule number ${index}`,
      "Nothing relevant here.",
    );
  write(
    ".kb/adr/ADR-1.md",
    "---\nid: ADR-1\ntitle: Search answers with short cards\nstatus: accepted\n---\nWe chose cards.\n",
  );
  write(
    ".kb/scenarios/SCEN-reader.md",
    "---\nid: SCEN-reader\ntitle: A reader skims the answer quickly\nstatus: active\n---\nThe reader skims.\n",
  );
  write(
    ".kb/relationships/r.yaml",
    [
      "relationships:",
      "  - type: specified_by",
      "    from: REQ-card-line",
      "    to: SCEN-reader",
      "  - type: specified_by",
      "    from: REQ-card-line",
      "    to: SCEN-missing",
      "  - type: supersedes",
      "    from: REQ-export-pdf",
      "    to: REQ-old-export",
      "  - type: relates_to",
      "    from: REQ-export-pdf",
      "    to: SCEN-reader",
      "  - type: specified_by",
      "    from: REQ-card-line",
      "    to: SCEN-NEG-long",
      "  - type: assumes",
      "    from: SCEN-NEG-long",
      "    to: FACT-NEG-long",
      "  - type: assumes",
      "    from: SCEN-NEG-long",
      "    to: FACT-gone",
    ].join("\n"),
  );
  write(
    ".kb/scenarios/SCEN-NEG-long.md",
    "---\nid: SCEN-NEG-long\ntitle: A card over the limit is refused\nstatus: active\n---\nRefused.\n",
  );
  write(
    ".kb/facts/FACT-NEG-long.md",
    "---\nid: FACT-NEG-long\ntitle: A card line runs to 400 characters\nstatus: active\n---\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-card\n    title: formatCardLine\n    sourceFile: src/card.ts\n    relationships:\n      - type: implements\n        target: REQ-card-line\n",
  );
  write("src/card.ts", "export {};\n");
});

afterAll(() => {
  if (previousRuntime === undefined)
    Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
  else process.env.KIBI_RUNTIME_DIR = previousRuntime;
  rmSync(workspace, { recursive: true, force: true });
  rmSync(runtime, { recursive: true, force: true });
});

/** Scores entities whose text contains a word of `liked`. */
function meaningOf(liked: Record<string, number>) {
  const seen: SearchHintsEntity[][] = [];
  const rank = async (
    _query: string,
    entities: readonly SearchHintsEntity[],
  ) => {
    seen.push([...entities]);
    return new Map(
      entities.map((entity) => [entity.id, liked[entity.id] ?? 0] as const),
    );
  };
  return { rank, seen };
}

describe("decision search", () => {
  test("the limits are the recorded ones", () => {
    expect(DECISION_CARD_LIMIT).toBe(5);
    expect(MEANING_LIST_LIMIT).toBe(7);
    expect(MEANING_WEIGHT).toBe(0.5);
    expect(WEAK_COVERAGE).toBe(0.5);
  });

  test("a credited score is the mean of the two best scores", () => {
    expect(creditedScore([0.2, 0.8, 0.4])).toBeCloseTo(0.6);
    expect(creditedScore([0.5])).toBe(0.5);
    expect(creditedScore([])).toBe(0);
  });

  test("words alone find the governing decision as a card and name no meaning list", async () => {
    const found = await searchDecisions(workspace, {
      query: "how many characters may a decision card line hold",
    });
    expect(found.cards[0]?.id).toBe("REQ-card-line");
    expect(found.cards.length).toBeLessThanOrEqual(5);
    expect(found.fused).toBe(false);
    expect(found.meaning).toEqual([]);
    expect(found.weak).toBe(false);
    expect(found.decisionCount).toBe(13);
  });

  test("the meaning ranking is fused in and lists close decisions that are not cards", async () => {
    const meaning = meaningOf({
      "REQ-filler-3": 0.9,
      "REQ-filler-4": 0.8,
      "SCEN-reader": 0.7,
      "REQ-old-export": 0.95,
    });
    const found = await searchDecisions(workspace, {
      query: "how many characters may a decision card line hold",
      limit: 1,
      meaning: meaning.rank,
    });
    expect(found.fused).toBe(true);
    expect(found.cards).toHaveLength(1);
    const ids = found.meaning.map((item) => item.id);
    // A superseded decision is never listed; its successor is.
    expect(ids).not.toContain("REQ-old-export");
    expect(ids.slice(0, 2)).toEqual(["REQ-filler-3", "REQ-filler-4"]);
    expect(ids).not.toContain(found.cards[0]?.id);
    expect(found.meaning.length).toBeLessThanOrEqual(7);
    // Decisions and the entities they link are scored; a missing link is not.
    const sent = meaning.seen[0]?.map((entity) => entity.id) ?? [];
    expect(sent).toContain("SCEN-reader");
    expect(sent).not.toContain("SCEN-missing");
    expect(sent).not.toContain("SYM-card");
    const scenario = meaning.seen[0]?.find((e) => e.id === "SCEN-reader");
    expect(scenario?.text).toContain("A reader skims");
    expect(scenario?.hash).toMatch(/.+/);
  });

  test("a hit on a forbidden situation shows the decision whose scenario assumes it", async () => {
    const meaning = meaningOf({ "FACT-NEG-long": 0.9 });
    const found = await searchDecisions(workspace, {
      query: "unrelated filler rule",
      limit: 1,
      meaning: meaning.rank,
    });
    expect(found.meaning[0]?.id).toBe("REQ-card-line");
    expect(found.meaning[0]?.score).toBeCloseTo(0.45);
  });

  test("a provider that gives no scores leaves the word ranking alone", async () => {
    const found = await searchDecisions(workspace, {
      query: "decision card line",
      meaning: async () => undefined,
    });
    expect(found.fused).toBe(false);
    expect(found.meaning).toEqual([]);
  });

  test("a type filter keeps only that type, in the cards and the meaning list", async () => {
    const meaning = meaningOf({ "ADR-1": 0.9, "REQ-filler-1": 0.8 });
    const found = await searchDecisions(workspace, {
      query: "short cards",
      types: ["adr"],
      meaning: meaning.rank,
    });
    expect(found.cards.every((card) => card.type === "adr")).toBe(true);
    expect(found.meaning.every((item) => item.id.startsWith("ADR-"))).toBe(
      true,
    );
  });

  test("a later page skips the first cards", async () => {
    const all = await searchDecisions(workspace, {
      query: "rule filler unrelated",
      limit: 4,
    });
    const page = await searchDecisions(workspace, {
      query: "rule filler unrelated",
      limit: 2,
      offset: 2,
    });
    expect(page.cards.map((card) => card.id)).toEqual(
      all.cards.slice(2, 4).map((card) => card.id),
    );
  });

  test("a question most of whose words no decision holds is weak", async () => {
    const found = await searchDecisions(workspace, {
      query: "zyxwvut quokka marmalade card",
      paths: ["src/card.ts"],
    });
    expect(found.weak).toBe(true);
    expect(found.retrieval.uncoveredTerms).toContain("zyxwvut");
  });

  test("a decision folded into a card seeds the answer when it covers the question", async () => {
    const twins = mkdtempSync(path.join(tmpdir(), "kibi-decisions-twins-"));
    try {
      for (const [id, status] of [
        ["REQ-twin-live", "open"],
        ["REQ-twin-done", "closed"],
      ] as const) {
        const file = path.join(twins, ".kb/requirements", `${id}.md`);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(
          file,
          `---\nid: ${id}\ntitle: Invoice export writes a CSV\nstatus: ${status}\n---\nInvoice export writes a CSV.\n`,
        );
      }
      const found = await searchDecisions(twins, {
        query: "invoice export csv",
      });
      expect(found.cards[0]?.folded).toEqual(["REQ-twin-done"]);
      expect(found.seeds.map((seed) => seed.id)).toEqual([
        "REQ-twin-live",
        "REQ-twin-done",
      ]);
      expect(found.seeds[1]).toMatchObject({
        foldedInto: "REQ-twin-live",
        status: "closed",
        reasons: ["folded into REQ-twin-live"],
      });
      expect(found.seeds[1]?.score).toBeCloseTo(0.9);
      const later = await searchDecisions(twins, {
        query: "invoice export csv",
        offset: 1,
      });
      expect(later.seeds).toEqual([]);
      const unrelated = await searchDecisions(twins, { query: "csv" });
      expect(unrelated.seeds.length).toBeGreaterThan(0);
    } finally {
      rmSync(twins, { recursive: true, force: true });
    }
  });

  test("a workspace without decisions answers nothing and asks no provider", async () => {
    const empty = mkdtempSync(path.join(tmpdir(), "kibi-decisions-empty-"));
    try {
      const meaning = meaningOf({});
      const found = await searchDecisions(empty, {
        query: "anything",
        meaning: meaning.rank,
      });
      expect(found.cards).toEqual([]);
      expect(meaning.seen).toEqual([]);
      expect(found.weak).toBe(true);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
