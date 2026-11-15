import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dump } from "js-yaml";
import * as markdown from "../../../src/extractors/markdown.js";
import {
  applyInventoryRederivation,
  applyInventoryRederivationDroppingGrounding,
  applySafeInventoryRederivations,
  planInventoryRederivation,
} from "../../../src/operations/migration/inventory-rederive.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import * as prose from "../../../src/operations/semantic-advisor/analyze-prose.js";
import * as boundary from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import * as shards from "../../../src/relationships/shards.js";
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

const realExtract = markdown.extractFromMarkdown;
const VERSION = "kibi.semantic-inventory.v1";
/** The source hash the stubbed advisor reports for the current prose. */
const HASH = "a".repeat(64);
/** The stale source hash every stored requirement starts with. */
const OLD = "b".repeat(64);

type Entry = {
  claim_key: string;
  claim_text: string;
  role: string;
  status: string;
  span: { start: number; end: number };
  semantic_key?: string;
  reason?: string;
};

const key = (n: number) =>
  `CLAIM-${n.toString(16).toUpperCase().padStart(16, "0")}`;
const claim = (
  n: number,
  role: string,
  status: string,
  extra: Partial<Entry> = {},
): Entry => ({
  claim_key: key(n),
  claim_text: `Claim ${n}.`,
  role,
  status,
  span: { start: n * 10, end: n * 10 + 8 },
  ...extra,
});

function reqFile(
  inventory: unknown[],
  extra: Record<string, unknown> = {},
  id = "REQ-1",
): string {
  return `---\n${dump(
    {
      id,
      title: id,
      status: "open",
      semantic_inventory_version: VERSION,
      semantic_source_field: "semantic_text",
      semantic_source_hash: OLD,
      semantic_inventory: inventory,
      ...extra,
    },
    { lineWidth: -1 },
  )}---\n\nBody.\n`;
}

type Verdict = { applicable: boolean; errors: string[]; sourceHash: string };
type Check = {
  properties: Record<string, unknown>;
  relationships: { type: string; from: string; to: string }[];
};
const pass: Verdict = { applicable: true, errors: [], sourceHash: HASH };
const fail = (...errors: string[]): Verdict => ({
  applicable: true,
  errors,
  sourceHash: HASH,
});
/** Stored requirements are stale; anything carrying the current hash passes. */
const staleUntilRederived = (check: Check): Verdict =>
  check.properties.semantic_source_hash === HASH ? pass : fail("stale");

/**
 * Stub the semantic advisor with `propositions` and the ingestion boundary
 * with `judge`; returns every boundary check in call order.
 */
function advisor(
  propositions: Entry[] | ((call: number) => Entry[]),
  judge: (check: Check, call: number) => Verdict = staleUntilRederived,
): { checks: Check[]; analyzed: Record<string, unknown>[] } {
  const checks: Check[] = [];
  const analyzed: Record<string, unknown>[] = [];
  track(
    spyOn(prose, "analyzeSemanticAdvisorInput").mockImplementation(((input: {
      payload: { properties: Record<string, unknown> };
    }) => {
      analyzed.push(input.payload.properties);
      return {
        receipt: {
          propositions:
            typeof propositions === "function"
              ? propositions(analyzed.length)
              : propositions,
        },
      };
    }) as never),
  );
  track(
    spyOn(boundary, "validateSemanticInventoryBoundary").mockImplementation(((
      payload: { properties: Record<string, unknown> },
      relationships: Check["relationships"],
    ) => {
      const check = {
        properties: payload.properties,
        relationships: [...relationships],
      };
      checks.push(check);
      return judge(check, checks.length);
    }) as never),
  );
  return { checks, analyzed };
}

type Doc = {
  entity: Record<string, unknown>;
  relationships?: { type: string; from: string; to: string }[];
};
/** Serve `docs` (workspace-relative) from extraction; other files are real. */
function extracted(root: string, docs: Record<string, Doc | Error>) {
  return track(
    spyOn(markdown, "extractFromMarkdown").mockImplementation(((
      file: string,
    ) => {
      const doc = docs[path.relative(root, file)];
      if (doc === undefined) return realExtract(file);
      if (doc instanceof Error) throw doc;
      return { entity: doc.entity, relationships: doc.relationships ?? [] };
    }) as never),
  );
}
const fact = (id: string, claimKey?: string): Doc => ({
  entity: {
    id,
    type: "fact",
    ...(claimKey === undefined ? {} : { claim_key: claimKey }),
  },
});
const noShards = () =>
  track(spyOn(shards, "readAllShards").mockReturnValue([]));

const REQ = ".kb/requirements/REQ-1.md";
const read = (root: string, relative = REQ) =>
  readFileSync(path.join(root, relative), "utf8");

