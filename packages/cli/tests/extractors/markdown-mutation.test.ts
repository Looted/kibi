/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  FrontmatterError,
  detectEmbeddedEntities,
  extractFromMarkdown,
  extractFromMarkdownString,
  inferTypeFromPath,
  legacyRequirementSemanticText,
  normalizeDateLike,
  requirementSemanticText,
} from "../../src/extractors/markdown.js";

const NOW = "2026-05-06T07:08:09.000Z";
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
function freezeTime() {
  setSystemTime(new Date(NOW));
  cleanups.push(() => setSystemTime());
}

const md = (frontmatter: string, body = "") =>
  `---\n${frontmatter}\n---\n${body}`;
const STAMPS = "created_at: c\nupdated_at: u\n";

function extract(
  frontmatter: string,
  file = "/kb/requirements/r.md",
  body = "",
) {
  return extractFromMarkdownString(md(`${STAMPS}${frontmatter}`, body), file);
}

function failure(
  content: string,
  file = "/kb/requirements/r.md",
): FrontmatterError {
  try {
    extractFromMarkdownString(content, file);
  } catch (error) {
    expect(error).toBeInstanceOf(FrontmatterError);
    return error as FrontmatterError;
  }
  throw new Error("expected a FrontmatterError");
}

const fails = (frontmatter: string, file?: string) =>
  failure(md(`${STAMPS}${frontmatter}`), file);

function shape(error: FrontmatterError) {
  return {
    message: error.message,
    classification: error.classification,
    hint: error.hint,
    filePath: error.filePath,
  };
}

const sha16 = (text: string) =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);

describe("FrontmatterError", () => {
  test("defaults its classification and hint", () => {
    const error = new FrontmatterError("boom", "f.md");
    expect(error.name).toBe("FrontmatterError");
    expect(error.classification).toBe("Generic Error");
    expect(error.hint).toBe("Check the file for syntax errors.");
    expect(error.originalError).toBe(undefined);
    expect(error.toString()).toBe(
      "f.md: [Generic Error] boom\nHow to fix:\n- Check the file for syntax errors.",
    );
    const empty = new FrontmatterError("boom", "f.md", {
      classification: "",
      hint: "",
    });
    expect(empty.classification).toBe("Generic Error");
    expect(empty.hint).toBe("Check the file for syntax errors.");
  });

  test("renders a custom classification, hint and original error", () => {
    const error = new FrontmatterError("boom", "f.md", {
      classification: "C",
      hint: "H",
      originalError: "O",
    });
    expect(error.toString()).toBe(
      "f.md: [C] boom\nHow to fix:\n- H\n\nOriginal error: O",
    );
    const blank = new FrontmatterError("boom", "f.md", { originalError: "" });
    expect(blank.originalError).toBe("");
    expect(blank.toString()).toBe(
      "f.md: [Generic Error] boom\nHow to fix:\n- Check the file for syntax errors.",
    );
  });
});

describe("small helpers", () => {
  test("infers types from typed directories", () => {
    const cases: Array<[string, string | null]> = [
      ["/x/requirements/a.md", "req"],
      ["/x/scenarios/a.md", "scenario"],
      ["/x/tests/a.md", "test"],
      ["/x/adr/a.md", "adr"],
      ["/x/flags/a.md", "flag"],
      ["/x/events/a.md", "event"],
      ["/x/facts/a.md", "fact"],
      ["/x/symbols/a.md", null],
      ["requirements/a.md", null],
    ];
    for (const [file, type] of cases)
      expect([file, inferTypeFromPath(file)]).toStrictEqual([file, type]);
  });

  test("normalizes date-like values", () => {
    expect(normalizeDateLike(new Date(NOW))).toBe(NOW);
    expect(normalizeDateLike("x")).toBe("x");
    expect(normalizeDateLike(5)).toBe(undefined);
    expect(normalizeDateLike(null)).toBe(undefined);
  });

  test("derives requirement semantic text", () => {
    const body =
      "# Title\r\n  ## Sub\n    #### deep indented\n#nohash\n- item one\n* star\n+ plus\n1. first\n2) second\n> quote\n>tight\n####### seven\n  text  \r\n\n## Rationale\nwhy\n";
    expect(legacyRequirementSemanticText(body)).toBe(
      "#### deep indented\n#nohash\nitem one\nstar\nplus\nfirst\nsecond\nquote\ntight\n####### seven\n  text  \n\nwhy",
    );
    expect(requirementSemanticText(body)).toBe(
      "#### deep indented\n#nohash\nitem one\nstar\nplus\nfirst\nsecond\nquote\ntight\n####### seven\n  text",
    );
    expect(legacyRequirementSemanticText("#\n-x\n-  y\n10. ten\n")).toBe(
      "-x\ny\nten",
    );
    expect(legacyRequirementSemanticText("a\rb")).toBe("a\nb");
  });

  test("detects embedded scenario and test fields on requirements only", () => {
    const scenarioFields = [
      "scenario",
      "scenarios",
      "given",
      "when",
      "then",
      "steps",
    ];
    const testFields = [
      "test",
      "tests",
      "testCase",
      "testCases",
      "assertion",
      "assertions",
      "testStep",
      "testSteps",
    ];
    for (const field of scenarioFields) {
      expect([
        field,
        detectEmbeddedEntities({ [field]: "x" }, "req"),
      ]).toStrictEqual([field, ["scenario"]]);
    }
    for (const field of testFields) {
      expect([
        field,
        detectEmbeddedEntities({ [field]: ["x"] }, "req"),
      ]).toStrictEqual([field, ["test"]]);
    }
    expect(
      detectEmbeddedEntities(
        { given: "a", when: "b", tests: { a: 1 }, assertions: "c" },
        "req",
      ),
    ).toStrictEqual(["scenario", "test"]);
    for (const value of [null, undefined, 5, true]) {
      expect(
        detectEmbeddedEntities({ steps: value, test: value }, "req"),
      ).toStrictEqual([]);
    }
    expect(
      detectEmbeddedEntities({ steps: "x", test: "y" }, "scenario"),
    ).toStrictEqual([]);
  });
});

