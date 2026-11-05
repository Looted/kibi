import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import path from "node:path";
import * as symbolsTs from "../../../src/extractors/symbols-ts.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  SYMBOL_LEGACY_LINK_MARK_ACTION_ID,
  SYMBOL_LEGACY_LINK_MARK_CODE,
  applySymbolLegacyLinks,
  planSymbolLegacyLinks,
} from "../../../src/operations/migration/symbol-legacy-links.js";
import * as symbolExtract from "../../../src/traceability/symbol-extract.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

const spies: { mockRestore: () => void }[] = [];
function track<T extends { mockRestore: () => void }>(spy: T): T {
  spies.push(spy);
  return spy;
}
afterEach(() => {
  for (const spy of spies.splice(0).reverse()) spy.mockRestore();
  removeTempWorkspaces();
});

const MANIFEST = ".kb/symbols.yaml";
const sha256 = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");

// Source analysis is cached by content, so every workspace gets its own.
let generation = 0;
function workspace(
  manifest: string | null,
  sources: Record<string, string> = {},
): string {
  generation += 1;
  const files: Record<string, string> = {};
  for (const [file, content] of Object.entries(sources))
    files[file] = file.startsWith("src/")
      ? `${content}// workspace ${generation}\n`
      : content;
  if (manifest !== null) files[MANIFEST] = manifest;
  return tempWorkspace(files);
}

const GREET =
  'export function greet() {\n  return "hi";\n}\nexport function wave() {}\n';

/** A manifest entry, one property per line, in the order given. */
const entry = (fields: Record<string, string>, indent = "  ") =>
  Object.entries(fields)
    .map(
      ([key, value], index) =>
        `${index === 0 ? `${indent}- ` : `${indent}  `}${key}: ${value}`,
    )
    .join("\n");
const manifest = (...entries: string[]) =>
  ["symbols:", ...entries, ""].join("\n");
const greetEntry = (id: string, extra: Record<string, string> = {}) =>
  entry({
    id,
    title: "greet.ts",
    sourceFile: "src/greet.ts",
    links: "[REQ-1]",
    ...extra,
  });

/** Calls through to the extractor and records the paths it analyzed. */
function watchAnalysis(): string[] {
  const analyzed: string[] = [];
  const extract = symbolExtract.extractSymbolsFromStagedFile;
  track(
    spyOn(symbolExtract, "extractSymbolsFromStagedFile").mockImplementation(
      (file, lookup, options) => {
        analyzed.push(file.path);
        return extract(file, lookup, options);
      },
    ),
  );
  return analyzed;
}

