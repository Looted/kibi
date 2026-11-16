import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  QUANTITY_DUPLICATE_REVIEW_CODE,
  planQuantityDuplicateReviews,
  quantityDuplicateActions,
  quantityDuplicateNote,
} from "../../src/operations/migration/quantity-duplicate.js";
import { quantityWarnings } from "../../src/operations/mutation/quantity-warnings.js";
import {
  QUANTITY_DUPLICATE_RULE,
  QUANTITY_LAYER_SCHEMA_VERSION,
  QUANTITY_WORD_SHARE,
  type QuantityCode,
  type ValueFactEntry,
  collectQuantityDuplicateViolations,
  declaredDistinct,
  quantityDuplicatePairs,
  quantityDuplicateViolations,
  quantityLayerApplies,
  quantityPair,
  quantityValue,
  quantityWords,
  readQuantityInputs,
  valueFactEntry,
  valueFactKey,
} from "../../src/public/operations/quantity-layer.js";

function fact(
  id: string,
  key: string,
  value: ValueFactEntry["value"],
  extra: Partial<ValueFactEntry> = {},
): ValueFactEntry {
  return {
    id,
    key,
    propertyKey: key.split(".").at(-1) ?? key,
    claimText: id,
    value,
    display: "5",
    distinctFrom: [],
    requirements: [`REQ-${id}`],
    path: `.kb/facts/${id}.md`,
    ...extra,
  };
}

const FIVE = { kind: "number", value: 5, unit: "" } as const;

function code(
  symbols: Record<string, string[]>,
  files: Record<string, string>,
  sources: Record<string, string[]> = {},
): QuantityCode {
  const toSets = (record: Record<string, string[]>) =>
    new Map(Object.entries(record).map(([key, list]) => [key, new Set(list)]));
  return {
    symbolsByRequirement: toSets(symbols),
    fileBySymbol: new Map(Object.entries(files)),
    valueSourcesByFact: toSets(sources),
  };
}

describe("quantity values", () => {
  test("numbers compare after unit canonicalization, and 0 and 1 are skipped", () => {
    expect(QUANTITY_LAYER_SCHEMA_VERSION).toBe(19);
    expect(QUANTITY_WORD_SHARE).toBe(0.5);
    expect(
      quantityValue({ value_type: "int", value_int: 2, unit: "s" }),
    ).toEqual({ kind: "number", value: 2000, unit: "ms" });
    expect(
      quantityValue({ value_type: "number", value_number: 2000, unit: "MS" }),
    ).toEqual({ kind: "number", value: 2000, unit: "ms" });
    expect(
      quantityValue({ value_type: "int", value_int: 3, unit: "KiB" }),
    ).toEqual({ kind: "number", value: 3072, unit: "bytes" });
    expect(
      quantityValue({ value_type: "int", value_int: "7", unit: "words" }),
    ).toEqual({ kind: "number", value: 7, unit: "words" });
    expect(quantityValue({ value_type: "int", value_int: 5 })).toEqual(FIVE);
    for (const trivial of [0, 1])
      for (const unit of [undefined, "s"])
        expect(
          quantityValue({ value_type: "int", value_int: trivial, unit }),
        ).toBeNull();
    expect(quantityValue({ value_type: "int", value_int: "x" })).toBeNull();
    expect(quantityValue({ value_type: "int", value_int: null })).toBeNull();
    expect(quantityValue({ value_type: "bool", value_bool: true })).toBeNull();
    expect(
      quantityValue({ value_type: "string", value_string: "a" }),
    ).toBeNull();
    expect(quantityValue({})).toBeNull();
  });

  test("a set of two or more distinct members is a quantity, in sorted order", () => {
    expect(
      quantityValue({ value_type: "set", value_set: [" b", "a", "b", 3] }),
    ).toEqual({ kind: "set", members: ["a", "b"] });
    expect(
      quantityValue({ value_type: "set", value_set: ["a", "a"] }),
    ).toBeNull();
    expect(quantityValue({ value_type: "set", value_set: "a" })).toBeNull();
  });

  test("words are singular content words of a key or a claim", () => {
    expect([...quantityWords("max_bound_participant_words")]).toEqual([
      "max",
      "bound",
      "participant",
      "word",
    ]);
    expect([...quantityWords("The limit shall be at most 5 bullets")]).toEqual([
      "limit",
      "most",
      "5",
      "bullet",
    ]);
    expect(quantityWords("").size).toBe(0);
  });
});

