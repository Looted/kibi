import { describe, expect, test } from "bun:test";

import {
  INDEX_FORMAT,
  type RetrievalEdge,
  type RetrievalEntity,
  buildRetrievalIndex,
  decisionCoverage,
  formatCardLine,
  retrieve,
} from "../src/retrieval";

const req = (
  id: string,
  title: string,
  extra: Record<string, unknown> = {},
): RetrievalEntity => ({ id, type: "req", title, status: "active", ...extra });

const symbol = (id: string, title: string, sourceFile: string) => ({
  id,
  type: "symbol",
  title,
  sourceFile,
});

const implementsEdge = (from: string, to: string): RetrievalEdge => ({
  relationship: "implements",
  from,
  to,
});

const HERE = new Set([
  "src/tags/tags.usecases.ts",
  "src/orgs/orgs.usecases.ts",
]);
const fileExists = (file: string) => HERE.has(file);

/** A product's decisions plus look-alikes from another product. */
function store() {
  const entities: RetrievalEntity[] = [
    req("REQ-tag-cap", "An organization can create at most 200 tags", {
      firmness: "firm",
      tags: ["knowledge-source:product-changelog", "component:tags"],
    }),
    req("REQ-org-cap", "A user can own at most ten organizations", {
      tags: ["knowledge-source:product-changelog"],
    }),
    req("REQ-tag-trim", "Tag names are trimmed", {
      tags: ["knowledge-source:product-changelog"],
    }),
    req("REQ-mobile-pins", "Mobile pinned tags limit is twenty", {
      tags: ["knowledge-source:mobile-decisions"],
    }),
    req("REQ-mobile-folders", "Mobile folders are sorted by name", {
      tags: ["knowledge-source:mobile-decisions"],
    }),
    req("REQ-mobile-theme", "Mobile theme follows the system", {
      tags: ["knowledge-source:mobile-decisions"],
    }),
    req("REQ-desktop-tags", "Desktop tag limit per window", {}),
    req("REQ-fresh", "Freshly recorded rule about tag colours", {}),
    {
      id: "ADR-search",
      type: "adr",
      title: "Search uses FTS5",
      decision: "Full text search runs on SQLite FTS5.",
      status: "accepted",
    },
    {
      id: "FACT-tag-cap",
      type: "fact",
      title: "Tags per organization limit",
      subject_key: "tags.per_organization_limit",
    },
    symbol("SYM-create-tag", "createTag", "src/tags/tags.usecases.ts"),
    symbol("SYM-count-orgs", "countOrganizations", "src/orgs/orgs.usecases.ts"),
    symbol("SYM-desktop", "desktopTagLimit", "apps/desktop/limit.ts"),
  ];
  const edges: RetrievalEdge[] = [
    implementsEdge("SYM-create-tag", "REQ-tag-cap"),
    implementsEdge("SYM-count-orgs", "REQ-org-cap"),
    implementsEdge("SYM-desktop", "REQ-desktop-tags"),
    { relationship: "constrains", from: "REQ-tag-cap", to: "FACT-tag-cap" },
    // Edges to entities the store does not hold add nothing.
    { relationship: "constrains", from: "REQ-tag-cap", to: "FACT-missing" },
    implementsEdge("SYM-missing", "REQ-tag-cap"),
    { relationship: "relates_to", from: "REQ-tag-cap", to: "REQ-org-cap" },
  ];
  return { entities, edges };
}