describe("planning legacy links", () => {
  test("plans nothing, with no hash, without a manifest", () => {
    const root = workspace(null);
    expect(planSymbolLegacyLinks(root)).toEqual({
      manifestPath: MANIFEST,
      manifestHash: null,
      targets: [],
    });
    expect(planSymbolLegacyLinks(root, "other.yaml")).toEqual({
      manifestPath: "other.yaml",
      manifestHash: null,
      targets: [],
    });
  });

  test("plans nothing, with the manifest hash, for a manifest without a symbol list", () => {
    for (const content of [
      "symbols: [unclosed\n",
      "- symbols\n",
      "null\n",
      "symbols: 3\n",
    ]) {
      const root = workspace(null, { "custom/symbols.yaml": content });
      const written = fs.readFileSync(
        path.join(root, "custom/symbols.yaml"),
        "utf8",
      );
      expect(planSymbolLegacyLinks(root, "custom/symbols.yaml")).toEqual({
        manifestPath: "custom/symbols.yaml",
        manifestHash: sha256(written),
        targets: [],
      });
    }
  });

  test("plans the coarse traceability links of complete records without a reason", () => {
    const content = manifest(
      "  - 7",
      greetEntry("SYM-BARE"),
      greetEntry("6"),
      greetEntry("SYM-NUMBER-TITLE", { title: "8" }),
      greetEntry("SYM-NUMBER-SOURCE", { sourceFile: "9" }),
      greetEntry("SYM-REASONED", { granularity_reason: "~" }),
      greetEntry("SYM-NO-LINKS", { links: "[]" }),
      greetEntry("SYM-OTHER-LINKS", {
        links: "[{type: relates_to, target: REQ-1}, 5, null]",
      }),
      greetEntry("SYM-LINKS-NOT-LIST", {
        links: "REQ-1",
        relationships: "[7, null, {type: relates_to, target: REQ-1}]",
      }),
      greetEntry("SYM-TYPED-LINK", {
        links: "[{type: covered_by, target: TEST-1}]",
      }),
      greetEntry("SYM-RELATIONSHIP", {
        links: "REQ-1",
        relationships: "[{type: implements, target: REQ-1}]",
      }),
      greetEntry("SYM-RELATIONSHIPS-NOT-LIST", { relationships: "nope" }),
    );
    const root = workspace(content, { "src/greet.ts": GREET });
    const analyzed = watchAnalysis();
    const plan = planSymbolLegacyLinks(root);
    const target = (id: string) => ({
      id,
      title: "greet.ts",
      sourceFile: "src/greet.ts",
      granularSymbols: ["greet", "wave"],
    });
    expect(plan).toEqual({
      manifestPath: MANIFEST,
      manifestHash: sha256(content),
      targets: [
        target("SYM-BARE"),
        target("SYM-TYPED-LINK"),
        target("SYM-RELATIONSHIP"),
        target("SYM-RELATIONSHIPS-NOT-LIST"),
      ],
    });
    // One read and one analysis per source file.
    expect(analyzed).toEqual(["src/greet.ts"]);
  });

  test("reads and analyzes each source once, with one analyzer", () => {
    const root = workspace(
      manifest(
        greetEntry("SYM-1"),
        greetEntry("SYM-2"),
        entry({
          id: "SYM-SHAPE",
          title: "Shape",
          sourceFile: "src/shape.ts",
          links: "[REQ-1]",
        }),
        entry({
          id: "SYM-SHAPE-2",
          title: "Shape",
          sourceFile: "src/shape.ts",
          links: "[REQ-1]",
        }),
      ),
      {
        "src/greet.ts": GREET,
        "src/shape.ts":
          "export class Shape {\n  area() {\n    return 1;\n  }\n}\n",
      },
    );
    const reads: string[] = [];
    const read = fs.readFileSync;
    track(
      spyOn(fs, "readFileSync").mockImplementation(((
        file: string,
        ...rest: unknown[]
      ) => {
        if (typeof file === "string" && file.startsWith(root))
          reads.push(path.relative(root, file));
        return (read as (...args: unknown[]) => unknown)(file, ...rest);
      }) as never),
    );
    const provider = track(
      spyOn(symbolsTs, "createTsMorphSourceAnalysisProvider"),
    );
    const analyzed = watchAnalysis();
    expect(
      planSymbolLegacyLinks(root).targets.map(({ id, granularSymbols }) => [
        id,
        granularSymbols,
      ]),
    ).toEqual([
      ["SYM-1", ["greet", "wave"]],
      ["SYM-2", ["greet", "wave"]],
      ["SYM-SHAPE", ["Shape.area"]],
      ["SYM-SHAPE-2", ["Shape.area"]],
    ]);
    expect(reads).toEqual([MANIFEST, "src/greet.ts", "src/shape.ts"]);
    expect(analyzed).toEqual(["src/greet.ts", "src/shape.ts"]);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  test("builds no analyzer when every link is narrow at a glance", () => {
    const root = workspace(
      manifest(
        entry({
          id: "SYM-A",
          title: "alpha",
          sourceFile: "src/a.ts",
          links: "[REQ-1]",
        }),
      ),
      { "src/a.ts": "export function alpha() {}\n" },
    );
    const provider = track(
      spyOn(symbolsTs, "createTsMorphSourceAnalysisProvider"),
    );
    expect(planSymbolLegacyLinks(root).targets).toEqual([]);
    expect(provider).not.toHaveBeenCalled();
  });

  test("skips the analysis of exported declarations that have no members", () => {
    const memberless: Record<string, string> = {
      alpha: "export function alpha() {}\n",
      beta: "export default async function* beta<T>() {}\n",
      kappa: "export function kappa (x: number) {}\n",
      Gamma: "export declare interface Gamma {}\n",
      Delta: "export type Delta = string;\n",
      Eps: "export enum Eps {}\n",
      Zeta: "export const enum Zeta {}\n",
      eta: "// top\nexport const eta: number = 1;\n",
      theta: "export let theta = 2;\n",
      iota: "export var iota=3;\n",
      $store: "export const $store = 1;\n",
    };
    const files: Record<string, string> = {};
    const entries: string[] = [];
    for (const [title, content] of Object.entries(memberless)) {
      const file = `src/${title}.ts`;
      files[file] = `${content}export function other() {}\n`;
      entries.push(
        entry({
          id: `SYM-${title}`,
          title: `'${title}'`,
          sourceFile: file,
          links: "[REQ-1]",
        }),
      );
    }
    const root = workspace(manifest(...entries), files);
    const analyzed = watchAnalysis();
    expect(planSymbolLegacyLinks(root).targets).toEqual([]);
    expect(analyzed).toEqual([]);
  });

  test("analyzes every other link, and marks the ones that are coarse", () => {
    const sources: [string, string, string][] = [
      ["Shape", "shape", "export class Shape {\n  area() {}\n}\n"],
      ["K", "k", "export const K = class {\n  run() {}\n};\n"],
      ["local", "local", "function local() {}\nexport const other = 2;\n"],
      [
        "Delta",
        "delta",
        "export type Delta2 = string;\nexport function helper() {}\n",
      ],
      [
        "Omega",
        "omega",
        "export type Omega = string;\nexport class Omega {\n  go() {}\n}\n",
      ],
      ["greet", "greeter", "export function greeter() {}\n"],
      ["greet<T>", "generic", "export function greet<T>() {}\n"],
      [
        "1greet",
        "digit",
        "/*\nexport type 1greet = 1;\n*/\nexport function real() {}\n",
      ],
      ["notes.txt", "notes", "export function hidden() {}\n"],
      ["ghost", "ghost", ""],
    ];
    const files: Record<string, string> = {};
    const entries: string[] = [];
    for (const [title, name, content] of sources) {
      const file = name === "notes" ? "src/notes.txt" : `src/${name}.ts`;
      if (name !== "ghost") files[file] = content;
      entries.push(
        entry({
          id: `SYM-${name}`,
          title: `'${title}'`,
          sourceFile: file,
          links: "[REQ-1]",
        }),
      );
    }
    const root = workspace(manifest(...entries), files);
    const analyzed = watchAnalysis();
    expect(
      planSymbolLegacyLinks(root).targets.map(({ id, granularSymbols }) => [
        id,
        granularSymbols,
      ]),
    ).toEqual([
      ["SYM-shape", ["Shape.area"]],
      ["SYM-k", ["K.run"]],
      ["SYM-delta", ["helper"]],
      ["SYM-omega", ["Omega.go"]],
      ["SYM-greeter", ["greeter"]],
      ["SYM-generic", ["greet"]],
      ["SYM-digit", ["real"]],
    ]);
    expect(analyzed).toEqual([
      "src/shape.ts",
      "src/k.ts",
      "src/local.ts",
      "src/delta.ts",
      "src/omega.ts",
      "src/greeter.ts",
      "src/generic.ts",
      "src/digit.ts",
      "src/notes.txt",
      "src/ghost.ts",
    ]);
  });

  test("reads an absolute source path as it is", () => {
    const root = workspace(null, { "src/greet.ts": GREET });
    const absolute = path.join(root, "src/greet.ts");
    fs.mkdirSync(path.join(root, ".kb"));
    fs.writeFileSync(
      path.join(root, MANIFEST),
      manifest(greetEntry("SYM-ABS", { sourceFile: absolute })),
    );
    expect(planSymbolLegacyLinks(root).targets).toEqual([
      {
        id: "SYM-ABS",
        title: "greet.ts",
        sourceFile: absolute,
        granularSymbols: ["greet", "wave"],
      },
    ]);
  });

  test("treats a source the extractor cannot read as having no symbols", () => {
    const root = workspace(manifest(greetEntry("SYM-1")), {
      "src/greet.ts": GREET,
    });
    track(
      spyOn(symbolExtract, "extractSymbolsFromStagedFile").mockImplementation(
        () => {
          throw new Error("ambiguous");
        },
      ),
    );
    expect(planSymbolLegacyLinks(root).targets).toEqual([]);
  });
});

test("names the legacy-link action", () => {
  expect([
    SYMBOL_LEGACY_LINK_MARK_CODE,
    SYMBOL_LEGACY_LINK_MARK_ACTION_ID,
  ]).toEqual(["symbol_legacy_link_mark", "symbol-legacy-link-mark"]);
});

describe("marking legacy links", () => {
  const writes = () =>
    track(spyOn(kbSources, "writeFileAtomically")).mock.calls;
  const read = (root: string, file = MANIFEST) =>
    fs.readFileSync(path.join(root, file), "utf8");

  test("marks nothing, without reading a hash, when nothing is coarse", () => {
    expect(applySymbolLegacyLinks(workspace(null))).toEqual({
      marked: [],
      unmarked: [],
    });
    const root = workspace(manifest(greetEntry("SYM-1", { links: "[]" })), {
      "src/greet.ts": GREET,
    });
    expect(applySymbolLegacyLinks(root, { expectedHash: "stale" })).toEqual({
      marked: [],
      unmarked: [],
    });
  });

  test("refuses a manifest that changed since planning", () => {
    const root = workspace(manifest(greetEntry("SYM-1")), {
      "src/greet.ts": GREET,
    });
    expect(() =>
      applySymbolLegacyLinks(root, { expectedHash: "stale" }),
    ).toThrow(
      `${MANIFEST} changed since planning; rerun kibi migrate and approve the new plan.`,
    );
    const hash = sha256(read(root));
    expect(applySymbolLegacyLinks(root, { expectedHash: hash })).toEqual({
      marked: ["SYM-1"],
      unmarked: [],
    });
  });

  test("adds the reason above the status, or at the end of the entry", () => {
    // Entries whose text only looks like an id, reason or status line.
    const noted = [
      greetEntry("X-X"),
      greetEntry(" SYM-F"),
      greetEntry("SYM-E", { note: '"x - id: Y"' }),
      greetEntry("SYM-G", { note: '"x  granularity_reason: y"' }),
      greetEntry("SYM-H", { note: '"a status: b"' }),
    ];
    const content = [
      "symbols:",
      greetEntry("SYM-D", { status: "active" }),
      greetEntry("SYM-PLAIN"),
      greetEntry("SYM-NARROW", { links: "[]", status: "active" }),
      greetEntry('"SYM-C"  '),
      entry(
        {
          id: "'SYM-B'",
          title: "greet.ts",
          sourceFile: "src/greet.ts",
          links: "[REQ-1]",
          status: "active",
        },
        "  ",
      ),
      "  - null",
      ...noted,
      greetEntry("SYM-A"),
      "",
    ].join("\n");
    const root = workspace(content, { "src/greet.ts": GREET });
    const written = writes();
    expect(applySymbolLegacyLinks(root)).toEqual({
      marked: [
        "SYM-A",
        "SYM-B",
        "SYM-C",
        "SYM-D",
        "SYM-E",
        "SYM-F",
        "SYM-G",
        "SYM-H",
        "SYM-PLAIN",
        "X-X",
      ],
      unmarked: [],
    });
    const reason = (indent: string) =>
      `${indent}granularity_reason: legacy-link`;
    const expected = [
      "symbols:",
      greetEntry("SYM-D", { status: "active" }).replace(
        "    status: active",
        `${reason("    ")}\n    status: active`,
      ),
      greetEntry("SYM-PLAIN"),
      reason("    "),
      greetEntry("SYM-NARROW", { links: "[]", status: "active" }),
      greetEntry('"SYM-C"  '),
      reason("    "),
      entry(
        {
          id: "'SYM-B'",
          title: "greet.ts",
          sourceFile: "src/greet.ts",
          links: "[REQ-1]",
          granularity_reason: "legacy-link",
          status: "active",
        },
        "  ",
      ),
      "  - null",
      ...noted.flatMap((lines) => [lines, reason("    ")]),
      greetEntry("SYM-A"),
      reason("    "),
      "",
    ].join("\n");
    expect(written).toEqual([[path.join(root, MANIFEST), expected]]);
  });

  test("marks only the expected ids of a custom manifest", () => {
    // Entries at the indent of their key.
    const content = manifest(
      entry(
        {
          id: "SYM-1",
          title: "greet.ts",
          sourceFile: "src/greet.ts",
          links: "[REQ-1]",
        },
        "",
      ),
      entry(
        {
          id: "SYM-2",
          title: "greet.ts",
          sourceFile: "src/greet.ts",
          links: "[REQ-1]",
        },
        "",
      ),
    );
    const root = workspace(null, {
      "src/greet.ts": GREET,
      "custom.yaml": content,
    });
    const options = { manifestPath: "custom.yaml", expectedIds: ["SYM-2"] };
    expect(applySymbolLegacyLinks(root, options)).toEqual({
      marked: ["SYM-2"],
      unmarked: [],
    });
    expect(read(root, "custom.yaml")).toBe(
      `${content}  granularity_reason: legacy-link\n`,
    );
    expect(
      applySymbolLegacyLinks(root, { ...options, expectedIds: [] }),
    ).toEqual({ marked: [], unmarked: [] });
  });

  test("reports planned links it cannot mark in place, and writes nothing", () => {
    const content = manifest(
      entry({
        title: "greet.ts",
        id: "SYM-Z",
        sourceFile: "src/greet.ts",
        links: "[REQ-1]",
      }),
      greetEntry("SYM-Y", {
        links:
          "\n      - type: implements\n        target: REQ-1\n        granularity_reason: inline",
      }),
    );
    const root = workspace(content, { "src/greet.ts": GREET });
    const written = writes();
    expect(applySymbolLegacyLinks(root)).toEqual({
      marked: [],
      unmarked: ["SYM-Y", "SYM-Z"],
    });
    expect(written).toEqual([]);
  });

  test("adds a reason after the last line of a manifest without a final newline", () => {
    const content = manifest(greetEntry("SYM-1")).slice(0, -1);
    const root = workspace(content, { "src/greet.ts": GREET });
    applySymbolLegacyLinks(root);
    expect(read(root)).toBe(`${content}\n    granularity_reason: legacy-link`);
  });

  test("marks a repeated id once when its later entry has a reason already", () => {
    const content = manifest(
      greetEntry("SYM-1"),
      greetEntry("SYM-1", { granularity_reason: "legacy-link" }),
    );
    const root = workspace(content, { "src/greet.ts": GREET });
    expect(applySymbolLegacyLinks(root)).toEqual({
      marked: ["SYM-1"],
      unmarked: [],
    });
  });

  test("refuses a mark that would land in another entry or break the manifest", () => {
    const misplaced = manifest(
      greetEntry("SYM-1"),
      entry({
        title: "greet.ts",
        id: "SYM-2",
        sourceFile: "src/greet.ts",
        links: "[]",
        status: "active",
      }),
    );
    const misaligned = manifest(
      greetEntry("SYM-1")
        .replace("- id:", "-   id:")
        .replaceAll("\n    ", "\n      "),
    );
    for (const content of [misplaced, misaligned]) {
      const root = workspace(content, { "src/greet.ts": GREET });
      const written = writes();
      expect(() => applySymbolLegacyLinks(root)).toThrow(
        `${MANIFEST}: legacy-link reasons could not be added without changing other symbol fields; add granularity_reason: legacy-link by hand.`,
      );
      expect(written).toEqual([]);
      for (const spy of spies.splice(0)) spy.mockRestore();
    }
  });
});