describe("re-deriving one claim at a time", () => {
  const STORED: Entry[] = [
    claim(4, "normative", "modeled", { claim_text: "Old 4." }),
    claim(5, "normative", "modeled", {
      semantic_key: "S5",
      reason: "s5",
      span: { start: 51, end: 58 },
    }),
    claim(6, "rationale", "nonlogical", { reason: "s6" }),
    claim(7, "example", "nonlogical", { span: { start: 69, end: 78 } }),
    claim(8, "rationale", "nonlogical"),
    claim(9, "descriptive", "modeled", { semantic_key: "S9", reason: "s9" }),
    claim(10, "normative", "ambiguous", { semantic_key: "S10", reason: "s10" }),
    claim(11, "normative", "modeled"),
    claim(12, "normative", "ontology_gap"),
    claim(13, "normative", "ambiguous"),
    claim(14, "rationale", "nonlogical"),
    claim(15, "normative", "ambiguous"),
  ];
  const CURRENT: Entry[] = [
    claim(1, "rationale", "nonlogical", { reason: "r1" }),
    claim(2, "normative", "modeled"),
    claim(3, "normative", "ambiguous", { reason: "p3" }),
    claim(4, "normative", "ontology_gap"),
    claim(5, "example", "nonlogical", { reason: "p5" }),
    claim(6, "subjective", "nonlogical", { reason: "p6" }),
    claim(7, "example", "nonlogical"),
    claim(8, "normative", "modeled", { reason: "p8" }),
    claim(9, "normative", "ambiguous", { semantic_key: "P9" }),
    claim(10, "normative", "modeled", { span: { start: 100, end: 999 } }),
    claim(11, "normative", "modeled", { semantic_key: "P11" }),
    claim(12, "normative", "ambiguous", { reason: "p12" }),
    claim(14, "rationale", "nonlogical"),
    claim(15, "rationale", "nonlogical"),
    claim(16, "definition", "nonlogical"),
  ];

  test("carries what the author established and leaves every new reading unresolved", () => {
    const root = tempWorkspace({ [REQ]: reqFile(STORED) });
    noShards();
    const { checks } = advisor(CURRENT);

    const [plan, ...rest] = planInventoryRederivation(root);

    expect(rest).toEqual([]);
    expect(plan?.contract.semantic_inventory).toStrictEqual([
      claim(1, "rationale", "nonlogical", { reason: "r1" }),
      claim(2, "normative", "missing"),
      claim(3, "normative", "ambiguous", { reason: "p3" }),
      claim(4, "normative", "ontology_gap"),
      claim(5, "example", "nonlogical", { reason: "p5" }),
      claim(6, "subjective", "nonlogical", { reason: "s6" }),
      claim(7, "example", "nonlogical"),
      claim(8, "normative", "missing", { reason: "p8" }),
      claim(9, "normative", "modeled", { semantic_key: "S9" }),
      claim(10, "normative", "ambiguous", {
        span: { start: 100, end: 999 },
        reason: "s10",
      }),
      claim(11, "normative", "modeled"),
      claim(12, "normative", "ontology_gap"),
      claim(14, "rationale", "nonlogical"),
      claim(15, "rationale", "nonlogical"),
      claim(16, "definition", "missing"),
    ]);
    const was = (role: string, status: string) => ({ role, status });
    expect(plan?.changes).toStrictEqual([
      {
        claim_key: key(1),
        change: "new_context",
        after: was("rationale", "nonlogical"),
      },
      {
        claim_key: key(2),
        change: "new_unresolved",
        after: was("normative", "missing"),
      },
      {
        claim_key: key(3),
        change: "new_unresolved",
        after: was("normative", "ambiguous"),
      },
      {
        claim_key: key(4),
        change: "new_unresolved",
        after: was("normative", "ontology_gap"),
      },
      {
        claim_key: key(5),
        change: "now_context",
        before: was("normative", "modeled"),
        after: was("example", "nonlogical"),
      },
      {
        claim_key: key(6),
        change: "role_changed",
        before: was("rationale", "nonlogical"),
        after: was("subjective", "nonlogical"),
      },
      {
        claim_key: key(7),
        change: "span_changed",
        before: was("example", "nonlogical"),
        after: was("example", "nonlogical"),
      },
      {
        claim_key: key(8),
        change: "now_unresolved",
        before: was("rationale", "nonlogical"),
        after: was("normative", "missing"),
      },
      {
        claim_key: key(9),
        change: "role_changed",
        before: was("descriptive", "modeled"),
        after: was("normative", "modeled"),
      },
      {
        claim_key: key(10),
        change: "span_changed",
        before: was("normative", "ambiguous"),
        after: was("normative", "ambiguous"),
      },
      {
        claim_key: key(11),
        change: "kept",
        before: was("normative", "modeled"),
        after: was("normative", "modeled"),
      },
      {
        claim_key: key(12),
        change: "kept",
        before: was("normative", "ontology_gap"),
        after: was("normative", "ontology_gap"),
      },
      {
        claim_key: key(14),
        change: "kept",
        before: was("rationale", "nonlogical"),
        after: was("rationale", "nonlogical"),
      },
      {
        claim_key: key(15),
        change: "now_context",
        before: was("normative", "ambiguous"),
        after: was("rationale", "nonlogical"),
      },
      {
        claim_key: key(16),
        change: "new_unresolved",
        after: was("definition", "missing"),
      },
      {
        claim_key: key(4),
        change: "dropped",
        before: was("normative", "modeled"),
      },
      {
        claim_key: key(13),
        change: "dropped",
        before: was("normative", "ambiguous"),
      },
    ]);
    expect(plan?.summary).toStrictEqual({
      keptModeled: 2,
      roleChanges: 5,
      newlyUnresolved: 5,
      droppedClaims: 2,
      downgradedModeled: 2,
    });
    expect(plan?.contract.logic_claims).toEqual(
      [2, 3, 4, 8, 9, 10, 11, 12, 16].map(key),
    );
    expect(plan?.reasons).toEqual([
      `modeled claim ${key(5)} is now classified as context (example); its grounding cannot stay`,
    ]);
    expect(plan?.safe).toBe(false);
    expect(plan?.errors).toEqual(["stale"]);
    expect(plan?.orphanedGrounding).toEqual([]);
    expect(plan?.rederivableByDroppingGrounding).toBe(false);
    expect(plan?.requirementId).toBe("REQ-1");
    expect(plan?.path).toBe(REQ);
    // The re-derived contract is checked once more before it is offered.
    expect(checks).toHaveLength(2);
    expect(checks[1]?.properties).toMatchObject({
      id: "REQ-1",
      semantic_source_hash: HASH,
      semantic_inventory: plan?.contract.semantic_inventory,
    });
  });

  test("normalizes a stored inventory it cannot trust field by field", () => {
    const root = tempWorkspace({ [REQ]: "stub" });
    noShards();
    extracted(root, {
      [REQ]: {
        entity: {
          id: "REQ-1",
          type: "req",
          semantic_inventory: [
            null,
            [claim(1, "normative", "modeled")],
            "text",
            {
              claim_key: key(1),
              claim_text: 5,
              role: 7,
              status: null,
              span: "x",
            },
            claim(2, "normative", "modeled", {
              span: { start: "20" as never, end: 28 },
              semantic_key: 5 as never,
            }),
            claim(3, "normative", "modeled", {
              span: { start: 30, end: "38" as never },
            }),
            claim(4, "normative", "ambiguous", { reason: 6 as never }),
            { ...claim(5, "normative", "modeled"), span: undefined },
          ],
        },
      },
    });
    advisor([
      claim(2, "normative", "modeled"),
      claim(3, "normative", "modeled"),
      claim(4, "normative", "ambiguous", { reason: "p4" }),
      claim(5, "normative", "modeled", { span: { start: -1, end: -1 } }),
    ]);

    const [plan] = planInventoryRederivation(root);

    expect(plan?.contract.semantic_inventory).toStrictEqual([
      claim(2, "normative", "modeled"),
      claim(3, "normative", "modeled"),
      claim(4, "normative", "ambiguous"),
      claim(5, "normative", "modeled", { span: { start: -1, end: -1 } }),
    ]);
    expect(
      plan?.changes.map(({ claim_key, change, before }) => ({
        claim_key,
        change,
        before,
      })),
    ).toStrictEqual([
      {
        claim_key: key(2),
        change: "span_changed",
        before: { role: "normative", status: "modeled" },
      },
      {
        claim_key: key(3),
        change: "span_changed",
        before: { role: "normative", status: "modeled" },
      },
      {
        claim_key: key(4),
        change: "kept",
        before: { role: "normative", status: "ambiguous" },
      },
      {
        claim_key: key(5),
        change: "kept",
        before: { role: "normative", status: "modeled" },
      },
      {
        claim_key: key(1),
        change: "dropped",
        before: { role: "", status: "" },
      },
    ]);
  });

  test("keeps the subjects of a claim only while it stays unmodeled", () => {
    const root = tempWorkspace({ [REQ]: "stub" });
    noShards();
    extracted(root, {
      [REQ]: {
        entity: {
          id: "REQ-1",
          type: "req",
          semantic_inventory: [
            {
              ...claim(2, "normative", "ambiguous"),
              subjects: ["cart", 5, "order"],
            },
            { ...claim(3, "normative", "modeled"), subjects: ["cart"] },
            { ...claim(4, "normative", "ambiguous"), subjects: [] },
          ],
        },
      },
    });
    advisor([
      claim(2, "normative", "ambiguous"),
      claim(3, "normative", "modeled"),
      claim(4, "normative", "ambiguous"),
    ]);

    const [plan] = planInventoryRederivation(root);

    expect(plan?.contract.semantic_inventory).toStrictEqual([
      { ...claim(2, "normative", "ambiguous"), subjects: ["cart", "order"] },
      claim(3, "normative", "modeled"),
      claim(4, "normative", "ambiguous"),
    ]);
  });

  test("treats an inventory that is not a list as empty", () => {
    const root = tempWorkspace({ [REQ]: "stub" });
    noShards();
    extracted(root, {
      [REQ]: {
        entity: { id: "REQ-1", type: "req", semantic_inventory: "none" },
      },
    });
    advisor([claim(1, "normative", "modeled")]);

    expect(
      planInventoryRederivation(root)[0]?.changes.map(({ change }) => change),
    ).toEqual(["new_unresolved"]);
  });
});