describe("front matter structure", () => {
  test("reads a minimal requirement with defaults", () => {
    freezeTime();
    const result = extractFromMarkdownString(
      md("title: Alpha"),
      "/kb/requirements/r.md",
    );
    expect(result).toStrictEqual({
      entity: {
        id: sha16("/kb/requirements/r.md:Alpha"),
        type: "req",
        title: "Alpha",
        status: "open",
        created_at: NOW,
        updated_at: NOW,
        source: "/kb/requirements/r.md",
      },
      relationships: [],
    });
  });

  test("uses the default status of each type", () => {
    const statuses: Array<[string, string]> = [
      ["req", "open"],
      ["scenario", "draft"],
      ["test", "pending"],
      ["adr", "proposed"],
      ["flag", "active"],
      ["event", "active"],
      ["symbol", "active"],
      ["fact", "active"],
    ];
    for (const [type, status] of statuses) {
      const entity = extractFromMarkdownString(
        md(`id: X-1\ntype: ${type}\ntitle: T\n${STAMPS}`),
        "/kb/x.md",
      ).entity;
      expect([type, entity.status]).toStrictEqual([type, status]);
    }
    expect(extract("id: R\ntitle: T\nstatus: approved").entity.status).toBe(
      "approved",
    );
  });

  test("accepts delimiters with trailing blanks and leading whitespace", () => {
    for (const content of [
      "\n  ---  \ntitle: A\n---\t\nbody",
      "---\r\ntitle: A\r\n---\r\nbody",
      "---\ntitle: A\n---",
    ]) {
      const result = extractFromMarkdownString(`${content}`, "/kb/flags/f.md");
      expect([content, result.entity.title]).toStrictEqual([content, "A"]);
    }
  });

  test("ignores a front matter that is not a mapping", () => {
    const error = failure("---\n- a\n---\n", "/kb/flags/f.md");
    expect(error.message).toBe("Missing required field: title");
  });

  test("rejects an unclosed block", () => {
    for (const content of [
      "---\ntitle: A\n",
      "---\ntitle: A---\n",
      "---\ntitle: A\n ---\n",
      "---\ntitle: A\n---x\n",
    ]) {
      expect([content, shape(failure(content))]).toStrictEqual([
        content,
        {
          message: "Missing closing --- delimiter",
          classification: "Missing closing ---",
          hint: "Ensure the frontmatter is enclosed between two '---' delimiter lines; a '---' appended to the last value does not close it.",
          filePath: "/kb/requirements/r.md",
        },
      ]);
    }
  });

  test("treats a document without an opening delimiter as body only", () => {
    expect(shape(failure("title: A\n", "/kb/x.md"))).toStrictEqual({
      message: "Could not determine entity type from path or frontmatter",
      classification: "Missing Type",
      hint: "Add 'type: <type>' to frontmatter or place file in a typed directory (e.g., /requirements/).",
      filePath: "/kb/x.md",
    });
    expect(failure("x---\ntitle: A\n---\n").message).toBe(
      "Missing required field: title",
    );
    expect(failure("----\ntitle: A\n---\n").message).toBe(
      "Missing required field: title",
    );
  });

  test("requires a title", () => {
    for (const title of ["", "~", "''"]) {
      expect(shape(failure(md(`title: ${title}`)))).toStrictEqual({
        message: "Missing required field: title",
        classification: "Missing Field",
        hint: "Add a 'title: ...' field to the YAML frontmatter.",
        filePath: "/kb/requirements/r.md",
      });
    }
  });

  test("rejects embedded entities with both kinds named", () => {
    expect(shape(fails("title: T\ngiven: a\ntests: [b]"))).toStrictEqual({
      message:
        "Invalid embedded entity: requirement contains scenario and test fields",
      classification: "Embedded Entity Violation",
      hint: "Move scenario and test to separate entity files and declare typed relationship links there; Kibi owns the compiled relationship shards.",
      filePath: "/kb/requirements/r.md",
    });
  });
});