describe("buildRetrievalIndex", () => {
  test("gives every decision a scope tier and its owned evidence", () => {
    const { entities, edges } = store();
    const index = buildRetrievalIndex(entities, edges, { fileExists });
    expect(index.format).toBe(INDEX_FORMAT);
    const scope = Object.fromEntries(
      index.cards.map((card) => [card.id, card.scope]),
    );
    expect(scope).toEqual({
      "REQ-tag-cap": "in",
      "REQ-org-cap": "in",
      // Not linked itself, but its source's decisions are linked here.
      "REQ-tag-trim": "in",
      // A source of three decisions with none linked here.
      "REQ-mobile-pins": "distant",
      "REQ-mobile-folders": "distant",
      "REQ-mobile-theme": "distant",
      // Linked only to a file that is not here.
      "REQ-desktop-tags": "other",
      "REQ-fresh": "unscoped",
      "ADR-search": "unscoped",
    });
    const tagCap = index.cards.find((card) => card.id === "REQ-tag-cap");
    expect(tagCap).toMatchObject({
      firm: true,
      files: ["src/tags/tags.usecases.ts"],
      symbols: ["createTag"],
      scopeReason: "linked to code here",
    });
    expect(
      index.cards.find((card) => card.id === "REQ-tag-trim")?.scopeReason,
    ).toBe(
      "from knowledge-source:product-changelog, whose decisions are linked here",
    );
    // A fact's words count for the decision that links it.
    expect(index.postings.per?.some(([card]) => card === 0)).toBe(true);
    // Bookkeeping tags are not words of the decision.
    expect(index.postings.changelog).toBeUndefined();
    expect(index.postings.component).toBeDefined();
    expect(index.cards.find((card) => card.type === "adr")?.statement).toBe("");
  });

  test("without any link here, no source counts as distant", () => {
    const entities = [
      req("REQ-a", "Alpha", { tags: ["knowledge-source:s"] }),
      req("REQ-b", "Beta", { tags: ["knowledge-source:s"] }),
      req("REQ-c", "Gamma", { tags: ["knowledge-source:s"] }),
    ];
    const index = buildRetrievalIndex(entities, []);
    expect(index.cards.map((card) => card.scope)).toEqual([
      "unscoped",
      "unscoped",
      "unscoped",
    ]);
  });

  test("every file exists unless the caller says otherwise", () => {
    const { entities, edges } = store();
    const index = buildRetrievalIndex(entities, edges);
    expect(
      index.cards.find((card) => card.id === "REQ-desktop-tags")?.scope,
    ).toBe("in");
  });

  test("reads statements, odd field shapes and an empty store", () => {
    const long = "x".repeat(500);
    const index = buildRetrievalIndex(
      [
        {
          id: "REQ-body",
          type: "req",
          body: "# Heading\nThe rule body.",
          tags: "solo",
        },
        {
          id: "REQ-long",
          type: "req",
          title: ["Array", "title", 3],
          semantic_text: long,
        },
      ],
      [],
    );
    const [body, longCard] = index.cards;
    expect(body?.title).toBe("REQ-body");
    expect(body?.statement).toBe("The rule body.");
    expect(longCard?.title).toBe("Array title");
    expect(longCard?.statement.length).toBe(240);
    expect(longCard?.statement.endsWith("…")).toBe(true);
    expect(buildRetrievalIndex([], []).averageLength).toBe(0);
  });
});

