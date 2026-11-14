import { describe, expect, test } from "bun:test";
import { extractFromMarkdownString } from "../../src/extractors/markdown.js";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../src/operations/semantic-advisor/clauses.js";
import { semanticSourceHash } from "../../src/operations/semantic-advisor/shared.js";
import {
  STAGED_INVENTORY_DRIFT_RULE,
  STAGED_STATEMENT_DRIFT_RULE,
  stagedInventoryDriftViolations,
  stagedStatementDriftViolations,
} from "../../src/traceability/staged-inventory-drift.js";

const ORIGINAL = "The checkout total stays positive for every order.";
const EDITED = "The checkout total stays positive for every paid order.";

function inventoried(
  id: string,
  source: string,
  prose = source,
  fields: string[] = [
    "logic_claims",
    "semantic_inventory_version",
    "semantic_source_hash",
    "semantic_inventory",
  ],
): string {
  const claimText = normalizeSemanticClause(source);
  const claimKey = semanticClaimKey(claimText);
  const lines: Record<string, string> = {
    logic_claims: `logic_claims:\n  - ${claimKey}`,
    semantic_inventory_version:
      "semantic_inventory_version: kibi.semantic-inventory.v1",
    semantic_source_hash: `semantic_source_hash: ${semanticSourceHash(source)}`,
    semantic_inventory: `semantic_inventory:\n  - claim_key: ${claimKey}\n    claim_text: ${claimText}\n    role: descriptive\n    status: ontology_gap\n    span: {start: 0, end: ${Buffer.byteLength(claimText, "utf8")}}`,
  };
  return `---\nid: ${id}\ntitle: Checkout total\ntype: req\nstatus: open\nsemantic_source_field: semantic_text\n${fields.map((f) => lines[f]).join("\n")}\n---\n\n${prose}\n`;
}

const plain = (id: string, prose: string, type = "req") =>
  `---\nid: ${id}\ntitle: Checkout total\ntype: ${type}\nstatus: open\n---\n\n${prose}\n`;

const path = (id: string) => `.kb/requirements/${id}.md`;

function drift(
  staged: string[],
  base: Record<string, string>,
  judgeNewRequirements?: boolean,
) {
  const entities = staged.map((content) => {
    const id = /id: (\S+)/.exec(content)?.[1] as string;
    return extractFromMarkdownString(content, path(id));
  });
  return stagedInventoryDriftViolations({
    stagedPaths: new Set(entities.map((e) => e.entity.source)),
    snapshotEntities: entities,
    readBase: (p) => base[p] ?? null,
    ...(judgeNewRequirements === undefined ? {} : { judgeNewRequirements }),
  });
}

describe("stagedInventoryDriftViolations", () => {
  test("names the rule, the contract message and sorts by id", () => {
    const violations = drift(
      [
        inventoried("REQ-b", ORIGINAL, EDITED),
        inventoried("REQ-a", ORIGINAL, EDITED),
      ],
      {
        [path("REQ-a")]: inventoried("REQ-a", ORIGINAL),
        [path("REQ-b")]: inventoried("REQ-b", ORIGINAL),
      },
    );
    expect(STAGED_INVENTORY_DRIFT_RULE).toBe("semantic-inventory-drift");
    expect(violations.map((v) => v.entityId)).toStrictEqual(["REQ-a", "REQ-b"]);
    const [first] = violations;
    expect(first?.rule).toBe("semantic-inventory-drift");
    expect(first?.source).toBe(path("REQ-a"));
    expect(first?.errors.length).toBeGreaterThan(0);
    expect(first?.message).toBe(
      `REQ-a (${path("REQ-a")}): the semantic inventory does not match the requirement's prose, so the next kibi sync rejects it: ${first?.errors.join("; ")}. Run 'kibi migrate' to re-derive it, or kb_model mode analyze with the complete prose and keep its inventory contract.`,
    );
  });

  test("each contract field alone advertises the contract", () => {
    for (const field of [
      "semantic_inventory_version",
      "semantic_source_hash",
      "semantic_inventory",
    ]) {
      const staged = inventoried("REQ-a", ORIGINAL, EDITED, [field]);
      const violations = drift([staged], {
        [path("REQ-a")]: plain("REQ-a", EDITED),
      });
      expect({ field, ids: violations.map((v) => v.entityId) }).toStrictEqual({
        field,
        ids: ["REQ-a"],
      });
      expect(violations[0]?.message).toContain("kibi migrate");
    }
  });

  test("a contract only in the base tree still counts", () => {
    const violations = drift([plain("REQ-a", ORIGINAL)], {
      [path("REQ-a")]: inventoried("REQ-a", ORIGINAL),
    });
    expect(violations[0]?.message).toContain("kibi migrate");
  });

  test("uncontracted new and restated requirements have their own messages", () => {
    const [created] = drift([plain("REQ-a", ORIGINAL)], {});
    expect(created?.message).toBe(
      `REQ-a (${path("REQ-a")}): a new requirement needs a semantic inventory that matches its prose before it is committed, or kibi sync refuses it in every workspace that synced before and has not compiled it yet (a teammate's checkout, a CI store), even where kb_upsert already compiled it into this one: ${created?.errors.join("; ")}. Run kb_model mode analyze (CLI: kibi model) with its id and complete semantic_text, then write the returned inventory contract into it (kb_upsert with semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims).`,
    );
    const [restated] = drift([plain("REQ-a", EDITED)], {
      [path("REQ-a")]: plain("REQ-a", ORIGINAL),
    });
    expect(restated?.message).toStartWith(
      `REQ-a (${path("REQ-a")}): a requirement whose statement changes needs a semantic inventory`,
    );
  });

  test("judging new requirements is the default and can be turned off", () => {
    expect(drift([plain("REQ-a", ORIGINAL)], {}).length).toBe(1);
    expect(drift([plain("REQ-a", ORIGINAL)], {}, true).length).toBe(1);
    expect(drift([plain("REQ-a", ORIGINAL)], {}, false)).toStrictEqual([]);
    expect(
      drift(
        [plain("REQ-a", EDITED)],
        { [path("REQ-a")]: plain("REQ-a", ORIGINAL) },
        false,
      ),
    ).toStrictEqual([]);
  });

  test("an unreadable base is treated as no base", () => {
    expect(
      drift([plain("REQ-a", EDITED)], {
        [path("REQ-a")]: "---\nid: [oops\n---\n",
      }),
    ).toStrictEqual([]);
  });

  test("other entity types are not judged", () => {
    const entity = extractFromMarkdownString(
      plain("ADR-a", ORIGINAL, "adr"),
      ".kb/adr/ADR-a.md",
    );
    expect(
      stagedInventoryDriftViolations({
        stagedPaths: new Set([".kb/adr/ADR-a.md"]),
        snapshotEntities: [entity],
        readBase: () => null,
      }),
    ).toStrictEqual([]);
  });
});