describe("choosing what to re-derive", () => {
  test("plans only drifted requirements that advertise an inventory contract", () => {
    const files = Object.fromEntries(
      ["A", "B", "C", "D", "E", "F", "G", "H"].map((name) => [
        `.kb/requirements/REQ-${name}.md`,
        "stub",
      ]),
    );
    const root = tempWorkspace(files);
    noShards();
    const doc = (name: string, fields: Record<string, unknown>): Doc => ({
      entity: { id: `REQ-${name}`, type: "req", ...fields },
    });
    extracted(root, {
      ".kb/requirements/REQ-A.md": {
        entity: { id: "REQ-A", type: "fact", semantic_inventory: [] },
      },
      ".kb/requirements/REQ-B.md": doc("B", { title: "B" }),
      ".kb/requirements/REQ-C.md": doc("C", {
        semantic_inventory_version: VERSION,
      }),
      ".kb/requirements/REQ-D.md": doc("D", { semantic_source_hash: OLD }),
      ".kb/requirements/REQ-E.md": doc("E", { semantic_inventory: [] }),
      ".kb/requirements/REQ-F.md": new Error("unreadable"),
      ".kb/requirements/REQ-G.md": doc("G", { semantic_inventory: [] }),
      ".kb/requirements/REQ-H.md": doc("H", { semantic_inventory: [] }),
    });
    advisor([], (check) => {
      if (check.properties.semantic_source_hash === HASH) return pass;
      if (check.properties.id === "REQ-G")
        return { applicable: false, errors: ["ignored"], sourceHash: HASH };
      return check.properties.id === "REQ-H" ? pass : fail("stale");
    });

    expect(
      planInventoryRederivation(root).map((plan) => plan.requirementId),
    ).toEqual(["REQ-C", "REQ-D", "REQ-E"]);
  });

  test("looks a requirement up by its file stem first and by its id otherwise", () => {
    const root = tempWorkspace({
      ".kb/requirements/REQ-1.md": "stub",
      ".kb/requirements/REQ-2.md": "stub",
      ".kb/requirements/odd.md": "stub",
    });
    noShards();
    const doc = (id: string): Doc => ({
      entity: { id, type: "req", status: "open", semantic_inventory: [] },
    });
    const extract = extracted(root, {
      ".kb/requirements/REQ-1.md": doc("REQ-1"),
      ".kb/requirements/REQ-2.md": doc("REQ-2"),
      ".kb/requirements/odd.md": doc("REQ-3"),
    });
    advisor([]);
    const scanned = () =>
      extract.mock.calls.map(([file]) => path.basename(String(file)));
    const ids = (onlyId?: string) =>
      planInventoryRederivation(root, onlyId).map((plan) => plan.requirementId);

    expect(ids()).toEqual(["REQ-1", "REQ-2", "REQ-3"]);
    extract.mockClear();
    expect(ids("REQ-2")).toEqual(["REQ-2"]);
    expect(scanned()).toEqual(["REQ-2.md"]);
    extract.mockClear();
    expect(ids("REQ-3")).toEqual(["REQ-3"]);
    expect(scanned()).toEqual(["REQ-1.md", "REQ-2.md", "odd.md"]);
    expect(ids("REQ-9")).toEqual([]);
  });

  test("plans as if the requirement had a mapped status when asked to", () => {
    const root = tempWorkspace({ [REQ]: reqFile([]) });
    noShards();
    const { checks } = advisor([]);

    planInventoryRederivation(root, "REQ-1", { status: "active" });
    planInventoryRederivation(root, "REQ-1");

    expect(checks.map((check) => check.properties.status)).toEqual([
      "active",
      "active",
      "open",
      "open",
    ]);
  });

  test("hashes the canonical contract the apply step re-checks", () => {
    const root = tempWorkspace({ [REQ]: reqFile([]) });
    noShards();
    advisor([
      claim(1, "normative", "ambiguous"),
      claim(2, "condition", "missing"),
    ]);

    const [plan] = planInventoryRederivation(root);

    const canonical = `{"logic_claims":["${key(1)}","${key(2)}"],"semantic_inventory":[{"claim_key":"${key(1)}","claim_text":"Claim 1.","role":"normative","span":{"end":18,"start":10},"status":"ambiguous"},{"claim_key":"${key(2)}","claim_text":"Claim 2.","role":"condition","span":{"end":28,"start":20},"status":"missing"}],"semantic_inventory_version":"${VERSION}","semantic_source_field":"semantic_text","semantic_source_hash":"${HASH}"}`;
    expect(plan?.contractHash).toBe(
      createHash("sha256").update(canonical).digest("hex"),
    );
    expect(plan?.safe).toBe(true);
    expect(plan?.reasons).toEqual([]);
  });

  test("reads the source field from the requirement and lists every failure once", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([], {
        semantic_source_field: "title",
        semantic_text: "Body.",
      }),
    });
    noShards();
    advisor([], (check) =>
      check.properties.semantic_source_hash === HASH
        ? fail("still wrong", "still wrong", "other")
        : fail("stale"),
    );

    const [plan] = planInventoryRederivation(root);

    expect(plan?.contract.semantic_source_field).toBe("title");
    expect(plan?.reasons).toEqual([
      "re-derived inventory would still fail ingestion: still wrong",
      "re-derived inventory would still fail ingestion: other",
    ]);
    expect(plan?.safe).toBe(false);
  });
});