describe("quantity pairs", () => {
  const sharedFile = code(
    { "REQ-A": ["SYM-a"], "REQ-B": ["SYM-b"] },
    { "SYM-a": "src/x.ts", "SYM-b": "src/x.ts" },
  );

  test("equal values in one file pair on property words", () => {
    const left = fact("A", "s.bullet_limit", FIVE, {
      requirements: ["REQ-A"],
    });
    const right = fact("B", "t.bullets_per_block", FIVE, {
      requirements: ["REQ-B"],
    });
    expect(quantityPair(left, right, sharedFile)).toEqual({
      left,
      right,
      files: ["src/x.ts"],
      signals: ["property_words"],
    });
  });

  test("each signal is named, and none means no pair", () => {
    const left = fact("A", "s.alpha", FIVE, {
      requirements: ["REQ-A"],
      claimText: "The guidance block holds five bullets",
    });
    const right = fact("B", "t.beta", FIVE, {
      requirements: ["REQ-B"],
      claimText: "A guidance block holds at most five bullets",
    });
    const shared = code(
      { "REQ-A": ["SYM-a"], "REQ-B": ["SYM-a", "SYM-b"] },
      { "SYM-a": "src/x.ts", "SYM-b": "src/x.ts" },
      { A: ["SYM-b"] },
    );
    expect(quantityPair(left, right, shared)?.signals).toEqual([
      "shared_symbol",
      "proof_value_source",
      "claim_words",
    ]);
    const reverse = code(
      { "REQ-A": ["SYM-a"], "REQ-B": ["SYM-b"] },
      { "SYM-a": "src/x.ts", "SYM-b": "src/x.ts" },
      { B: ["SYM-a"] },
    );
    expect(
      quantityPair(
        { ...left, claimText: "x" },
        { ...right, claimText: "y" },
        reverse,
      )?.signals,
    ).toEqual(["proof_value_source"]);
    expect(
      quantityPair(
        { ...left, claimText: "x" },
        { ...right, claimText: "y" },
        sharedFile,
      ),
    ).toBeNull();
  });

  test("no pair on one key, an uncompared value, other values, a shared requirement, a declared difference or no common file", () => {
    const left = fact("A", "s.limit", FIVE, { requirements: ["REQ-A"] });
    const right = fact("B", "t.limit", FIVE, { requirements: ["REQ-B"] });
    expect(
      quantityPair(left, { ...right, key: "s.limit" }, sharedFile),
    ).toBeNull();
    expect(
      quantityPair(left, { ...right, value: null }, sharedFile),
    ).toBeNull();
    expect(
      quantityPair({ ...left, value: null }, right, sharedFile),
    ).toBeNull();
    const six = { ...right, value: { ...FIVE, value: 6 } };
    expect(quantityPair(left, six, sharedFile)).toBeNull();
    expect(
      quantityPair(left, six, sharedFile, { compareValues: false }),
    ).not.toBeNull();
    expect(
      quantityPair(
        left,
        { ...right, value: { kind: "set", members: ["a", "b"] } },
        sharedFile,
        { compareValues: false },
      ),
    ).toBeNull();
    expect(
      quantityPair(
        left,
        { ...right, requirements: ["REQ-B", "REQ-A"] },
        sharedFile,
      ),
    ).toBeNull();
    expect(
      quantityPair({ ...left, distinctFrom: ["t.limit"] }, right, sharedFile),
    ).toBeNull();
    expect(
      quantityPair(left, { ...right, distinctFrom: ["s.limit"] }, sharedFile),
    ).toBeNull();
    const apart = code(
      { "REQ-A": ["SYM-a"], "REQ-B": ["SYM-b", "SYM-orphan"] },
      { "SYM-a": "src/x.ts", "SYM-b": "src/y.ts" },
    );
    expect(quantityPair(left, right, apart)).toBeNull();
    expect(quantityPair(left, right, code({}, {}))).toBeNull();
  });

  test("declaredDistinct reads either side", () => {
    const left = { key: "a.b", distinctFrom: ["c.d"] };
    const right = { key: "c.d", distinctFrom: [] };
    expect(declaredDistinct(left, right)).toBe(true);
    expect(declaredDistinct(right, left)).toBe(true);
    expect(declaredDistinct(right, { key: "e.f", distinctFrom: [] })).toBe(
      false,
    );
  });

  test("pairs are found once per pair, across files, in id order", () => {
    const facts = [
      fact("C", "u.limit", FIVE, { requirements: ["REQ-C"] }),
      fact("A", "s.limit", FIVE, { requirements: ["REQ-A"] }),
      fact("B", "t.limit", FIVE, { requirements: ["REQ-B"] }),
      fact("N", "v.limit", null, { requirements: ["REQ-A"] }),
    ];
    const both = code(
      {
        "REQ-A": ["SYM-a", "SYM-a2"],
        "REQ-B": ["SYM-b", "SYM-b2"],
        "REQ-C": ["SYM-c"],
      },
      {
        "SYM-a": "src/x.ts",
        "SYM-a2": "src/y.ts",
        "SYM-b": "src/x.ts",
        "SYM-b2": "src/y.ts",
        "SYM-c": "src/y.ts",
      },
    );
    const pairs = quantityDuplicatePairs(facts, both);
    expect(pairs.map(({ left, right }) => `${left.id}-${right.id}`)).toEqual([
      "A-B",
      "A-C",
      "B-C",
    ]);
    expect(pairs[0]?.files).toEqual(["src/x.ts", "src/y.ts"]);
  });

  test("findings name both facts, and a distinct_from naming no value fact", () => {
    const left = fact("A", "s.limit", FIVE, {
      requirements: ["REQ-A"],
      distinctFrom: ["gone.key", "t.other"],
    });
    const right = fact("B", "t.limit", FIVE, { requirements: ["REQ-B"] });
    const findings = quantityDuplicateViolations(
      [left, right],
      sharedFile,
      new Set(["s.limit", "t.limit", "t.other"]),
    );
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      rule: QUANTITY_DUPLICATE_RULE,
      entityId: "A",
      source: ".kb/facts/A.md",
      evidence: {
        key: "s.limit",
        other: "t.limit",
        otherId: "B",
        files: ["src/x.ts"],
        signals: ["property_words"],
      },
    });
    expect(findings[0]?.description).toBe(
      "Value facts A (s.limit = 5) and B (t.limit = 5) state one quantity under two names: their requirements REQ-A and REQ-B are implemented in src/x.ts. A value changed under one name stays stale under the other, and no rule compares them",
    );
    expect(findings[0]?.suggestion).toContain(
      "moving the facts scenarios assume on the old key with them",
    );
    expect(findings[0]?.suggestion).toContain(
      "add t.limit to distinct_from on A (or s.limit on B)",
    );
    expect(findings[1]).toEqual({
      rule: QUANTITY_DUPLICATE_RULE,
      entityId: "A",
      description:
        "Value fact A lists gone.key under distinct_from, but no active value fact has that subject_key and property_key, so the entry exempts nothing",
      suggestion:
        "Name the subject_key.property_key of an active value fact, or remove gone.key from distinct_from",
      source: ".kb/facts/A.md",
      evidence: { key: "s.limit", distinctFrom: "gone.key" },
    });
  });

  test("a value fact entry shows its value as written", () => {
    const entry = (data: Record<string, unknown>) =>
      valueFactEntry({ id: "F", data, path: "p" }, valueFactKey(data), []);
    expect(
      entry({
        subject_key: "s",
        property_key: "t",
        value_type: "int",
        value_int: 5,
        unit: "s",
        title: "Title",
      }),
    ).toMatchObject({ key: "s.t", display: "5 s", claimText: "Title" });
    expect(
      entry({ value_type: "set", value_set: ["a", "b"], claim_text: "C" }),
    ).toMatchObject({ key: ".", display: "{a, b}", claimText: "C" });
    expect(entry({ value_type: "number", value_number: 2.5 }).display).toBe(
      "2.5",
    );
    expect(entry({ value_type: "string", value_string: "x" }).display).toBe(
      "x",
    );
    expect(entry({ value_type: "bool", value_bool: false }).display).toBe(
      "false",
    );
  });
});