describe("links", () => {
  const TYPES = [
    "assumes",
    "constrained_by",
    "constrains",
    "consumes",
    "covered_by",
    "depends_on",
    "executable_for",
    "exempts",
    "guards",
    "implements",
    "publishes",
    "relates_to",
    "requires_predicate",
    "requires_property",
    "requires_rule",
    "restates",
    "specified_by",
    "supersedes",
    "validates",
    "verified_by",
  ];
  const PREFIX: Record<string, string> = {
    req: "REQ-1",
    scenario: "SCEN-1",
    test: "TEST-1",
    adr: "ADR-1",
    flag: "FLAG-1",
    event: "EVENT-1",
    symbol: "SYM-1",
    fact: "FACT-1",
  };
  const RULES: Array<[string, string, string]> = [
    ["depends_on", "req", "req"],
    ["executable_for", "symbol", "test"],
    ["specified_by", "req", "scenario"],
    ["verified_by", "req", "test"],
    ["verified_by", "scenario", "test"],
    ["validates", "test", "req"],
    ["validates", "test", "scenario"],
    ["implements", "symbol", "req"],
    ["covered_by", "symbol", "test"],
    ["constrained_by", "symbol", "adr"],
    ["constrains", "req", "fact"],
    ["requires_property", "req", "fact"],
    ["requires_predicate", "req", "fact"],
    ["requires_rule", "req", "fact"],
    ["guards", "flag", "symbol"],
    ["guards", "flag", "event"],
    ["guards", "flag", "req"],
    ["publishes", "symbol", "event"],
    ["consumes", "symbol", "event"],
    ["supersedes", "adr", "adr"],
    ["supersedes", "req", "req"],
    ["restates", "req", "req"],
    ["assumes", "scenario", "fact"],
    ["exempts", "req", "req"],
  ];
  const linked = (type: string, links: string) =>
    extractFromMarkdownString(
      md(`id: X-9\ntype: ${type}\ntitle: T\n${STAMPS}links: ${links}`),
      "/kb/x.md",
    ).relationships;
  const linkError = (type: string, links: string) =>
    failure(
      md(`id: X-9\ntype: ${type}\ntitle: T\n${STAMPS}links: ${links}`),
      "/kb/x.md",
    );

  test("reads string and typed links and skips malformed ones", () => {
    expect(
      linked(
        "req",
        "[REQ-2, null, 5, {type: depends_on}, {target: REQ-3}, {type: 1, target: REQ-3}, {type: depends_on, target: REQ-4}]",
      ),
    ).toStrictEqual([
      { type: "relates_to", from: "X-9", to: "REQ-2" },
      { type: "depends_on", from: "X-9", to: "REQ-4" },
    ]);
    expect(linked("req", "REQ-2")).toStrictEqual([]);
  });

  test("accepts every allowed direction", () => {
    for (const [type, from, to] of RULES) {
      expect([
        type,
        from,
        to,
        linked(from, `[{type: ${type}, target: ${PREFIX[to]}}]`),
      ]).toStrictEqual([
        type,
        from,
        to,
        [{ type, from: "X-9", to: PREFIX[to] }],
      ]);
    }
    expect(
      linked(
        "fact",
        "[{type: relates_to, target: SYM-1}, {type: exempts, target: OTHER-1}]",
      ),
    ).toStrictEqual([
      { type: "relates_to", from: "X-9", to: "SYM-1" },
      { type: "exempts", from: "X-9", to: "OTHER-1" },
    ]);
  });

  test("names the allowed directions of a rejected link", () => {
    for (const type of TYPES.filter((name) => name !== "relates_to")) {
      const allowed = RULES.filter(([rule]) => rule === type).map(
        ([, from, to]) => `${from} -> ${to}`,
      );
      expect([
        type,
        shape(linkError("fact", `[{type: ${type}, target: sym-2}]`)),
      ]).toStrictEqual([
        type,
        {
          message: `Invalid relationship direction for "${type}": fact -> symbol. Allowed: ${allowed.join(", ")}`,
          classification: "Invalid Relationship Direction",
          hint: "Reverse the link direction or use the correct relationship type for these entity kinds.",
          filePath: "/kb/x.md",
        },
      ]);
    }
    for (const [kind, id] of Object.entries(PREFIX)) {
      expect(
        linkError("flag", `[{type: exempts, target: ${id.toLowerCase()}}]`)
          .message,
      ).toBe(
        `Invalid relationship direction for "exempts": flag -> ${kind}. Allowed: req -> req`,
      );
    }
    expect(
      linkError("symbol", "[{type: depends_on, target: TEST-1}]").message,
    ).toBe(
      'Invalid relationship direction for "depends_on": symbol -> test. Allowed: req -> req',
    );
    expect(
      linkError("symbol", "[{type: depends_on, target: REQ-1}]").message,
    ).toBe(
      'Invalid relationship direction for "depends_on": symbol -> req. Allowed: req -> req',
    );
    expect(
      linkError("req", "[{type: depends_on, target: TEST-1}]").message,
    ).toBe(
      'Invalid relationship direction for "depends_on": req -> test. Allowed: req -> req',
    );
  });

  test("rejects unknown link types", () => {
    expect(shape(linkError("req", "[{type: owns, target: X}]"))).toStrictEqual({
      message: `Invalid relationship type "owns". Allowed types: ${TYPES.join(", ")}`,
      classification: "Invalid Relationship Type",
      hint: "Use one of the supported relationship types from relationship.schema.json.",
      filePath: "/kb/x.md",
    });
  });
});

describe("base fields", () => {
  test("copies optional base fields and the origin", () => {
    const entity = extract(
      "id: R\ntitle: T\ntags: [a]\nowner: o\npriority: p\nseverity: s\ntext_ref: r\norigin: {kind: agent, ref: why}",
    ).entity;
    expect(entity).toStrictEqual({
      id: "R",
      type: "req",
      title: "T",
      status: "open",
      created_at: "c",
      updated_at: "u",
      source: "/kb/requirements/r.md",
      tags: ["a"],
      owner: "o",
      priority: "p",
      severity: "s",
      text_ref: "r",
      origin: { kind: "agent", ref: "why" },
    });
  });

  test("normalizes YAML timestamps", () => {
    const entity = extractFromMarkdownString(
      md(
        "id: F\ntitle: T\ncreated_at: 2026-01-02T03:04:05Z\nupdated_at: '2026-x'",
      ),
      "/kb/flags/f.md",
    ).entity;
    expect([entity.created_at, entity.updated_at]).toStrictEqual([
      "2026-01-02T03:04:05.000Z",
      "2026-x",
    ]);
  });

  test("rejects an invalid origin", () => {
    expect(shape(fails("id: R\ntitle: T\norigin: human"))).toStrictEqual({
      message: "Invalid origin: origin must be a mapping with at least a kind",
      classification: "Invalid Entity Origin",
      hint: "Use origin: {kind: human|agent|migration|import, ref, approved_by, recorded_at}; only kind is required.",
      filePath: "/kb/requirements/r.md",
    });
  });
});

const FLAG = "/kb/flags/f.md";
const flag = (frontmatter: string) =>
  extractFromMarkdownString(
    md(`id: F\ntitle: T\n${STAMPS}${frontmatter}`),
    FLAG,
  ).entity;