describe("retrieve", () => {
  const { entities, edges } = store();
  const index = buildRetrievalIndex(entities, edges, { fileExists });

  test("ranks in-scope decisions first and counts other scopes", () => {
    const result = retrieve(index, { text: "how many tags can a team have?" });
    expect(result.cards[0]?.id).toBe("REQ-tag-cap");
    expect(result.cards[0]?.evidence).toContain("linked to code here");
    expect(result.ranking).not.toContain("REQ-desktop-tags");
    expect(result.otherScopes).toEqual({ count: 1, ids: ["REQ-desktop-tags"] });
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.cards.length).toBeLessThanOrEqual(5);
  });

  test("demotes distant decisions without hiding them", () => {
    const result = retrieve(index, { text: "mobile pinned tags limit twenty" });
    expect(result.ranking).toContain("REQ-mobile-pins");
    const pins = result.cards.find((card) => card.id === "REQ-mobile-pins");
    expect(pins?.scope).toBe("distant");
  });

  test("names the question words no card covers", () => {
    const result = retrieve(index, { text: "tags quokka", limit: 1 });
    expect(result.uncoveredTerms).toEqual(["quokka"]);
    const none = retrieve(index, { text: "zzz" });
    expect(none.cards).toEqual([]);
    expect(none.coverage).toBe(0);
    expect(none.uncoveredTerms).toEqual(["zzz"]);
    expect(retrieve(index, {}).coverage).toBe(0);
  });

  test("fuses a vector ranking and keeps other scopes out of it", () => {
    const vectorScores = index.cards.map((card) =>
      card.id === "REQ-fresh" ? 0.9 : card.id === "REQ-desktop-tags" ? 0.95 : 0,
    );
    const result = retrieve(index, { text: "colours", vectorScores });
    expect(result.cards[0]?.id).toBe("REQ-fresh");
    expect(result.ranking).not.toContain("REQ-desktop-tags");
    // Unscoped decisions say nothing about scope in their evidence.
    expect(result.cards[0]?.evidence).toEqual([]);
  });

  test("a lighter vector ranking moves cards less than the words", () => {
    const vectorScores = index.cards.map((card) =>
      card.id === "REQ-tag-trim" ? 0.9 : 0,
    );
    const text = "organization";
    const full = retrieve(index, { text, vectorScores });
    const light = retrieve(index, { text, vectorScores, vectorWeight: 0.1 });
    const score = (result: typeof full) =>
      result.cards.find((card) => card.id === "REQ-tag-trim")?.score ?? 0;
    expect(score(full)).toBeGreaterThan(0);
    expect(score(light)).toBeCloseTo(score(full) * 0.1);
  });

  test("a type filter keeps only decisions of that type, counted scopes too", () => {
    const adrs = retrieve(index, {
      text: "full text search tags",
      types: ["adr"],
    });
    expect(adrs.cards.map((card) => card.id)).toEqual(["ADR-search"]);
    expect(adrs.otherScopes.count).toBe(0);
    const reqs = retrieve(index, { text: "desktop tag limit", types: ["req"] });
    expect(reqs.cards.every((card) => card.type === "req")).toBe(true);
    expect(reqs.otherScopes.ids).toContain("REQ-desktop-tags");
  });

  test("an edit finds the owners of the symbol it names in the edited file", () => {
    const result = retrieve(index, {
      edits: [
        {
          path: "src/tags/tags.usecases.ts",
          old: "if (count >= 200) throw createTagLimitError();",
          new: "if (count >= 300) throw createTagLimitError();",
        },
      ],
      request: "let teams have more labels",
    });
    // createTag is a prefix of createTagLimitError, which the edit names.
    expect(result.cards[0]?.id).toBe("REQ-tag-cap");
    expect(result.cards[0]?.evidence).toEqual(
      expect.arrayContaining([
        "linked to src/tags/tags.usecases.ts",
        "owns createTag",
      ]),
    );
  });

  test("files near the ones in play lift their decisions", () => {
    const result = retrieve(index, {
      text: "organizations",
      paths: ["src/orgs/other.ts"],
      symbols: ["countOrganizations"],
    });
    const orgCap = result.cards.find((card) => card.id === "REQ-org-cap");
    expect(orgCap?.evidence).toContain("linked near the files in play");
    expect(orgCap?.evidence).not.toContain("owns countOrganizations");
  });

  test("the best match on words keeps a place near the top", () => {
    const many: RetrievalEntity[] = [
      req("REQ-rule", "Quota rule for exports", {
        semantic_text: "quota exports",
      }),
    ];
    const links: RetrievalEdge[] = [];
    for (let i = 0; i < 4; i += 1) {
      many.push(req(`REQ-linked-${i}`, `Linked rule ${i} about quota`));
      many.push(symbol(`SYM-${i}`, `fn${i}`, "src/a.ts"));
      links.push(implementsEdge(`SYM-${i}`, `REQ-linked-${i}`));
    }
    const small = buildRetrievalIndex(many, links);
    const result = retrieve(small, {
      text: "quota exports",
      paths: ["src/a.ts"],
      symbols: ["fn0", "fn1", "fn2", "fn3"],
    });
    expect(result.ranking.indexOf("REQ-rule")).toBe(1);
    expect(result.cards[1]?.evidence).toContain("best match on its words");
  });

  test("statuses demote and replaced decisions fold into the current one", () => {
    const chain = buildRetrievalIndex(
      [
        req("REQ-v1", "Upload size limit is 10 MB"),
        req("REQ-v2", "Upload size limit is 25 MB", { status: "superseded" }),
        req("REQ-v3", "Upload size limit is 50 MB"),
        req("REQ-closed", "Upload size limit closed rule", {
          status: "closed",
        }),
        req("REQ-alone", "Upload size limit replaced", {}),
      ],
      [
        { relationship: "supersedes", from: "REQ-v2", to: "REQ-v1" },
        { relationship: "supersedes", from: "REQ-v3", to: "REQ-v2" },
        { relationship: "supersedes", from: "REQ-gone", to: "REQ-alone" },
      ],
    );
    const result = retrieve(chain, { text: "upload size limit" });
    expect(result.ranking).not.toContain("REQ-v1");
    expect(result.ranking).not.toContain("REQ-v2");
    const head = result.cards.find((card) => card.id === "REQ-v3");
    expect(head?.folded).toEqual(expect.arrayContaining(["REQ-v1", "REQ-v2"]));
    expect(
      result.cards.find((card) => card.id === "REQ-closed")?.evidence,
    ).toContain("closed");
    // A successor that is not in the answer leaves the replaced one shown.
    expect(
      result.cards.find((card) => card.id === "REQ-alone")?.evidence,
    ).toContain("superseded");
  });

  test("near-identical titles fold unless firm or of opposite polarity", () => {
    const twins = buildRetrievalIndex(
      [
        req("REQ-a", "Saved views maximum count is twenty"),
        req("REQ-b", "Saved views maximum count is twenty!"),
        req("REQ-c", "Saved views maximum count is twenty", {
          firmness: "firm",
        }),
        req("REQ-d", "Saved views maximum count is not twenty"),
        req("REQ-e", "Saved views maximum count is not twenty!"),
        req("REQ-f", "Saved views maximum count isn't twenty"),
      ],
      [],
    );
    const result = retrieve(twins, {
      text: "saved views maximum count twenty",
    });
    const shown = result.cards.map((card) => card.id);
    expect(shown).toContain("REQ-c");
    expect(shown).toContain("REQ-d");
    const folds = result.cards.flatMap((card) => card.folded);
    expect(folds).toContain("REQ-b");
    expect(folds).toContain("REQ-e");
  });

  test("a replaced decision follows its successor into a fold", () => {
    const folded = buildRetrievalIndex(
      [
        req("REQ-old", "Webhook names are limited to 64 characters", {
          status: "deprecated",
        }),
        req("REQ-new", "Webhook names limited to 128 characters"),
        req("REQ-twin", "Webhook names limited to 128 characters!"),
      ],
      [{ relationship: "supersedes", from: "REQ-twin", to: "REQ-old" }],
    );
    const result = retrieve(folded, {
      text: "webhook names limited characters",
    });
    const card = result.cards.find((entry) =>
      entry.folded.includes("REQ-twin"),
    );
    expect(card?.folded).toContain("REQ-old");
  });
});