describe("grounding links", () => {
  const links = (...pairs: [string, string][]) =>
    pairs.map(([type, target]) => ({ type, target }));

  test("names every grounding link the re-derived inventory no longer supports", () => {
    const root = tempWorkspace({
      [REQ]: reqFile(
        [
          claim(1, "normative", "modeled"),
          claim(2, "normative", "modeled"),
          claim(3, "normative", "modeled"),
        ],
        {
          links: links(
            ["requires_predicate", "FACT-M"],
            ["requires_property", "FACT-N"],
            ["requires_rule", "FACT-D"],
            ["requires_predicate", "FACT-NONE"],
            ["requires_predicate", "FACT-GONE"],
            ["relates_to", "FACT-N"],
          ),
        },
      ),
      ".kb/facts/FACT-M.md": "stub",
      ".kb/facts/FACT-N.md": "stub",
      ".kb/facts/FACT-D.md": "stub",
      ".kb/facts/FACT-NONE.md": "stub",
      ".kb/facts/FACT-S.md": "stub",
    });
    extracted(root, {
      ".kb/facts/FACT-M.md": fact("FACT-M", key(1)),
      ".kb/facts/FACT-N.md": fact("FACT-N", key(2)),
      ".kb/facts/FACT-D.md": fact("FACT-D", key(3)),
      ".kb/facts/FACT-NONE.md": fact("FACT-NONE"),
      ".kb/facts/FACT-S.md": fact("FACT-S", key(2)),
    });
    const readShards = track(
      spyOn(shards, "readAllShards").mockReturnValue([
        { type: "requires_rule", from: "REQ-1", to: "FACT-S", id: "x" },
        { type: "requires_predicate", from: "REQ-1", to: "FACT-M" },
        { type: "requires_rule", from: "REQ-2", to: "FACT-N" },
      ] as never),
    );
    const { checks } = advisor([
      claim(1, "normative", "modeled"),
      claim(2, "rationale", "nonlogical"),
    ]);

    const [plan] = planInventoryRederivation(root);

    expect(readShards).toHaveBeenCalledWith(path.join(root, ".kb"));
    expect(plan?.orphanedGrounding).toEqual([
      {
        type: "requires_property",
        target: "FACT-N",
        claimKey: key(2),
        inFrontMatter: true,
      },
      {
        type: "requires_rule",
        target: "FACT-D",
        claimKey: key(3),
        inFrontMatter: true,
      },
      {
        type: "requires_predicate",
        target: "FACT-NONE",
        claimKey: null,
        inFrontMatter: true,
      },
      {
        type: "requires_predicate",
        target: "FACT-GONE",
        claimKey: null,
        inFrontMatter: true,
      },
      {
        type: "requires_rule",
        target: "FACT-S",
        claimKey: key(2),
        inFrontMatter: false,
      },
    ]);
    expect(plan?.reasons).toEqual([
      `modeled claim ${key(2)} is now classified as context (rationale); its grounding cannot stay`,
      `grounded claim ${key(2)} is not a modeled claim of the re-derived inventory`,
      `grounded claim ${key(3)} no longer exists in the current advisor's inventory`,
      "grounding target FACT-NONE (requires_predicate) declares no claim_key",
      "grounding target FACT-GONE (requires_predicate) declares no claim_key",
    ]);
    expect(plan?.rederivableByDroppingGrounding).toBe(false);
    expect(checks[0]?.relationships).toEqual([
      ...links(
        ["requires_predicate", "FACT-M"],
        ["requires_property", "FACT-N"],
        ["requires_rule", "FACT-D"],
        ["requires_predicate", "FACT-NONE"],
        ["requires_predicate", "FACT-GONE"],
        ["relates_to", "FACT-N"],
        ["requires_rule", "FACT-S"],
      ).map(({ type, target }) => ({ type, from: "REQ-1", to: target })),
    ]);
    expect(checks).toHaveLength(2);
  });

  test("resolves a fact whose file stem is not its id through one full index", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "modeled")], {
        links: links(
          ["requires_predicate", "FACT-G"],
          ["requires_predicate", "FACT-W"],
          ["requires_rule", "FACT-G"],
        ),
      }),
      ".kb/facts/grounding.md": "stub",
      ".kb/facts/FACT-W.md": "stub",
      ".kb/facts/bad.md": "stub",
      ".kb/facts/plain.md": "stub",
    });
    noShards();
    extracted(root, {
      ".kb/facts/grounding.md": fact("FACT-G", key(1)),
      ".kb/facts/FACT-W.md": fact("FACT-OTHER", key(1)),
      ".kb/facts/bad.md": new Error("unreadable"),
      ".kb/facts/plain.md": fact("FACT-W"),
    });
    const list = track(spyOn(kbSources, "listLaneMarkdownFiles"));
    advisor([claim(1, "normative", "modeled")]);

    const [plan] = planInventoryRederivation(root);

    expect(plan?.orphanedGrounding).toEqual([
      {
        type: "requires_predicate",
        target: "FACT-W",
        claimKey: null,
        inFrontMatter: true,
      },
    ]);
    expect(
      list.mock.calls.filter(([, lanes]) => lanes?.[0] === "facts"),
    ).toHaveLength(1);
  });

  test("reads a fact named by its id without building the index", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "modeled")], {
        links: links(["requires_predicate", "FACT-NONE"]),
      }),
      ".kb/facts/FACT-NONE.md": "stub",
    });
    noShards();
    extracted(root, { ".kb/facts/FACT-NONE.md": fact("FACT-NONE") });
    const list = track(spyOn(kbSources, "listLaneMarkdownFiles"));
    advisor([claim(1, "normative", "modeled")]);

    expect(planInventoryRederivation(root)[0]?.orphanedGrounding).toEqual([
      {
        type: "requires_predicate",
        target: "FACT-NONE",
        claimKey: null,
        inFrontMatter: true,
      },
    ]);
    expect(
      list.mock.calls.filter(([, lanes]) => lanes?.[0] === "facts"),
    ).toEqual([]);
  });

  test("still plans when the relationship shards cannot be read", () => {
    const root = tempWorkspace({ [REQ]: reqFile([]) });
    track(
      spyOn(shards, "readAllShards").mockImplementation(() => {
        throw new Error("malformed shard");
      }),
    );
    advisor([]);

    expect(planInventoryRederivation(root)).toHaveLength(1);
  });

  function droppable(
    extraLinks: [string, string][] = [],
    judge?: (check: Check, call: number) => Verdict,
  ) {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "modeled")], {
        links: links(
          ["requires_predicate", "FACT-1"],
          ["relates_to", "REQ-2"],
          ["requires_rule", "FACT-1"],
          ...extraLinks,
        ),
      }),
      ".kb/facts/FACT-1.md": "stub",
    });
    extracted(root, { ".kb/facts/FACT-1.md": fact("FACT-1", key(1)) });
    const run = advisor(
      [claim(1, "rationale", "nonlogical")],
      judge ??
        ((check) =>
          check.properties.semantic_source_hash !== HASH
            ? fail("stale")
            : check.relationships.some(({ to }) => to === "FACT-1")
              ? fail("orphaned grounding")
              : pass),
    );
    return { root, ...run };
  }

  test("offers to drop orphaned front-matter grounding when that alone passes ingestion", () => {
    noShards();
    const { root, checks } = droppable();

    const [plan] = planInventoryRederivation(root);

    expect(plan?.rederivableByDroppingGrounding).toBe(true);
    expect(plan?.safe).toBe(false);
    expect(checks).toHaveLength(3);
    expect(checks[2]?.relationships).toEqual([
      { type: "relates_to", from: "REQ-1", to: "REQ-2" },
    ]);
    expect(checks[2]?.properties.semantic_source_hash).toBe(HASH);
  });

  test("does not offer the drop when ingestion would still fail without the links", () => {
    noShards();
    const { root } = droppable([], (check) =>
      check.properties.semantic_source_hash === HASH
        ? fail("still")
        : fail("stale"),
    );

    expect(
      planInventoryRederivation(root)[0]?.rederivableByDroppingGrounding,
    ).toBe(false);
  });

  test("does not offer the drop for a link without claim_key or outside the front matter", () => {
    noShards();
    const unknown = droppable([["requires_predicate", "FACT-X"]]);
    expect(
      planInventoryRederivation(unknown.root)[0]
        ?.rederivableByDroppingGrounding,
    ).toBe(false);
    expect(unknown.checks).toHaveLength(2);
    removeTempWorkspaces();
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();

    track(
      spyOn(shards, "readAllShards").mockReturnValue([
        { type: "requires_rule", from: "REQ-1", to: "FACT-1" },
        { type: "requires_property", from: "REQ-1", to: "FACT-1" },
      ] as never),
    );
    const shard = droppable();
    expect(
      planInventoryRederivation(shard.root)[0]?.rederivableByDroppingGrounding,
    ).toBe(false);
    expect(shard.checks).toHaveLength(2);
  });
});

