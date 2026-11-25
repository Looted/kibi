import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  KIBI_DECISION_CORPUS_CACHE_ENV,
  entityFileRows,
  loadDecisionCorpus,
  relationshipFileRows,
  symbolFileRows,
} from "../src/decision-corpus.js";
import * as engine from "../src/engine.js";

let workspace: string;
let runtime: string;
const previous = {
  runtime: process.env.KIBI_RUNTIME_DIR,
  cache: process.env[KIBI_DECISION_CORPUS_CACHE_ENV],
};

function restore(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

function write(relative: string, text: string): void {
  const file = path.join(workspace, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

const REQUIREMENT = [
  "---",
  "id: REQ-a",
  "title: Cards are short",
  "status: open",
  "semantic_inventory: [dropped]",
  "links:",
  "  - REQ-b",
  "  - type: constrains",
  "    target: FACT-a",
  "  - 7",
  "---",
  "A card must be one line.",
].join("\n");

beforeEach(() => {
  workspace = mkdtempSync(path.join(tmpdir(), "kibi-corpus-ws-"));
  runtime = mkdtempSync(path.join(tmpdir(), "kibi-corpus-rt-"));
  process.env.KIBI_RUNTIME_DIR = runtime;
  Reflect.deleteProperty(process.env, KIBI_DECISION_CORPUS_CACHE_ENV);
  write(".kb/requirements/REQ-a.md", REQUIREMENT);
  write(".kb/requirements/notes.txt", "not an entity");
  write(".kb/adr/ADR-1.md", "No front matter here.");
  write(
    ".kb/relationships/a.yaml",
    "relationships:\n  - type: verified_by\n    from: REQ-a\n    to: TEST-a\n  - type: 3\n",
  );
  write(".kb/relationships/readme.md", "ignored");
  write(
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-a",
      "    title: formatCardLine",
      "    sourceFile: src/a.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-a",
      "      - type: 9",
      "    links: [REQ-c]",
      "  - title: no id",
      "  - id: SYM-b",
      "    tags: notalist",
    ].join("\n"),
  );
});

afterEach(() => {
  restore("KIBI_RUNTIME_DIR", previous.runtime);
  restore(KIBI_DECISION_CORPUS_CACHE_ENV, previous.cache);
  rmSync(workspace, { recursive: true, force: true });
  rmSync(runtime, { recursive: true, force: true });
});

function cacheFiles(): string[] {
  return readdirSync(runtime).filter((name) =>
    name.startsWith("decision-corpus-"),
  );
}

describe("decision corpus", () => {
  test("reads entities, bodies, links, relationship shards and symbols from .kb", () => {
    const corpus = loadDecisionCorpus(workspace);
    const byId = new Map(corpus.entities.map((entity) => [entity.id, entity]));
    const req = byId.get("REQ-a");
    expect(req).toMatchObject({
      type: "req",
      title: "Cards are short",
      source: ".kb/requirements/REQ-a.md",
      body: "A card must be one line.",
    });
    expect(req && "semantic_inventory" in req).toBe(false);
    expect(byId.get("ADR-1")).toMatchObject({
      type: "adr",
      title: "ADR-1",
      body: "No front matter here.",
    });
    expect(byId.get("SYM-a")).toMatchObject({
      type: "symbol",
      title: "formatCardLine",
      source: "src/a.ts",
      tags: [],
    });
    expect(byId.get("SYM-b")).toMatchObject({ title: "SYM-b", tags: [] });
    expect(corpus.entities.some((entity) => entity.title === "no id")).toBe(
      false,
    );
    expect(corpus.edges).toEqual([
      { relationship: "relates_to", from: "REQ-a", to: "REQ-b" },
      { relationship: "constrains", from: "REQ-a", to: "FACT-a" },
      { relationship: "verified_by", from: "REQ-a", to: "TEST-a" },
      { relationship: "implements", from: "SYM-a", to: "REQ-a" },
      { relationship: "relates_to", from: "SYM-a", to: "REQ-c" },
    ]);
  });

  test("a workspace without .kb has an empty corpus", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "kibi-corpus-empty-"));
    try {
      const corpus = loadDecisionCorpus(empty);
      expect(corpus.entities).toEqual([]);
      expect(corpus.edges).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  test("an unchanged workspace is answered from memory, an edited file is read again", () => {
    const first = loadDecisionCorpus(workspace);
    expect(loadDecisionCorpus(workspace)).toBe(first);
    write(
      ".kb/requirements/REQ-a.md",
      REQUIREMENT.replace("Cards are short", "Cards stay short"),
    );
    const later = new Date(Date.now() + 5000);
    utimesSync(path.join(workspace, ".kb/requirements/REQ-a.md"), later, later);
    const second = loadDecisionCorpus(workspace);
    expect(second.signature).not.toBe(first.signature);
    expect(second.entities.find((entity) => entity.id === "REQ-a")?.title).toBe(
      "Cards stay short",
    );
  });

  test("a file that cannot be parsed contributes nothing and the rest still loads", () => {
    write(".kb/facts/FACT-bad.md", "---\nid: [unclosed\n---\nbody");
    write(".kb/relationships/bad.yaml", "relationships: [unclosed");
    symlinkSync(
      path.join(workspace, "nowhere.md"),
      path.join(workspace, ".kb/requirements/REQ-gone.md"),
    );
    const corpus = loadDecisionCorpus(workspace);
    expect(corpus.entities.some((entity) => entity.id === "REQ-a")).toBe(true);
    expect(
      corpus.entities.some((entity) =>
        entity.source?.toString().includes("FACT-bad"),
      ),
    ).toBe(false);
  });

  test("a damaged or foreign cache file is ignored and rewritten", () => {
    loadDecisionCorpus(workspace);
    const [file] = cacheFiles();
    const target = path.join(runtime, file as string);
    writeFileSync(target, "{not json");
    write(".kb/flags/FLAG-1.md", "---\nid: FLAG-1\ntitle: A flag\n---\n");
    expect(
      loadDecisionCorpus(workspace).entities.some(
        (entity) => entity.id === "FLAG-1",
      ),
    ).toBe(true);
    writeFileSync(target, JSON.stringify({ version: 0, files: {} }));
    write(".kb/events/EVT-1.md", "---\nid: EVT-1\ntitle: An event\n---\n");
    expect(
      loadDecisionCorpus(workspace).entities.some(
        (entity) => entity.id === "EVT-1",
      ),
    ).toBe(true);
  });

  test("a cache that cannot be written or located only costs speed", () => {
    loadDecisionCorpus(workspace);
    const [file] = cacheFiles();
    const target = path.join(runtime, file as string);
    rmSync(target);
    mkdirSync(target);
    write(".kb/tests/TEST-a.md", "---\nid: TEST-a\ntitle: A test\n---\n");
    expect(
      loadDecisionCorpus(workspace).entities.some(
        (entity) => entity.id === "TEST-a",
      ),
    ).toBe(true);
    expect(
      readdirSync(runtime).filter((name) => name.endsWith(".tmp")),
    ).toEqual([]);
    const spy = spyOn(engine, "runtimeDirectory").mockImplementation(() => {
      throw new Error("no runtime directory");
    });
    try {
      write(".kb/scenarios/SCEN-a.md", "---\nid: SCEN-a\ntitle: S\n---\n");
      expect(
        loadDecisionCorpus(workspace).entities.some(
          (entity) => entity.id === "SCEN-a",
        ),
      ).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  test("setting the environment switch to 0 reads every file and writes no cache", () => {
    process.env[KIBI_DECISION_CORPUS_CACHE_ENV] = "0";
    expect(loadDecisionCorpus(workspace).entities.length).toBeGreaterThan(0);
    expect(cacheFiles()).toEqual([]);
  });

  test("the file readers accept odd shapes without throwing", () => {
    expect(
      entityFileRows("---\n- a list\n---\n", ".kb/facts/FACT-x.md", "fact"),
    ).toMatchObject({ entities: [{ id: "FACT-x", type: "fact" }], edges: [] });
    expect(relationshipFileRows("just text")).toEqual({
      entities: [],
      edges: [],
    });
    expect(relationshipFileRows("relationships: nope")).toEqual({
      entities: [],
      edges: [],
    });
    expect(symbolFileRows("symbols: nope")).toEqual({
      entities: [],
      edges: [],
    });
    expect(
      symbolFileRows("symbols:\n  - id: S\n    relationships: nope\n").edges,
    ).toEqual([]);
  });
});