test("ties on score order by id", () => {
  const ties = buildRetrievalIndex(
    [
      req("REQ-qb", "Export quota", { firmness: "firm" }),
      req("REQ-qa", "Export quota", { firmness: "firm" }),
      req("REQ-qc", "Export quota", { firmness: "firm" }),
    ],
    [],
  );
  // The vector ranking reverses the word ranking, so the fused scores tie.
  const reversed = retrieve(ties, {
    text: "export quota",
    vectorScores: [0.9, 0.1, 0.5],
  });
  expect(reversed.ranking).toEqual(["REQ-qb", "REQ-qa", "REQ-qc"]);
  // Equal word scores keep the store's order.
  expect(retrieve(ties, { text: "export quota" }).ranking).toEqual([
    "REQ-qb",
    "REQ-qa",
    "REQ-qc",
  ]);
});

describe("formatCardLine", () => {
  const base = {
    id: "REQ-x",
    type: "req" as const,
    title: "Tags are capped",
    statement: "An organization can create at most 200 tags.",
    status: "active",
    firm: true,
    scope: "in" as const,
    score: 1,
    coverage: 1,
    evidence: ["linked to code here"],
    folded: ["REQ-y"],
  };

  test("one line with firmness, statement, evidence and folds", () => {
    expect(formatCardLine(base)).toBe(
      "REQ-x [firm]: Tags are capped — An organization can create at most 200 tags. (linked to code here) +1 similar",
    );
  });

  test("leaves out a statement the title already says, and cuts long lines", () => {
    expect(
      formatCardLine({
        ...base,
        firm: false,
        statement: "Tags are capped",
        evidence: [],
        folded: [],
      }),
    ).toBe("REQ-x: Tags are capped");
    const long = formatCardLine({ ...base, statement: "y".repeat(400) });
    expect(long.length).toBe(300);
    expect(long).toContain("…");
    expect(long).toContain("(linked to code here) +1 similar");
  });

  test("marks non-current statuses beside id and preserves prohibition clauses on cut", () => {
    const retired = formatCardLine({
      ...base,
      firm: false,
      status: "retired",
      statement: "x".repeat(350),
    });
    expect(retired.startsWith("REQ-x [retired]: Tags are capped")).toBe(true);
    expect(retired.length).toBeLessThanOrEqual(300);
    const closed = formatCardLine({
      ...base,
      firm: false,
      status: "closed",
      evidence: ["linked to code here", "closed"],
    });
    expect(closed.startsWith("REQ-x [closed]: ")).toBe(true);
    const prohibited = formatCardLine({
      ...base,
      firm: false,
      statement:
        "A bulk export of customer records may be started by any support agent from the admin console while other work continues in the background across the active queue, but must never include payment card numbers or leave the company network.",
    });
    expect(prohibited.length).toBeLessThanOrEqual(300);
    expect(prohibited).toContain("must never include payment card numbers");
  });

  test("statementOf skips rationale sections and retrieve reports best card coverage", () => {
    const idx = buildRetrievalIndex(
      [
        {
          id: "REQ-rationale-only",
          type: "req",
          title: "Retired status policy",
          body: "# Context\n\nAudit logging was retired under this rule.\n\n# Statement\n\nA retired requirement stays on record without blocking.\n",
          status: "open",
        },
        {
          id: "REQ-actual-audit",
          type: "req",
          title: "Audit logging records mutations",
          semantic_text: "Audit logging must record every mutation.",
          status: "open",
        },
      ],
      [],
    );
    expect(idx.cards[0]?.statement).toContain(
      "A retired requirement stays on record",
    );
    expect(idx.cards[0]?.statement).not.toContain("Audit logging was retired");
    const result = retrieve(idx, {
      text: "audit logging mutations",
      vectorScores: [0.99, 0.01],
      vectorWeight: 10,
    });
    expect(result.coverage).toBe(1);
  });
});

describe("decision coverage", () => {
  const index = buildRetrievalIndex(
    [
      req("REQ-a", "Invoice export writes a CSV"),
      req("REQ-b", "Refunds reach the card"),
    ],
    [],
  );

  test("is the share of the question's weight a decision's words hold", () => {
    expect(decisionCoverage(index, "invoice export csv", "REQ-a")).toBe(1);
    const part = decisionCoverage(index, "invoice refunds", "REQ-a");
    expect(part).toBeGreaterThan(0);
    expect(part).toBeLessThan(1);
    expect(decisionCoverage(index, "invoice export csv", "REQ-b")).toBe(0);
  });

  test("is 0 for an unknown decision or a question without signal words", () => {
    expect(decisionCoverage(index, "invoice", "REQ-missing")).toBe(0);
    expect(decisionCoverage(index, "the of and", "REQ-a")).toBe(0);
  });
});