const pinnedDoc = (
  id: string,
  semanticText: string,
  body: string,
  type = "req",
) =>
  `---\nid: ${id}\ntitle: Checkout total\ntype: ${type}\nstatus: open\nsemantic_text: "${semanticText}"\n---\n\n${body}\n`;

function statement(
  files: { path: string; content: string }[],
  base: Record<string, string>,
) {
  return stagedStatementDriftViolations({
    stagedFiles: files,
    readBase: (p) => base[p] ?? null,
  });
}

describe("stagedStatementDriftViolations", () => {
  test("reports with the full message, sorted by id", () => {
    const files = ["REQ-b", "REQ-a"].map((id) => ({
      path: path(id),
      content: pinnedDoc(id, ORIGINAL, EDITED),
    }));
    const base = Object.fromEntries(
      ["REQ-a", "REQ-b"].map((id) => [
        path(id),
        pinnedDoc(id, ORIGINAL, ORIGINAL),
      ]),
    );
    expect(STAGED_STATEMENT_DRIFT_RULE).toBe("requirement-statement-drift");
    expect(statement(files, base)).toStrictEqual(
      ["REQ-a", "REQ-b"].map((id) => ({
        rule: "requirement-statement-drift",
        entityId: id,
        source: path(id),
        message: `${id} (${path(id)}): the body's statement changed but the pinned semantic_text did not, so Kibi still models, grounds and proves the old wording. Restate semantic_text to say what the body now says and re-derive its inventory (kb_model mode analyze, CLI: kibi model, then kb_upsert the returned contract), or move the new text under a context section (## Context, ## Rationale or ## Notes) if it does not change the requirement.`,
      })),
    );
  });

  test("whitespace around and inside the pinned text and body is collapsed", () => {
    const p = path("REQ-a");
    expect(
      statement(
        [
          {
            path: p,
            content: pinnedDoc("REQ-a", `  ${ORIGINAL}  `, `   ${ORIGINAL}`),
          },
        ],
        { [p]: pinnedDoc("REQ-a", ORIGINAL.replace(" ", "   "), ORIGINAL) },
      ),
    ).toStrictEqual([]);
    expect(
      statement([{ path: p, content: pinnedDoc("REQ-a", ORIGINAL, EDITED) }], {
        [p]: pinnedDoc("REQ-a", `${ORIGINAL} x`, ORIGINAL),
      }),
    ).toStrictEqual([]);
  });

  test("pinned text compares trimmed, with whitespace runs as one space", () => {
    const p = path("REQ-a");
    expect(
      statement(
        [
          {
            path: p,
            content: pinnedDoc("REQ-a", "  Totals stay positive.  ", EDITED),
          },
        ],
        { [p]: pinnedDoc("REQ-a", "Totals stay positive.", ORIGINAL) },
      ).length,
    ).toBe(1);
    expect(
      statement(
        [
          {
            path: p,
            content: pinnedDoc("REQ-a", "Totals stay positive.", EDITED),
          },
        ],
        { [p]: pinnedDoc("REQ-a", "Totalsstay positive.", ORIGINAL) },
      ),
    ).toStrictEqual([]);
  });

  test("needs requirement documents on both sides", () => {
    const p = path("REQ-a");
    const req = (body: string) => pinnedDoc("REQ-a", ORIGINAL, body);
    const adr = (body: string) => pinnedDoc("REQ-a", ORIGINAL, body, "adr");
    expect(
      statement([{ path: p, content: adr(EDITED) }], { [p]: req(ORIGINAL) }),
    ).toStrictEqual([]);
    expect(
      statement([{ path: p, content: req(EDITED) }], { [p]: adr(ORIGINAL) }),
    ).toStrictEqual([]);
    expect(
      statement([{ path: p, content: "no front matter" }], {
        [p]: req(ORIGINAL),
      }),
    ).toStrictEqual([]);
    expect(
      statement([{ path: p, content: req(EDITED) }], {
        [p]: "no front matter",
      }),
    ).toStrictEqual([]);
    expect(
      statement([{ path: p, content: req(EDITED) }], { [p]: req(ORIGINAL) })
        .length,
    ).toBe(1);
  });
});