const flagFails = (frontmatter: string) =>
  failure(md(`id: F\ntitle: T\n${STAMPS}${frontmatter}`), FLAG);
const CLAIM = "CLAIM-0123456789ABCDEF";
const CLAIM2 = "CLAIM-FEDCBA9876543210";

describe("requirement-only fields", () => {
  test("copies authored semantic fields and filters lists", () => {
    const entity = extract(
      [
        "id: R",
        "title: T",
        "semantic_text: authored",
        `logic_claims: [${CLAIM}, 5]`,
        "semantic_clauses: [one, 7]",
        "semantic_inventory_version: kibi.semantic-inventory.v1",
        "semantic_source_field: text_ref",
        `semantic_source_hash: ${"a".repeat(64)}`,
        `exempts_claims: [${CLAIM2}, false]`,
        "semantic_inventory:",
        `  - {claim_key: ${CLAIM}, claim_text: x, role: normative, status: modeled, span: {start: 0, end: 1}}`,
        "  - 5",
        "  - [1]",
      ].join("\n"),
      "/kb/requirements/r.md",
      "body text\n",
    ).entity;
    expect(entity).toStrictEqual({
      id: "R",
      type: "req",
      title: "T",
      status: "open",
      created_at: "c",
      updated_at: "u",
      source: "/kb/requirements/r.md",
      semantic_text: "authored",
      logic_claims: [CLAIM],
      semantic_clauses: ["one"],
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "text_ref",
      semantic_source_hash: "a".repeat(64),
      exempts_claims: [CLAIM2],
      semantic_inventory: [
        {
          claim_key: CLAIM,
          claim_text: "x",
          role: "normative",
          status: "modeled",
          span: { start: 0, end: 1 },
        },
      ],
    });
  });

  test("derives semantic text from the body only when present", () => {
    expect(
      extract(
        "id: R\ntitle: T",
        "/kb/requirements/r.md",
        "# Heading\n- The system must work.\n",
      ).entity.semantic_text,
    ).toBe("The system must work.");
    expect(
      "semantic_text" in
        extract("id: R\ntitle: T", "/kb/requirements/r.md", "# Only\n").entity,
    ).toBe(false);
    expect(
      extract(
        "id: R\ntitle: T\nsemantic_text: ''",
        "/kb/requirements/r.md",
        "body",
      ).entity.semantic_text,
    ).toBe("");
  });

  test("ignores requirement-only lists elsewhere", () => {
    expect(
      flag(
        `logic_claims: [${CLAIM}]\nsemantic_clauses: [x]\nexempts_claims: [${CLAIM}]\nsemantic_inventory: []`,
      ),
    ).toStrictEqual({
      id: "F",
      type: "flag",
      title: "T",
      status: "active",
      created_at: "c",
      updated_at: "u",
      source: FLAG,
    });
    for (const field of [
      "semantic_text: x",
      "semantic_inventory_version: kibi.semantic-inventory.v1",
      "semantic_source_field: title",
      `semantic_source_hash: ${"a".repeat(64)}`,
      "proof_exempt: true",
      "proof_exempt_reason: r",
      "approved_by: a",
      "approval_ref: a",
      "failure_side_waiver: a",
      "failure_side_waiver_approved_by: a",
      "rationale: a",
    ]) {
      expect([field, flag(field)]).toStrictEqual([
        field,
        {
          id: "F",
          type: "flag",
          title: "T",
          status: "active",
          created_at: "c",
          updated_at: "u",
          source: FLAG,
        },
      ]);
    }
    expect(
      flag(
        "logic_claims: 5\nsemantic_clauses: x\nexempts_claims: x\nsemantic_inventory: x",
      ).type,
    ).toBe("flag");
    expect(
      extract(
        "id: R\ntitle: T\nlogic_claims: 5\nsemantic_clauses: x\nexempts_claims: x\nsemantic_inventory: x",
      ).entity.logic_claims,
    ).toBe(undefined);
  });

  test("validates proof exemptions", () => {
    expect(
      extract(
        "id: R\ntitle: T\nproof_exempt: false\nproof_exempt_reason: ' why '",
      ).entity,
    ).toMatchObject({
      proof_exempt: false,
      proof_exempt_reason: " why ",
    });
    expect(shape(fails("id: R\ntitle: T\nproof_exempt: 'yes'"))).toStrictEqual({
      message: "Invalid proof_exempt; expected true or false",
      classification: "Invalid Proof Exemption Flag",
      hint: "Set proof_exempt: true with a non-empty proof_exempt_reason.",
      filePath: "/kb/requirements/r.md",
    });
    for (const reason of ["''", "'  '", "5"]) {
      expect(
        shape(fails(`id: R\ntitle: T\nproof_exempt_reason: ${reason}`)),
      ).toStrictEqual({
        message: "Invalid proof_exempt_reason; expected a non-empty string",
        classification: "Invalid Proof Exemption Reason",
        hint: "proof_exempt requires a non-empty proof_exempt_reason explaining why the requirement is outside E2E-proof scope.",
        filePath: "/kb/requirements/r.md",
      });
    }
  });

  test("validates approvals, waivers and rationale", () => {
    const entity = extract(
      "id: R\ntitle: T\napproved_by: Ann\napproval_ref: ADR-1\nfailure_side_waiver: none\nfailure_side_waiver_approved_by: Bob\nrationale: because",
    ).entity;
    expect(entity).toMatchObject({
      approved_by: "Ann",
      approval_ref: "ADR-1",
      failure_side_waiver: "none",
      failure_side_waiver_approved_by: "Bob",
      rationale: "because",
    });
    for (const field of ["approved_by", "approval_ref"]) {
      for (const value of ["''", "' '", "3"]) {
        expect(
          shape(fails(`id: R\ntitle: T\n${field}: ${value}`)),
        ).toStrictEqual({
          message: `Invalid ${field}; expected a non-empty string`,
          classification: "Invalid Exception Approval",
          hint: "Set approved_by to the approving person or role (and optionally approval_ref to the decision record) on the exception requirement.",
          filePath: "/kb/requirements/r.md",
        });
      }
    }
    for (const field of [
      "failure_side_waiver",
      "failure_side_waiver_approved_by",
    ]) {
      for (const value of ["''", "' '", "3"]) {
        expect(
          shape(fails(`id: R\ntitle: T\n${field}: ${value}`)),
        ).toStrictEqual({
          message: `Invalid ${field}; expected a non-empty string`,
          classification: "Invalid Failure Side Waiver",
          hint: "Set failure_side_waiver to why the requirement has no input or attempt to refuse, and failure_side_waiver_approved_by to the person who accepted it.",
          filePath: "/kb/requirements/r.md",
        });
      }
    }
    for (const value of ["''", "' '", "3"]) {
      expect(
        shape(fails(`id: R\ntitle: T\nrationale: ${value}`)),
      ).toStrictEqual({
        message: "Invalid rationale; expected a non-empty string",
        classification: "Invalid Rationale",
        hint: "Set rationale to one or two sentences saying why the requirement exists, or remove the field.",
        filePath: "/kb/requirements/r.md",
      });
    }
  });
});