const IN_PLACE = `---
id: REQ-1
title: REQ-1
status: open
semantic_inventory_version: ${VERSION} # pinned
semantic_source_field: semantic_text
semantic_source_hash: ${OLD}
semantic_inventory:
  - claim_key: ${key(1)}
    claim_text: Claim 1.
    role: descriptive
    status: modeled
    span: { start: 10, end: 18 }
  - claim_key: ${key(2)}
    claim_text: Claim 2.
    role: normative # same
    status: ambiguous
    span: {start: 20, end: 28}
    reason: old
  - claim_key: ${key(3)}
    claim_text: Claim 3.
    role: rationale
    status: nonlogical
    span:
      start: 30
      end: 38
    reason: context
logic_claims:
  - ${key(1)}
  - ${key(2)}
owner: someone
---

Body.
`;
const IN_PLACE_CURRENT = [
  claim(1, "normative", "modeled"),
  claim(2, "normative", "ambiguous", {
    span: { start: 20, end: 29 },
    reason: "new",
  }),
  claim(3, "normative", "ambiguous"),
];

const IN_PLACE_RESULT = `---
id: REQ-1
title: REQ-1
status: open
semantic_inventory_version: ${VERSION} # pinned
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
semantic_inventory:
  - claim_key: ${key(1)}
    claim_text: Claim 1.
    role: normative
    status: modeled
    span: {start: 10, end: 18}
  - claim_key: ${key(2)}
    claim_text: Claim 2.
    role: normative # same
    status: ambiguous
    span: {start: 20, end: 29}
    reason: old
  - claim_key: ${key(3)}
    claim_text: Claim 3.
    role: normative
    status: ambiguous
    span:
      start: 30
      end: 38
logic_claims:
  - ${key(1)}
  - ${key(2)}
  - ${key(3)}
owner: someone
---

Body.
`;