/** A workspace with two requirements whose value facts state one limit. */
describe("the authored KB", () => {
  let root: string;

  function write(relativePath: string, content: string): void {
    const target = path.join(root, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  function manifest(schemaVersion: number): void {
    write(
      ".kb/manifest.json",
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
  }

  function valueFact(
    id: string,
    subject: string,
    property: string,
    value: number,
    extra = "",
  ): void {
    write(
      `.kb/facts/${id}.md`,
      `---\nid: ${id}\ntype: fact\ntitle: ${id}\nstatus: active\nfact_kind: property_value\nsubject_key: ${subject}\nproperty_key: ${property}\noperator: eq\nvalue_type: int\nvalue_int: ${value}\nclaim_key: CLAIM-${id}\nclaim_text: ${property}\n${extra}---\n`,
    );
  }

  function requirement(id: string, factId: string, extra = ""): void {
    write(
      `.kb/requirements/${id}.md`,
      `---\nid: ${id}\ntype: req\ntitle: ${id}\nstatus: open\nlinks:\n  - type: requires_property\n    target: ${factId}\n${extra}---\n`,
    );
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-quantity-"));
    manifest(19);
    valueFact("FACT-block-bullets", "plugin.guidance_block", "bullet_limit", 5);
    valueFact("FACT-injection-bullets", "plugin", "bullets_per_injection", 5);
    valueFact("FACT-unlinked", "plugin", "bullet_cap", 5);
    valueFact("FACT-retired", "plugin", "bullet_max", 5, "status: retired\n");
    requirement("REQ-block", "FACT-block-bullets");
    requirement("REQ-injection", "FACT-injection-bullets");
    write(
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-inject\n    title: injectGuidance\n    sourceFile: src/guidance.ts\n    relationships:\n      - type: implements\n        target: REQ-block\n      - type: implements\n        target: REQ-injection\n  - id: SYM-trim\n    title: trimGuidance\n    sourceFile: src/guidance.ts\n    relationships:\n      - type: implements\n        target: REQ-block\n",
    );
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("reads grounded value facts, their requirements and the files implementing them", () => {
    const inputs = readQuantityInputs(root);
    expect(inputs.facts.map((entry) => entry.id)).toEqual([
      "FACT-block-bullets",
      "FACT-injection-bullets",
    ]);
    expect([...inputs.byId.keys()].sort()).toEqual([
      "FACT-block-bullets",
      "FACT-injection-bullets",
      "FACT-unlinked",
    ]);
    expect([...inputs.allValueKeys].sort()).toEqual([
      "plugin.bullet_cap",
      "plugin.bullets_per_injection",
      "plugin.guidance_block.bullet_limit",
    ]);
    expect(inputs.code.fileBySymbol.get("SYM-inject")).toBe("src/guidance.ts");
    expect([
      ...(inputs.code.symbolsByRequirement.get("REQ-block") ?? []),
    ]).toEqual(["SYM-inject", "SYM-trim"]);
  });

  test("the check reports the pair at schema 19 only, and only when the rule is selected", () => {
    const rules = new Set([QUANTITY_DUPLICATE_RULE]);
    const findings = collectQuantityDuplicateViolations(rules, root);
    expect(findings.map((f) => [f.entityId, f.evidence])).toEqual([
      [
        "FACT-block-bullets",
        {
          key: "plugin.guidance_block.bullet_limit",
          other: "plugin.bullets_per_injection",
          otherId: "FACT-injection-bullets",
          files: ["src/guidance.ts"],
          signals: ["shared_symbol", "property_words", "claim_words"],
        },
      ],
    ]);
    expect(collectQuantityDuplicateViolations(new Set(), root)).toEqual([]);
    expect(quantityLayerApplies(root)).toBe(true);
    manifest(18);
    expect(quantityLayerApplies(root)).toBe(false);
    expect(collectQuantityDuplicateViolations(rules, root)).toEqual([]);
    rmSync(path.join(root, ".kb/manifest.json"));
    expect(quantityLayerApplies(root)).toBe(false);
  });

  test("distinct_from, a superseded requirement or a closed fact ends the pair", () => {
    const rules = new Set([QUANTITY_DUPLICATE_RULE]);
    valueFact(
      "FACT-injection-bullets",
      "plugin",
      "bullets_per_injection",
      5,
      "distinct_from:\n  - plugin.guidance_block.bullet_limit\n",
    );
    expect(collectQuantityDuplicateViolations(rules, root)).toEqual([]);
    valueFact(
      "FACT-injection-bullets",
      "plugin",
      "bullets_per_injection",
      5,
      "distinct_from:\n  - plugin.gone\n",
    );
    expect(
      collectQuantityDuplicateViolations(rules, root).map((f) => f.description),
    ).toEqual([
      expect.stringContaining(
        "FACT-block-bullets (plugin.guidance_block.bullet_limit = 5)",
      ),
      expect.stringContaining("lists plugin.gone under distinct_from"),
    ]);
    valueFact("FACT-injection-bullets", "plugin", "bullets_per_injection", 5);
    write(
      ".kb/requirements/REQ-new.md",
      "---\nid: REQ-new\ntype: req\ntitle: New\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-injection\n---\n",
    );
    expect(collectQuantityDuplicateViolations(rules, root)).toEqual([]);
    rmSync(path.join(root, ".kb/requirements/REQ-new.md"));
    valueFact(
      "FACT-injection-bullets",
      "plugin",
      "bullets_per_injection",
      5,
      "status: superseded\n",
    );
    expect(collectQuantityDuplicateViolations(rules, root)).toEqual([]);
  });

  test("a proof that reads its value from the other requirement's symbol pairs the facts", () => {
    write(
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-a\n    title: a\n    sourceFile: src/guidance.ts\n    relationships:\n      - type: implements\n        target: REQ-block\n  - id: SYM-b\n    title: b\n    sourceFile: src/guidance.ts\n    relationships:\n      - type: implements\n        target: REQ-injection\n",
    );
    valueFact("FACT-injection-bullets", "plugin", "cap", 5);
    expect(planQuantityDuplicateReviews(root)).toEqual([]);
    write(
      ".kb/tests/TEST-proof.md",
      "---\nid: TEST-proof\ntype: test\ntitle: Proof\nstatus: active\nproof_contract:\n  proves:\n    - CLAIM-FACT-block-bullets\n  value_source:\n    - symbol_id: SYM-b\n    - {}\n---\n",
    );
    write(
      ".kb/tests/TEST-plain.md",
      "---\nid: TEST-plain\ntype: test\ntitle: Plain\nstatus: active\nproof_contract:\n  value_source: []\n---\n",
    );
    expect(
      planQuantityDuplicateReviews(root).map((pair) => pair.signals),
    ).toEqual([["proof_value_source"]]);
  });

  test("relationship shards count, and malformed shards or manifests are skipped", () => {
    write(
      ".kb/requirements/REQ-block.md",
      "---\nid: REQ-block\ntype: req\ntitle: REQ-block\nstatus: open\n---\n",
    );
    expect(planQuantityDuplicateReviews(root)).toEqual([]);
    write(
      ".kb/relationships/aa.yaml",
      "relationships:\n  - id: rel-1\n    type: requires_property\n    from: REQ-block\n    to: FACT-block-bullets\n    created_at: 2026-11-16T00:00:00.000Z\n    created_by: test\n    source: test\n",
    );
    expect(planQuantityDuplicateReviews(root)).toHaveLength(1);
    write(".kb/relationships/aa.yaml", "relationships: [: broken");
    write(".kb/symbols.yaml", "symbols: [: broken");
    const inputs = readQuantityInputs(root);
    expect(inputs.facts.map((entry) => entry.id)).toEqual([
      "FACT-injection-bullets",
    ]);
    expect(inputs.code.fileBySymbol.size).toBe(0);
  });

  test("the migration lists each pair as a review action and its note", () => {
    const [action] = quantityDuplicateActions(root);
    expect(action).toMatchObject({
      id: "quantity-duplicate-FACT-block-bullets-FACT-injection-bullets",
      code: QUANTITY_DUPLICATE_REVIEW_CODE,
      safety: "review",
      autoApplicable: false,
      affectedEntityIds: ["FACT-block-bullets", "FACT-injection-bullets"],
      affectedFiles: [
        ".kb/facts/FACT-block-bullets.md",
        ".kb/facts/FACT-injection-bullets.md",
      ],
    });
    expect(quantityDuplicateNote(2, true)).toStartWith(
      "dry run: Schema 19: quantity-duplicate now blocks",
    );
    expect(quantityDuplicateNote(2, false)).toStartWith(
      "Schema 19: quantity-duplicate now blocks two value facts of current requirements that state one quantity under different subject or property keys; 2 pair(s) found.",
    );
  });

  test("kb_upsert warns on a value fact write that states the twin's quantity, or leaves it stale", () => {
    const entity = (value: number) => ({
      fact_kind: "property_value",
      subject_key: "plugin",
      property_key: "bullets_per_injection",
      value_type: "int",
      value_int: value,
    });
    const warn = (value: number, before?: number) =>
      quantityWarnings({
        type: "fact",
        id: "FACT-injection-bullets",
        entity: entity(value),
        before: before === undefined ? undefined : entity(before),
        relationships: [],
        workspaceRoot: root,
      });
    const [same] = warn(5);
    expect(same).toBe(
      "quantity-duplicate: FACT-injection-bullets (plugin.bullets_per_injection = 5) states the same quantity as FACT-block-bullets (plugin.guidance_block.bullet_limit = 5) of REQ-block; both are implemented in src/guidance.ts. If they are one quantity, ground both claims on one subject_key and property_key so a change to either is checked against the other; if they are different quantities, add plugin.guidance_block.bullet_limit to distinct_from on FACT-injection-bullets. kb_check blocks the pair otherwise.",
    );
    // A dry run: the stored fact still holds 5.
    expect(warn(6)).toEqual([
      expect.stringContaining(
        "FACT-injection-bullets (plugin.bullets_per_injection) held 5 before this write, the value still stated by FACT-block-bullets",
      ),
    ]);
    // After the write, the caller passes the entity as it was.
    expect(warn(7, 5)).toHaveLength(1);
    expect(warn(7, 7)).toEqual([]);
    expect(
      quantityWarnings({
        type: "fact",
        id: "FACT-unlinked",
        entity: entity(5),
        relationships: [],
        workspaceRoot: root,
      }),
    ).toEqual([]);
    expect(
      quantityWarnings({
        type: "fact",
        id: "FACT-injection-bullets",
        entity: { fact_kind: "subject" },
        relationships: [],
        workspaceRoot: root,
      }),
    ).toEqual([]);
  });

  test("kb_upsert warns on a requirement write that grounds a twin", () => {
    const warn = (relationships: Record<string, unknown>[]) =>
      quantityWarnings({
        type: "req",
        id: "REQ-block",
        entity: {},
        relationships,
        workspaceRoot: root,
      });
    expect(
      warn([
        { type: "requires_property", from: "REQ-block", to: "FACT-unlinked" },
        { type: "requires_property", from: "REQ-block", to: "FACT-missing" },
        { type: "constrains", from: "REQ-block", to: "FACT-retired" },
        { type: "requires_property", from: "REQ-other", to: "FACT-unlinked" },
      ]),
    ).toEqual([
      "quantity-duplicate: FACT-unlinked (plugin.bullet_cap = 5) states the same quantity as FACT-injection-bullets (plugin.bullets_per_injection = 5) of REQ-injection; both are implemented in src/guidance.ts. If they are one quantity, ground both claims on one subject_key and property_key so a change to either is checked against the other; if they are different quantities, add plugin.bullets_per_injection to distinct_from on FACT-unlinked. kb_check blocks the pair otherwise.",
    ]);
    // The fact the requirement already grounds is not its own twin.
    expect(
      warn([
        {
          type: "requires_property",
          from: "REQ-block",
          to: "FACT-block-bullets",
        },
      ]),
    ).toEqual([
      expect.stringContaining(
        "FACT-block-bullets (plugin.guidance_block.bullet_limit = 5) states the same quantity as FACT-injection-bullets",
      ),
    ]);
    expect(warn([])).toEqual([]);
    // A new link to a fact whose key words match a fact in the same file
    // gets a note even though the values differ; an existing link does not.
    valueFact("FACT-six", "plugin", "bullets_per_injection_cap", 6);
    expect(
      warn([{ type: "requires_property", from: "REQ-block", to: "FACT-six" }]),
    ).toEqual([
      "quantity-duplicate (note): FACT-six (plugin.bullets_per_injection_cap = 6) may state the same quantity as FACT-injection-bullets (plugin.bullets_per_injection = 5) of REQ-injection: their key or claim words match and both are implemented in src/guidance.ts. If it is one quantity, ground both claims on one subject_key and property_key and settle the value; if not, add plugin.bullets_per_injection to distinct_from on FACT-six. kb_check does not block this while the values differ.",
    ]);
    valueFact("FACT-seven", "plugin", "window", 7);
    expect(
      warn([
        { type: "requires_property", from: "REQ-block", to: "FACT-seven" },
      ]),
    ).toEqual([]);
    requirement("REQ-block", "FACT-six");
    expect(
      warn([{ type: "requires_property", from: "REQ-block", to: "FACT-six" }]),
    ).toEqual([]);
    expect(
      quantityWarnings({
        type: "adr",
        id: "ADR-x",
        entity: {},
        relationships: [],
        workspaceRoot: root,
      }),
    ).toEqual([]);
  });

  test("kb_upsert warnings wait for schema 19 and never fail the write", () => {
    manifest(18);
    expect(
      quantityWarnings({
        type: "req",
        id: "REQ-other",
        entity: {},
        relationships: [
          { type: "requires_property", from: "REQ-other", to: "FACT-unlinked" },
        ],
        workspaceRoot: root,
      }),
    ).toEqual([]);
    manifest(19);
    expect(
      quantityWarnings({
        type: "fact",
        id: "FACT-injection-bullets",
        entity: null as never,
        relationships: [],
        workspaceRoot: root,
      }),
    ).toEqual([]);
  });
});