describe("decision fields", () => {
  const FIRMNESS_HINT =
    "Use firm only for a rule a human stated (with origin.ref to their words), default for a delegated or agent choice, exploratory for a flagged guess; remove the field from other entity types.";
  const EVIDENCE_HINT =
    "Set required_evidence to the weakest evidence level the requirement accepts (proved, tested, asserted or unverified), or remove the field to derive it from firmness.";

  test("accepts firmness on requirements and ADRs", () => {
    expect(
      extract("id: R\ntitle: T\nfirmness: exploratory").entity.firmness,
    ).toBe("exploratory");
    const adr = extractFromMarkdownString(
      md(`id: A\ntitle: T\n${STAMPS}firmness: default`),
      "/kb/adr/a.md",
    ).entity;
    expect(adr.firmness).toBe("default");
    expect(shape(fails("id: R\ntitle: T\nfirmness: soft"))).toStrictEqual({
      message: "Invalid firmness; expected one of firm, default, exploratory",
      classification: "Invalid Firmness",
      hint: FIRMNESS_HINT,
      filePath: "/kb/requirements/r.md",
    });
    expect(shape(flagFails("firmness: firm"))).toStrictEqual({
      message: "firmness is only allowed on type: req or adr",
      classification: "Invalid Firmness",
      hint: FIRMNESS_HINT,
      filePath: FLAG,
    });
  });

  test("accepts required evidence on requirements only", () => {
    expect(
      extract("id: R\ntitle: T\nrequired_evidence: asserted").entity
        .required_evidence,
    ).toBe("asserted");
    expect(
      shape(fails("id: R\ntitle: T\nrequired_evidence: strong")),
    ).toStrictEqual({
      message:
        "Invalid required_evidence; expected one of proved, tested, asserted, unverified",
      classification: "Invalid Required Evidence",
      hint: EVIDENCE_HINT,
      filePath: "/kb/requirements/r.md",
    });
    expect(shape(flagFails("required_evidence: proved"))).toStrictEqual({
      message: "required_evidence is only allowed on type: req",
      classification: "Invalid Required Evidence",
      hint: EVIDENCE_HINT,
      filePath: FLAG,
    });
  });

  test("validates scenario outcomes", () => {
    for (const expects of ["success", "rejection", "error"]) {
      const entity = extractFromMarkdownString(
        md(`id: S\ntitle: T\n${STAMPS}expects: ${expects}`),
        "/kb/scenarios/s.md",
      ).entity;
      expect(entity.expects as string).toBe(expects);
    }
    expect(
      shape(
        failure(
          md(`id: S\ntitle: T\n${STAMPS}expects: maybe`),
          "/kb/scenarios/s.md",
        ),
      ),
    ).toStrictEqual({
      message: "Invalid expects; expected success, rejection or error",
      classification: "Invalid Scenario Outcome",
      hint: "Set expects: success, expects: rejection or expects: error on the scenario.",
      filePath: "/kb/scenarios/s.md",
    });
    expect(flag("expects: maybe").expects).toBe(undefined);
  });
});

describe("edge cases of the shared helpers", () => {
  test("strips list markers only at the start of a line", () => {
    expect(legacyRequirementSemanticText("a - b\nx- b\nx> b")).toBe(
      "a - b\nx- b\nx> b",
    );
  });

  test("detects an embedded mapping value", () => {
    expect(detectEmbeddedEntities({ scenario: { a: 1 } }, "req")).toStrictEqual(
      ["scenario"],
    );
    expect(detectEmbeddedEntities({ testCase: { a: 1 } }, "req")).toStrictEqual(
      ["test"],
    );
  });

  test("treats a lone opening delimiter as an unclosed block", () => {
    expect(failure("---").message).toBe("Missing closing --- delimiter");
    expect(failure("---  ").message).toBe("Missing closing --- delimiter");
  });

  test("reads a front matter closed by the last line", () => {
    expect(
      extractFromMarkdownString("---\ntitle: A\n---  ", FLAG).entity.title,
    ).toBe("A");
  });
});