const WHOLE = (id: string) => `---
id: ${id}
title: ${id}
status: open
semantic_inventory_version: ${VERSION}
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
semantic_inventory:
  - claim_key: ${key(2)}
    claim_text: Claim 2.
    role: normative
    status: ambiguous
    span: {start: 20, end: 28}
  - claim_key: ${key(1)}
    claim_text: Claim 1.
    role: normative
    status: ambiguous
    span: {start: 10, end: 18}
logic_claims:
  - ${key(2)}
  - ${key(1)}
---

Body.
`;

describe("writing a safe re-derivation", () => {
  test("edits only the changed fields of an inventory with the same claims", () => {
    const root = tempWorkspace({ [REQ]: IN_PLACE });
    noShards();
    advisor(IN_PLACE_CURRENT);

    const outcome = applyInventoryRederivation(root, "REQ-1");

    expect(read(root)).toBe(IN_PLACE_RESULT);
    expect(outcome).toStrictEqual({
      requirementId: "REQ-1",
      path: REQ,
      outcome: "rederived",
      summary: {
        keptModeled: 1,
        roleChanges: 2,
        newlyUnresolved: 1,
        droppedClaims: 0,
        downgradedModeled: 0,
      },
    });
  });

  test("keeps CRLF line endings", () => {
    const root = tempWorkspace({ [REQ]: IN_PLACE.replace(/\n/g, "\r\n") });
    noShards();
    advisor(IN_PLACE_CURRENT);

    applyInventoryRederivation(root, "REQ-1");

    expect(read(root)).toBe(IN_PLACE_RESULT.replace(/\n/g, "\r\n"));
  });

  test("rewrites an inventory whose claims differ as a whole", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "ambiguous")]),
      ".kb/requirements/REQ-2.md": reqFile(
        [
          claim(1, "normative", "ambiguous"),
          claim(2, "normative", "ambiguous"),
        ],
        {},
        "REQ-2",
      ),
      ".kb/requirements/REQ-3.md": reqFile([], {}, "REQ-3").replace(
        "semantic_inventory: []\n",
        "",
      ),
      ".kb/requirements/REQ-4.md": reqFile(
        [
          claim(2, "normative", "ambiguous"),
          claim(1, "normative", "ambiguous"),
          claim(3, "normative", "ambiguous"),
        ],
        {},
        "REQ-4",
      ),
      ".kb/requirements/REQ-5.md": reqFile(
        [
          claim(2, "normative", "ambiguous"),
          claim(3, "normative", "ambiguous"),
        ],
        {},
        "REQ-5",
      ),
    });
    noShards();
    advisor([
      claim(2, "normative", "ambiguous"),
      claim(1, "normative", "ambiguous"),
    ]);

    for (const id of ["REQ-1", "REQ-2", "REQ-3", "REQ-4", "REQ-5"])
      applyInventoryRederivation(root, id);

    expect(read(root)).toBe(WHOLE("REQ-1"));
    expect(read(root, ".kb/requirements/REQ-2.md")).toBe(WHOLE("REQ-2"));
    expect(read(root, ".kb/requirements/REQ-3.md")).toBe(WHOLE("REQ-3"));
    expect(read(root, ".kb/requirements/REQ-4.md")).toBe(WHOLE("REQ-4"));
    expect(read(root, ".kb/requirements/REQ-5.md")).toBe(WHOLE("REQ-5"));
  });

  test("leaves a requirement that no longer drifts alone", () => {
    const root = tempWorkspace({ [REQ]: reqFile([]) });
    noShards();
    advisor([], () => pass);

    expect(applyInventoryRederivation(root, "REQ-1")).toStrictEqual({
      requirementId: "REQ-1",
      path: "",
      outcome: "unchanged",
    });
    expect(read(root)).toBe(reqFile([]));
  });

  test("refuses an unsafe re-derivation and one whose plan changed", () => {
    const root = tempWorkspace({ [REQ]: reqFile([]) });
    noShards();
    advisor([], (check) =>
      check.properties.semantic_source_hash === HASH
        ? fail("one", "two")
        : fail("stale"),
    );
    expect(() => applyInventoryRederivation(root, "REQ-1")).toThrow(
      "Requirement REQ-1 cannot be re-derived automatically: re-derived inventory would still fail ingestion: one; re-derived inventory would still fail ingestion: two",
    );
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();

    noShards();
    advisor([]);
    const [plan] = planInventoryRederivation(root);
    expect(() =>
      applyInventoryRederivation(root, "REQ-1", "0".repeat(64)),
    ).toThrow(
      "Requirement REQ-1 changed since planning; rerun kibi migrate and approve the new plan.",
    );
    expect(read(root)).toBe(reqFile([]));
    expect(
      applyInventoryRederivation(root, "REQ-1", plan?.contractHash).outcome,
    ).toBe("rederived");
  });

  test("refuses to write when the frontmatter cannot be rewritten in place", () => {
    const unwritable =
      "Requirement REQ-1: the re-derived inventory could not be written without changing other frontmatter fields.";
    for (const content of [
      null,
      "No frontmatter.\n",
      "---\nid: [\n---\n",
      "---\n- a list\n---\n",
    ]) {
      const root = tempWorkspace({ [REQ]: reqFile([]) });
      noShards();
      advisor([]);
      const readText = track(
        spyOn(kbSources, "readText").mockReturnValue(content),
      );
      expect(() => applyInventoryRederivation(root, "REQ-1")).toThrow(
        unwritable,
      );
      expect(readText).toHaveBeenCalledWith(path.join(root, REQ));
      expect(read(root)).toBe(reqFile([]));
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    }
  });

  test("refuses to write a requirement that does not read back", () => {
    const root = tempWorkspace({ [REQ]: reqFile([]) });
    noShards();
    advisor([]);
    const reread = track(
      spyOn(markdown, "extractFromMarkdownString").mockReturnValue({
        entity: { semantic_source_hash: OLD },
        relationships: [],
      } as never),
    );

    expect(() => applyInventoryRederivation(root, "REQ-1")).toThrow(
      "Requirement REQ-1: re-derived inventory did not read back.",
    );
    expect(reread).toHaveBeenCalledWith(
      expect.stringContaining(`semantic_source_hash: ${HASH}`),
      path.join(root, REQ),
    );
    expect(read(root)).toBe(reqFile([]));
  });
});