const FACT_ONLY = [
  "fact_kind",
  "subject_key",
  "property_key",
  "operator",
  "value_type",
  "value_string",
  "unit",
  "scope",
  "polarity",
  "valid_from",
  "valid_to",
  "canonical_key",
  "claim_key",
  "claim_text",
  "dimension_waiver",
  "dimension_waiver_approved_by",
  "case_waiver",
  "case_waiver_approved_by",
  "predicate_name",
  "predicate_namespace",
  "rule_ir",
  "argument_constants",
  "argument_aliases",
  "rule_hash",
  "rule_schema_id",
  "rule_name",
  "semantic_key",
  "value_int",
  "value_number",
  "predicate_arity",
  "claim_span_start",
  "claim_span_end",
  "value_bool",
  "closed_world",
  "argument_names",
  "argument_types",
  "argument_descriptions",
  "key_arguments",
  "aliases",
  "examples",
  "predicate_args",
  "value_set",
];
const TEST_ONLY = [
  "verification_scope",
  "verification_perspective",
  "proof_contract",
  "proof_bindings",
  "proof_receipts",
];

describe("type-restricted fields", () => {
  test("rejects every fact-only field on other types", () => {
    for (const field of FACT_ONLY) {
      expect([field, shape(flagFails(`${field}: 0`))]).toStrictEqual([
        field,
        {
          message: `Fact-only fields are only allowed on type: fact (found ${field})`,
          classification: "Fact Field on Non-Fact Entity",
          hint: "Remove fact-only fields or change the entity type to fact.",
          filePath: FLAG,
        },
      ]);
    }
    expect(flagFails("value_bool: false").message).toBe(
      "Fact-only fields are only allowed on type: fact (found value_bool)",
    );
  });

  test("rejects every test-only field on other types", () => {
    for (const field of TEST_ONLY) {
      expect([field, shape(flagFails(`${field}: 0`))]).toStrictEqual([
        field,
        {
          message: `Test-only fields are only allowed on type: test (found ${field})`,
          classification: "Test Field on Non-Test Entity",
          hint: "Remove test-only fields or change the entity type to test.",
          filePath: FLAG,
        },
      ]);
    }
    expect(flagFails("proof_receipts: false").message).toBe(
      "Test-only fields are only allowed on type: test (found proof_receipts)",
    );
  });
});

const TEST_FILE = "/kb/tests/t.md";
const testEntity = (frontmatter: string) =>
  extractFromMarkdownString(
    md(`id: T-1\ntitle: T\n${STAMPS}${frontmatter}`),
    TEST_FILE,
  ).entity;
const testFails = (frontmatter: string) =>
  failure(md(`id: T-1\ntitle: T\n${STAMPS}${frontmatter}`), TEST_FILE);
const TEST_BASE = {
  id: "T-1",
  type: "test",
  title: "T",
  status: "pending",
  created_at: "c",
  updated_at: "u",
  source: TEST_FILE,
};
const CONTRACT = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-A", target: "default" }],
  success_policy: "all_required_first_attempt",
};
const CONTRACT_YAML = `proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-A
      target: default
  success_policy: all_required_first_attempt`;

const h = (pair: string) => pair.repeat(64 / pair.length);
function receiptYaml(finishedAt: string, testId = "T-1") {
  return `  - version: kibi.proof-receipt.v1
    receipt_id: PR-EXTRACTOR-000001
    test_id: ${testId}
    scope: end_to_end
    outcome: passed
    code_snapshot: ${h("a")}
    environment_hash: ${h("b")}
    started_at: 2026-08-10T11:55:00.000Z
    finished_at: ${finishedAt}
    artifact_digest: ${h("c")}
    contract_hash: ${h("d")}
    fingerprint: ${h("e")}
    fingerprint_components:
      contract: ${h("1a")}
      integration: ${h("2a")}
      command: ${h("3a")}
      bindings: ${h("4a")}
      producer: ${h("5a")}
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv: [node, scripts/proof.mjs]
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-A
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable`;
}