describe("writing a requirement without assertive claims", () => {
  test("removes logic_claims instead of writing an empty list", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "ambiguous")], {
        logic_claims: [key(1)],
      }),
      ".kb/requirements/REQ-2.md": reqFile(
        [claim(1, "normative", "ambiguous")],
        {},
        "REQ-2",
      ),
    });
    noShards();
    advisor([claim(1, "rationale", "nonlogical")]);

    applyInventoryRederivation(root, "REQ-1");
    applyInventoryRederivation(root, "REQ-2");

    const expected = (id: string) => `---
id: ${id}
title: ${id}
status: open
semantic_inventory_version: ${VERSION}
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
semantic_inventory:
  - claim_key: ${key(1)}
    claim_text: Claim 1.
    role: rationale
    status: nonlogical
    span:
      start: 10
      end: 18
---

Body.
`;
    expect(read(root)).toBe(expected("REQ-1"));
    expect(read(root, ".kb/requirements/REQ-2.md")).toBe(expected("REQ-2"));
  });
});

const GROUNDED = (links: [string, string][]) =>
  reqFile([claim(1, "normative", "modeled")], {
    links: links.map(([type, target]) => ({ type, target })),
  });
const ORPHANS: [string, string][] = [
  ["requires_predicate", "FACT-1"],
  ["requires_rule", "FACT-1"],
];
const DROPS = ORPHANS.map(([type, target]) => ({ type, target }));
const dropJudge = (check: Check): Verdict =>
  check.properties.semantic_source_hash !== HASH
    ? fail("stale")
    : check.relationships.some(({ to }) => to === "FACT-1")
      ? fail("orphaned grounding")
      : pass;

function grounded(
  links: [string, string][],
  judge: (check: Check, call: number) => Verdict = dropJudge,
) {
  const root = tempWorkspace({
    [REQ]: GROUNDED(links),
    ".kb/facts/FACT-1.md": "stub",
  });
  noShards();
  extracted(root, { ".kb/facts/FACT-1.md": fact("FACT-1", key(1)) });
  advisor([claim(1, "rationale", "nonlogical")], judge);
  return root;
}
const DROPPED_TAIL = `semantic_inventory:
  - claim_key: ${key(1)}
    claim_text: Claim 1.
    role: rationale
    status: nonlogical
    span:
      start: 10
      end: 18
`;

describe("writing an approved re-derivation that drops grounding", () => {
  test("removes exactly the approved links and keeps the rest", () => {
    const root = grounded([
      ORPHANS[0] as [string, string],
      ["relates_to", "REQ-2"],
      ORPHANS[1] as [string, string],
    ]);
    const [plan] = planInventoryRederivation(root);

    const outcome = applyInventoryRederivationDroppingGrounding(
      root,
      "REQ-1",
      plan?.contractHash ?? "",
      [...DROPS].reverse(),
    );

    expect(outcome).toStrictEqual({
      requirementId: "REQ-1",
      path: REQ,
      outcome: "rederived",
      summary: plan?.summary,
    });
    expect(read(root)).toBe(`---
id: REQ-1
title: REQ-1
status: open
semantic_inventory_version: ${VERSION}
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
${DROPPED_TAIL}links:
  - type: relates_to
    target: REQ-2
---

Body.
`);
  });

  test("removes the links key once no link is left", () => {
    const root = grounded(ORPHANS);
    const [plan] = planInventoryRederivation(root);

    applyInventoryRederivationDroppingGrounding(
      root,
      "REQ-1",
      plan?.contractHash ?? "",
      DROPS,
    );

    expect(read(root)).toBe(`---
id: REQ-1
title: REQ-1
status: open
semantic_inventory_version: ${VERSION}
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
${DROPPED_TAIL}---

Body.
`);
  });

  test("refuses anything but the plan that was approved", () => {
    const changed =
      "Requirement REQ-1 changed since planning; rerun kibi migrate and approve the new plan.";
    const attempt = (root: string, hash: string | undefined, drops = DROPS) => {
      expect(() =>
        applyInventoryRederivationDroppingGrounding(
          root,
          "REQ-1",
          hash ?? "",
          drops,
        ),
      ).toThrow(changed);
      expect(read(root, REQ)).toBe(GROUNDED(ORPHANS));
    };
    const reset = () => {
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    };

    let root = grounded(ORPHANS, () => pass);
    attempt(root, "0".repeat(64));
    reset();

    root = tempWorkspace({
      [REQ]: GROUNDED([...ORPHANS, ["requires_predicate", "FACT-X"]]),
      ".kb/facts/FACT-1.md": "stub",
    });
    noShards();
    extracted(root, { ".kb/facts/FACT-1.md": fact("FACT-1", key(1)) });
    advisor([claim(1, "rationale", "nonlogical")], dropJudge);
    const [unsafe] = planInventoryRederivation(root);
    expect(unsafe?.rederivableByDroppingGrounding).toBe(false);
    expect(() =>
      applyInventoryRederivationDroppingGrounding(
        root,
        "REQ-1",
        unsafe?.contractHash ?? "",
        [...DROPS, { type: "requires_predicate", target: "FACT-X" }],
      ),
    ).toThrow(changed);
    reset();

    root = grounded(ORPHANS);
    const [plan] = planInventoryRederivation(root);
    attempt(root, "0".repeat(64));
    attempt(root, plan?.contractHash, DROPS.slice(0, 1));
    attempt(root, plan?.contractHash, [
      { type: "requires_predicate", target: "FACT-1" },
      { type: "requires_predicate", target: "FACT-2" },
    ]);
    attempt(root, plan?.contractHash, [
      ...DROPS,
      { type: "requires_rule", target: "FACT-2" },
    ]);
  });

  test("refuses to write links it cannot remove in place", () => {
    const unwritable =
      "Requirement REQ-1: the re-derived inventory and the dropped grounding links could not be written without changing other frontmatter fields.";
    const frontmatter = (links: string) =>
      `---\nid: REQ-1\ntitle: REQ-1\nstatus: open\nlinks:${links}\n---\n\nBody.\n`;
    for (const content of [
      null,
      frontmatter(" {type: requires_rule, target: FACT-1}"),
      frontmatter(
        "\n  - {type: requires_predicate, target: FACT-1}\n  - {type: requires_predicate, target: FACT-1}\n  - {type: requires_rule, target: FACT-1}",
      ),
      frontmatter("\n  - {type: requires_rule, target: FACT-1}\n  - REQ-2"),
    ]) {
      const root = grounded(ORPHANS);
      const [plan] = planInventoryRederivation(root);
      track(spyOn(kbSources, "readText").mockReturnValue(content));
      expect(() =>
        applyInventoryRederivationDroppingGrounding(
          root,
          "REQ-1",
          plan?.contractHash ?? "",
          DROPS,
        ),
      ).toThrow(unwritable);
      expect(read(root)).toBe(GROUNDED(ORPHANS));
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    }
  });

  test("writes nothing when the rewritten requirement would still fail ingestion", () => {
    // The test plans (checks 1-3), the apply step plans again (4-6), then
    // the rewritten requirement is checked as sync would read it (7).
    const root = grounded(ORPHANS, (check, call) =>
      call >= 7 ? fail("still broken", "again") : dropJudge(check),
    );
    const [plan] = planInventoryRederivation(root);

    expect(() =>
      applyInventoryRederivationDroppingGrounding(
        root,
        "REQ-1",
        plan?.contractHash ?? "",
        DROPS,
      ),
    ).toThrow(
      "Requirement REQ-1: the rewrite would still fail ingestion (still broken; again); nothing was written.",
    );
    expect(read(root)).toBe(GROUNDED(ORPHANS));
  });
});