describe("test entity fields", () => {
  test("accepts each verification scope and perspective", () => {
    for (const scope of ["unit", "integration", "end_to_end"]) {
      expect(
        testEntity(`verification_scope: ${scope}`) as unknown,
      ).toStrictEqual({
        ...TEST_BASE,
        verification_scope: scope,
      });
    }
    for (const perspective of ["internal", "consumer"]) {
      expect(
        testEntity(`verification_perspective: ${perspective}`) as unknown,
      ).toStrictEqual({ ...TEST_BASE, verification_perspective: perspective });
    }
    expect(testEntity("")).toStrictEqual(TEST_BASE);
  });

  test("rejects an unknown verification scope or perspective", () => {
    for (const scope of ["", "e2e", "Unit"]) {
      expect(shape(testFails(`verification_scope: "${scope}"`))).toStrictEqual({
        message:
          "Invalid verification_scope; expected one of: unit, integration, end_to_end",
        classification: "Invalid Test Verification Scope",
        hint: "Use one of: unit, integration, end_to_end.",
        filePath: TEST_FILE,
      });
    }
    for (const perspective of ["", "external"]) {
      expect(
        shape(testFails(`verification_perspective: "${perspective}"`)),
      ).toStrictEqual({
        message:
          "Invalid verification_perspective; expected one of: internal, consumer",
        classification: "Invalid Test Verification Perspective",
        hint: "Use one of: internal, consumer.",
        filePath: TEST_FILE,
      });
    }
  });

  test("validates the proof contract", () => {
    expect(testEntity(CONTRACT_YAML) as unknown).toStrictEqual({
      ...TEST_BASE,
      proof_contract: CONTRACT,
    });
    for (const value of ["[]", "x", "5", "~"]) {
      expect([
        value,
        shape(testFails(`proof_contract: ${value}`)),
      ]).toStrictEqual([
        value,
        {
          message: "Invalid proof_contract; expected an object",
          classification: "Invalid Test Proof Contract",
          hint: "Use the kibi.proof-contract.v1 object shape.",
          filePath: TEST_FILE,
        },
      ]);
    }
    expect(
      shape(testFails("proof_contract: {version: kibi.proof-contract.v1}")),
    ).toStrictEqual({
      message:
        "Invalid proof_contract: data must have required property 'integration', data must have required property 'required_proofs', data must have required property 'success_policy'",
      classification: "Invalid Test Proof Contract",
      hint: "Use the kibi.proof-contract.v1 object shape with explicit required_proofs obligations.",
      filePath: TEST_FILE,
    });
  });

  test("validates the proof bindings", () => {
    expect(
      testEntity("proof_bindings: [{symbol_id: SYM-A, target: default}]"),
    ).toStrictEqual({
      ...TEST_BASE,
      proof_bindings: [{ symbol_id: "SYM-A", target: "default" }],
    });
    const hint =
      "Each binding requires symbol_id and target; native_id, aliases, source_file, and line are optional.";
    for (const value of ["{}", "x", "~"]) {
      expect([
        value,
        shape(testFails(`proof_bindings: ${value}`)),
      ]).toStrictEqual([
        value,
        {
          message: "Invalid proof_bindings; expected an array",
          classification: "Invalid Test Proof Bindings",
          hint,
          filePath: TEST_FILE,
        },
      ]);
    }
    expect(shape(testFails('proof_bindings: [{symbol_id: ""}]'))).toStrictEqual(
      {
        message:
          "Invalid proof_bindings: data/0 must have required property 'target', data/0/symbol_id must NOT have fewer than 1 characters",
        classification: "Invalid Test Proof Bindings",
        hint,
        filePath: TEST_FILE,
      },
    );
  });

  test("normalizes and accepts a valid receipt history", () => {
    for (const finishedAt of [
      "2026-08-10T12:00:00.000Z",
      '"2026-08-10T12:00:00.000Z"',
    ]) {
      const entity = testEntity(
        `verification_scope: end_to_end\nproof_receipts:\n${receiptYaml(finishedAt)}`,
      );
      const receipt = entity.proof_receipts?.[0] as Record<string, unknown>;
      expect([receipt.started_at, receipt.finished_at]).toStrictEqual([
        "2026-08-10T11:55:00.000Z",
        "2026-08-10T12:00:00.000Z",
      ]);
      expect(receipt.receipt_id).toBe("PR-EXTRACTOR-000001");
      expect(entity.proof_receipts).toHaveLength(1);
    }
    expect(
      testEntity("verification_scope: unit\nproof_receipts: []"),
    ).toStrictEqual({
      ...TEST_BASE,
      verification_scope: "unit",
      proof_receipts: [],
    });
  });

  test("rejects an invalid receipt history", () => {
    const hint =
      "Bind every receipt to this test and its typed verification_scope, with unique IDs and ordered ISO-8601 timestamps.";
    for (const value of ["{}", "x", "~"]) {
      expect([
        value,
        shape(testFails(`proof_receipts: ${value}`)),
      ]).toStrictEqual([
        value,
        {
          message: "Invalid proof_receipts; expected an array",
          classification: "Invalid Test Proof Receipts",
          hint: "Use kibi prove to append kibi.proof-receipt.v1 objects; receipts are engine-derived, never hand-authored.",
          filePath: TEST_FILE,
        },
      ]);
    }
    expect(
      shape(
        testFails(
          "proof_receipts: [5, null, [1], {receipt_id: x}, {receipt_id: y}]",
        ),
      ),
    ).toStrictEqual({
      message:
        "verification_scope is required when proof_receipts are present; proof_receipts[0].test_id must equal 'T-1'; proof_receipts[0] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'T-1'; proof_receipts[1].test_id must equal 'T-1'; proof_receipts[1] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'T-1'",
      classification: "Invalid Test Proof Receipts",
      hint,
      filePath: TEST_FILE,
    });
    expect(
      testFails(
        `verification_scope: end_to_end\nproof_receipts:\n${receiptYaml("2026-08-10T12:00:00.000Z", "T-2")}`,
      ).message,
    ).toBe(
      "proof_receipts[0].test_id must equal 'T-1'; proof_receipts[0] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'T-1'",
    );
  });
});

const FACT_FILE = "/kb/facts/f.md";
const fact = (frontmatter: string) =>
  extractFromMarkdownString(
    md(`id: F-1\ntitle: T\n${STAMPS}${frontmatter}`),
    FACT_FILE,
  ).entity;
const factFails = (frontmatter: string) =>
  failure(md(`id: F-1\ntitle: T\n${STAMPS}${frontmatter}`), FACT_FILE);
const FACT_BASE = {
  id: "F-1",
  type: "fact",
  title: "T",
  status: "active",
  created_at: "c",
  updated_at: "u",
  source: FACT_FILE,
};

describe("fact fields", () => {
  test("copies typed fact fields and normalizes validity dates", () => {
    expect(
      fact(
        [
          "fact_kind: observation",
          "subject_key: s",
          "property_key: p",
          "value_type: string",
          "value_string: v",
          "unit: u",
          "scope: sc",
          "valid_from: 2026-01-02T03:04:05Z",
          'valid_to: "2027"',
          "value_int: 3",
          "value_number: 2.5",
          "value_bool: true",
          "closed_world: false",
          "aliases: [a, 5, b]",
          "examples: [e]",
          "argument_names: x",
          "value_set: ~",
        ].join("\n"),
      ),
    ).toStrictEqual({
      ...FACT_BASE,
      fact_kind: "observation",
      subject_key: "s",
      property_key: "p",
      value_type: "string",
      value_string: "v",
      unit: "u",
      scope: "sc",
      valid_from: "2026-01-02T03:04:05.000Z",
      valid_to: "2027",
      value_int: 3,
      value_number: 2.5,
      value_bool: true,
      closed_world: false,
      aliases: ["a", "b"],
      examples: ["e"],
    });
    expect(fact("valid_to: 2026-01-02T03:04:05Z").valid_to).toBe(
      "2026-01-02T03:04:05.000Z",
    );
    expect(fact("")).toStrictEqual(FACT_BASE);
  });

  test("reports every schema error with its path", () => {
    expect(shape(factFails("fact_kind: predicate_schema"))).toStrictEqual({
      message:
        "Entity validation failed: root: must have required property 'predicate_name'; root: must have required property 'predicate_arity'; root: must have required property 'argument_names'; root: must have required property 'argument_types'; root: must match \"then\" schema",
      classification: "Entity Validation Error",
      hint: "Fix the entity fields so they match the public schema.",
      filePath: FACT_FILE,
    });
    expect(factFails("subject_key: 5").message).toBe(
      "Entity validation failed: /subject_key: must be string",
    );
    expect(factFails("status: zzz").message).toBe(
      "Entity validation failed: /status: must be equal to one of the allowed values",
    );
  });

  test("derives and checks the claim key", () => {
    const expected = "CLAIM-AE7792FD43A9A428";
    expect(
      fact("fact_kind: property_value\nclaim_text: Users must log in"),
    ).toStrictEqual({
      ...FACT_BASE,
      fact_kind: "property_value",
      claim_text: "Users must log in",
      claim_key: expected,
    });
    expect(
      fact(
        `fact_kind: property_value\nclaim_text: Users must log in\nclaim_key: ${expected}`,
      ).claim_key,
    ).toBe(expected);
    expect(
      fact("fact_kind: observation\nclaim_text: Users must log in").claim_key,
    ).toBe(undefined);
    expect(
      shape(
        factFails(
          `fact_kind: property_value\nclaim_text: Users must log in\nclaim_key: ${CLAIM}`,
        ),
      ),
    ).toStrictEqual({
      message: `Entity validation failed: claim_key must equal the stable key derived from claim_text (expected '${expected}')`,
      classification: "Logical Claim Provenance Mismatch",
      hint: "Use the claim_key returned by kb_semantic_advisor for this exact atomic clause.",
      filePath: FACT_FILE,
    });
  });
});

describe("YAML errors", () => {
  const yamlError = (frontmatter: string, file = FLAG) =>
    shape(failure(`---\n${frontmatter}\n---\n`, file));
  const COLON = {
    classification: "Unquoted colon likely in title",
    hint: 'Wrap values containing colons in quotes (e.g., title: "Foo: Bar").',
  };
  const GENERIC = {
    classification: "Generic YAML mapping error",
    hint: "Check for unclosed brackets, braces, or quotes in your YAML.",
  };
  const SYNTAX = {
    classification: "Frontmatter YAML syntax error",
    hint: "Check the YAML syntax in your frontmatter.",
  };

  function classified(frontmatter: string) {
    const { classification, hint } = yamlError(frontmatter);
    return { classification, hint };
  }

  test("keeps the original message", () => {
    const error = failure("---\na: [1, 2\n---\n", FLAG);
    expect(error.message.startsWith("Failed to parse frontmatter: ")).toBe(
      true,
    );
    expect(error.originalError).toBe(
      error.message.slice("Failed to parse frontmatter: ".length),
    );
    expect(error.originalError?.includes("flow collection")).toBe(true);
    expect(error.filePath).toBe(FLAG);
  });

  test("names an unquoted colon in the title", () => {
    expect(classified("title: Foo: Bar")).toStrictEqual(COLON);
    expect(classified("  title:Foo: Bar baz\nx: [")).toStrictEqual(COLON);
    expect(classified("title: Foo:  Bar")).toStrictEqual(COLON);
    expect(classified("a: 1\n: b")).toStrictEqual(COLON);
  });

  test("does not blame titles that are quoted, folded or commented", () => {
    const cases: Array<[string, typeof GENERIC]> = [
      ['title: "Foo: Bar"\nx: [', GENERIC],
      ["title: 'Foo: Bar'\nx: [", GENERIC],
      ["title: >Foo: Bar\nx: [", SYNTAX],
      ["title: |Foo: Bar\nx: [", SYNTAX],
      ["title: Foo #: Bar\nx: [", GENERIC],
      ["title: Foo:Bar\nx: [", GENERIC],
      ["xtitle: Foo: Bar\nx: [", SYNTAX],
      ["title\n: Foo: Bar", GENERIC],
    ];
    for (const [frontmatter, expected] of cases) {
      expect([frontmatter, classified(frontmatter)]).toStrictEqual([
        frontmatter,
        expected,
      ]);
    }
  });

  test("names a generic mapping error", () => {
    expect(classified("a: [1, 2")).toStrictEqual(GENERIC);
    expect(classified("- a\nb: c")).toStrictEqual(GENERIC);
    expect(classified("a: [1, 2\nb: c")).toStrictEqual(GENERIC);
  });

  test("keeps the generic classification otherwise", () => {
    expect(classified("a: b\n\tc: d")).toStrictEqual(SYNTAX);
    expect(classified("a: &x\nb: *y")).toStrictEqual(SYNTAX);
  });
});

describe("reading files", () => {
  test("reads a document from disk", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-md-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, "flags", "f.md");
    const flags = path.join(dir, "flags");
    mkdirSync(flags);
    writeFileSync(file, md(`id: F\ntitle: Ünïcode\n${STAMPS}`));
    expect(extractFromMarkdown(file).entity.title).toBe("Ünïcode");
  });

  test("reports a missing file", () => {
    const file = path.join(tmpdir(), "kibi-md-missing", "nope.md");
    const error = (() => {
      try {
        extractFromMarkdown(file);
      } catch (caught) {
        return caught as FrontmatterError;
      }
      throw new Error("expected a failure");
    })();
    expect(error).toBeInstanceOf(FrontmatterError);
    expect(shape(error)).toStrictEqual({
      message: `Failed to read file: ENOENT: no such file or directory, open '${file}'`,
      classification: "File Read Error",
      hint: "Check the file for syntax errors.",
      filePath: file,
    });
  });
});