describe("applying every safe re-derivation", () => {
  test("rewrites the safe requirements and returns the rest for a person", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "ambiguous")]),
      ".kb/requirements/REQ-2.md": GROUNDED(ORPHANS).replace(/REQ-1/g, "REQ-2"),
      ".kb/facts/FACT-1.md": "stub",
    });
    noShards();
    extracted(root, { ".kb/facts/FACT-1.md": fact("FACT-1", key(1)) });
    advisor([claim(1, "rationale", "nonlogical")]);

    const { rederived, manual } = applySafeInventoryRederivations(root);

    expect(
      rederived.map(({ requirementId, outcome }) => [requirementId, outcome]),
    ).toEqual([["REQ-1", "rederived"]]);
    expect(manual.map((plan) => plan.requirementId)).toEqual(["REQ-2"]);
    expect(read(root, ".kb/requirements/REQ-2.md")).toBe(
      GROUNDED(ORPHANS).replace(/REQ-1/g, "REQ-2"),
    );
  });

  test("stops when the re-derivation changed after the scan", () => {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "ambiguous")]),
    });
    noShards();
    advisor((call) =>
      call <= 2
        ? [claim(1, "normative", "ambiguous")]
        : [claim(1, "normative", "ambiguous", { span: { start: 0, end: 8 } })],
    );

    expect(() => applySafeInventoryRederivations(root)).toThrow(
      "Requirement REQ-1 changed since planning",
    );
  });
});

describe("checking a rewrite against the frontmatter it replaces", () => {
  /** Apply a re-derivation of REQ-1 over `content` as read at write time. */
  function rewrite(content: string): string {
    const root = tempWorkspace({
      [REQ]: reqFile([claim(1, "normative", "ambiguous")]),
    });
    noShards();
    advisor([claim(1, "normative", "ambiguous")]);
    track(spyOn(kbSources, "readText").mockReturnValue(content));
    applyInventoryRederivation(root, "REQ-1");
    return read(root);
  }
  const doc = (lines: string) =>
    `---\nid: REQ-1\ntitle: REQ-1\nstatus: open\n${lines}---\n\nBody.\n`;
  const CONTRACT = `semantic_inventory_version: ${VERSION}
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
`;
  const ONE = `semantic_inventory:
  - claim_key: ${key(1)}
    claim_text: Claim 1.
    role: normative
    status: ambiguous
    span: {start: 10, end: 18}
logic_claims:
  - ${key(1)}
`;

  test("keeps an empty links list it was not asked to change", () => {
    expect(rewrite(doc("links: []\n"))).toBe(
      doc(`links: []\n${CONTRACT}${ONE}`),
    );
  });

  test("replaces a logic_claims list that only looks like the inventory", () => {
    expect(rewrite(doc(`logic_claims:\n  - claim_key: ${key(1)}\n`))).toBe(
      doc(
        `logic_claims:\n  - ${key(1)}\n${CONTRACT}${ONE.split("logic_claims")[0]}`,
      ),
    );
  });

  test("replaces an inventory whose entries are not mappings", () => {
    expect(rewrite(doc("semantic_inventory: [null]\n"))).toBe(
      doc(
        `semantic_inventory:\n${ONE.split("semantic_inventory:\n")[1]?.split("logic_claims")[0]}${CONTRACT}logic_claims:\n  - ${key(1)}\n`,
      ),
    );
  });

  test("refuses a rewrite that would change another field or cannot be read back", () => {
    const aliased = doc(`semantic_inventory: &inventory
  - {claim_key: ${key(1)}, claim_text: Claim 1., role: rationale, status: nonlogical, span: {start: 10, end: 18}}
copy: *inventory
`);
    expect(() => rewrite(aliased)).toThrow("could not be written");
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    expect(() => rewrite(doc("owner: !custom someone\n"))).toThrow(
      "could not be written",
    );
  });

  test("drops only links that match both type and target", () => {
    const root = grounded(ORPHANS, staleUntilRederived);
    const [plan] = planInventoryRederivation(root);
    const content = GROUNDED([
      ["requires_predicate", "FACT-2"],
      ...ORPHANS,
      ["relates_to", "FACT-1"],
    ]);
    track(spyOn(kbSources, "readText").mockReturnValue(content));

    applyInventoryRederivationDroppingGrounding(
      root,
      "REQ-1",
      plan?.contractHash ?? "",
      DROPS,
    );

    expect(read(root)).toBe(`---
id: REQ-1
title: REQ-1
status: open
semantic_inventory_version: ${VERSION}
semantic_source_field: semantic_text
semantic_source_hash: ${HASH}
${DROPPED_TAIL}links:
  - type: requires_predicate
    target: FACT-2
  - type: relates_to
    target: FACT-1
---

Body.
`);
  });
});
