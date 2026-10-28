import { describe, expect, test } from "bun:test";
import {
  CONTEXT_HEADING_WORDS,
  CONTEXT_MISSING_HINT,
  CONTEXT_MISSING_TAG,
  CONTEXT_REQUIRED_TYPES,
  MIN_CONTEXT_WORDS,
  RESERVED_TAG_HINT,
  RESTATEMENT_JACCARD,
  assessContext,
  bodySnippetLine,
  contextFinding,
  contextProse,
  contextSectionText,
  hasContext,
  isContextAcknowledged,
  isContextExempt,
  isContextHeading,
  missingContextDescription,
  parseBodySections,
  renderRequirementBody,
  reviseRequirementBody,
  tokenSetJaccard,
  withoutContextSections,
} from "../src/entity-body-context";
import {
  extractFromMarkdownString,
  legacyRequirementSemanticText,
  requirementSemanticText,
} from "../src/extractors/markdown";

const LONG_REASON =
  "The compliance team asked for this after an audit found that exports were retained indefinitely across all regions.";

describe("entity body sections", () => {
  test("splits a body by headings and flags context sections", () => {
    const sections = parseBodySections(
      "Statement line.\n\n## Context\n\nWhy.\n\n### Constraint\n\nDeeper.\n\n## Other\n\nPlain.\n",
    );
    expect(
      sections.map((section) => [section.heading, section.isContext]),
    ).toEqual([
      ["", false],
      ["Context", true],
      ["Constraint", true],
      ["Other", false],
    ]);
  });

  test("recognizes every context heading word case-insensitively", () => {
    for (const word of [
      "Context",
      "RATIONALE",
      "why we need it",
      "Background",
      "Source",
      "notes",
      "Evidence",
    ]) {
      expect(parseBodySections(`# ${word}\n\ntext`)[0]?.isContext).toBe(true);
    }
    expect(parseBodySections("# Whyte paper\n\ntext")[0]?.isContext).toBe(
      false,
    );
  });

  test("requirements count only text under context headings", () => {
    const body = `Users must sign in.\n\n## Context\n\n${LONG_REASON}\n`;
    expect(contextProse("req", body)).toBe(LONG_REASON);
    expect(contextProse("req", "Users must sign in.\n")).toBe("");
  });

  test("other types count all non-heading prose", () => {
    const body = `# Heading\n\n${LONG_REASON}\n`;
    expect(contextProse("scenario", body)).toBe(LONG_REASON);
    expect(contextProse("test", body)).toBe(LONG_REASON);
  });

  test("requires twelve words that do not restate the title", () => {
    const entity = {
      title: "Exports are retained for thirty days",
      semantic_text: "Exports must be retained for thirty days.",
    };
    expect(
      assessContext(
        "req",
        `Statement.\n\n## Context\n\n${LONG_REASON}\n`,
        entity,
      ).ok,
    ).toBe(true);
    expect(assessContext("req", "Statement.\n", entity).reason).toBe("none");
    expect(
      assessContext("req", "Statement.\n\n## Context\n\nToo short.\n", entity)
        .reason,
    ).toBe("too_short");
    const restated =
      "Exports must be retained for thirty days. Exports must be retained for thirty days.";
    expect(
      assessContext("req", `Statement.\n\n## Context\n\n${restated}\n`, entity)
        .reason,
    ).toBe("restatement");
    expect(hasContext("scenario", restated, { title: restated })).toBe(false);
  });

  test("filler of the right length does not pass without novelty", () => {
    const filler = "retained exports retained exports ".repeat(5);
    expect(hasContext("test", filler, { title: "Retained exports" })).toBe(
      false,
    );
  });

  test("exempts symbols, flags, events and strict-lane facts", () => {
    expect(isContextExempt("symbol", {})).toBe(true);
    expect(isContextExempt("flag", {})).toBe(true);
    expect(isContextExempt("event", {})).toBe(true);
    expect(isContextExempt("fact", { fact_kind: "subject" })).toBe(true);
    expect(isContextExempt("fact", { fact_kind: "predicate" })).toBe(true);
    expect(isContextExempt("fact", { fact_kind: "observation" })).toBe(false);
    expect(isContextExempt("fact", { fact_kind: "meta" })).toBe(false);
    expect(isContextExempt("req", {})).toBe(false);
    expect(isContextExempt("adr", {})).toBe(false);
    expect(assessContext("symbol", "", {}).ok).toBe(true);
  });

  test("tokenSetJaccard ignores case and punctuation", () => {
    expect(tokenSetJaccard("Hello, World!", "world hello")).toBe(1);
    expect(tokenSetJaccard("a b", "c d")).toBe(0);
    expect(tokenSetJaccard("", "")).toBe(0);
  });

  test("renders a sectioned requirement body", () => {
    expect(
      renderRequirementBody({
        statement: " Users must sign in. ",
        context: "Because security asked.",
        source: {
          excerpt: "line one\nline two",
          title: "Ticket",
          reference: "JIRA-1",
        },
      }),
    ).toBe(
      "Users must sign in.\n\n## Context\n\nBecause security asked.\n\n## Source\n\n> line one\n> line two\n\nSource: Ticket - JIRA-1\n",
    );
    expect(renderRequirementBody({ statement: "Only statement." })).toBe(
      "Only statement.\n",
    );
  });
});

describe("reviseRequirementBody", () => {
  const existing =
    "Old statement.\n\nExtra non-context note.\n\n## Context\n\nWhy it exists.\n\n### Constraint\n\nKeep nested text.\n\n## Source\n\n> quoted\n\nSource: T-1\n\n## Out of scope\n\nNot context.\n";

  test("replaces the non-context part and keeps context sections byte for byte", () => {
    expect(
      reviseRequirementBody({ existingBody: existing, statement: "New." }),
    ).toBe(
      "New.\n\n## Context\n\nWhy it exists.\n\n### Constraint\n\nKeep nested text.\n\n## Source\n\n> quoted\n\nSource: T-1\n",
    );
  });

  test("supplied context or source replaces just that section", () => {
    const revised = reviseRequirementBody({
      existingBody: existing,
      statement: "New.",
      context: "Fresh reason.",
    });
    expect(revised).toBe(
      "New.\n\n## Context\n\nFresh reason.\n\n## Source\n\n> quoted\n\nSource: T-1\n",
    );
    expect(
      reviseRequirementBody({
        existingBody: existing,
        statement: "New.",
        source: { excerpt: "fresh quote", reference: "T-2" },
      }),
    ).toBe(
      "New.\n\n## Context\n\nWhy it exists.\n\n### Constraint\n\nKeep nested text.\n\n## Source\n\n> fresh quote\n\nSource: T-2\n",
    );
  });

  test("appends a section the body did not have", () => {
    expect(
      reviseRequirementBody({
        existingBody: "Only statement.\n",
        statement: "New.",
        context: "Reason.",
      }),
    ).toBe("New.\n\n## Context\n\nReason.\n");
  });
});

describe("requirement semantic text excludes context", () => {
  const body = `Users must sign in.\n\n## Context\n\n${LONG_REASON}\n\n## Source\n\n> quoted\n`;

  test("derives the meaning from the statement only", () => {
    expect(requirementSemanticText(body)).toBe("Users must sign in.");
    expect(withoutContextSections(body)).not.toContain("compliance");
  });

  test("the legacy derivation still includes context for schema 8 pinning", () => {
    const legacy = legacyRequirementSemanticText(body);
    expect(legacy).toContain("Users must sign in.");
    expect(legacy).toContain("compliance team");
  });

  test("bodies without context sections derive exactly as before", () => {
    const plain = "# Title\n\n- Users must sign in.\n\n## Detail\n\n> More.\n";
    expect(requirementSemanticText(plain)).toBe(
      legacyRequirementSemanticText(plain),
    );
  });

  test("the extractor keeps explicit semantic_text and derives the rest", () => {
    const explicit = extractFromMarkdownString(
      `---\nid: REQ-a\ntitle: A\ntype: req\nsemantic_text: Pinned meaning.\n---\n\n${body}`,
      "/tmp/requirements/REQ-a.md",
    );
    expect(explicit.entity.semantic_text).toBe("Pinned meaning.");
    const derived = extractFromMarkdownString(
      `---\nid: REQ-b\ntitle: B\ntype: req\n---\n\n${body}`,
      "/tmp/requirements/REQ-b.md",
    );
    expect(derived.entity.semantic_text).toBe("Users must sign in.");
  });
});

describe("body context contracts", () => {
  const twelve =
    "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";

  test("vocabulary, thresholds and hints are stable", () => {
    expect(CONTEXT_HEADING_WORDS).toEqual([
      "context",
      "rationale",
      "why",
      "background",
      "source",
      "notes",
      "evidence",
    ]);
    expect(MIN_CONTEXT_WORDS).toBe(12);
    expect(RESTATEMENT_JACCARD).toBe(0.8);
    expect(CONTEXT_MISSING_TAG).toBe("review:context-missing");
    expect(CONTEXT_REQUIRED_TYPES).toEqual([
      "req",
      "scenario",
      "test",
      "adr",
      "fact",
    ]);
    expect(CONTEXT_MISSING_HINT).toBe(
      "Add a '## Context' section (requirements) or a prose body (scenarios, tests, ADRs, observation facts) stating why this exists, who asked, the source and anything that does not fit the front matter. Never invent a reason the requester did not give: write who asked, the source and 'Reason not stated' in the Context section instead.",
    );
    expect(RESERVED_TAG_HINT).toBe(
      "review:context-missing is reserved for entities acknowledged by the schema 8 migration; add context instead: write who asked, the source and 'Reason not stated' in the Context section, and remove the tag.",
    );
  });

  test("context headings may carry leading blanks and emphasis", () => {
    for (const heading of ["  Context", "**Rationale**", "_`Notes`_"])
      expect(isContextHeading(heading)).toBe(true);
    for (const heading of ["", "Out of scope", "Contextual", "My notes"])
      expect(isContextHeading(heading)).toBe(false);
  });

  test("heading lines need a line-start run of at most six hashes", () => {
    expect(
      parseBodySections(
        "Tag ## Context here\n####### Notes\n    ## Notes\n   ## Real ##\n## C#\n## Notes   ##\n##\nend",
      ).map((section) => [section.level, section.heading, section.text]),
    ).toEqual([
      [0, "", "Tag ## Context here\n####### Notes\n    ## Notes"],
      [2, "Real", ""],
      [2, "C#", ""],
      [2, "Notes", ""],
      [2, "", "end"],
    ]);
  });

  test("heading text drops leading blanks but keeps inner hashes", () => {
    expect(
      parseBodySections("##   Real\n## A ## b\n").map(
        (section) => section.heading,
      ),
    ).toEqual(["Real", "A ## b"]);
  });

  test("CR and CRLF line endings split lines", () => {
    for (const newline of ["\r\n", "\r"])
      expect(
        withoutContextSections(
          ["Keep.", "## Context", "Drop.", "## Other", "Keep too."].join(
            newline,
          ),
        ),
      ).toBe("Keep.\n## Other\nKeep too.");
  });

  test("a nested context heading does not move where the context ends", () => {
    expect(
      parseBodySections(
        "## Context\n\na\n\n### Notes\n\nb\n\n### Other\n\nc\n\n## Plain\n\nd\n",
      ).map((section) => [section.heading, section.isContext]),
    ).toEqual([
      ["Context", true],
      ["Notes", true],
      ["Other", true],
      ["Plain", false],
    ]);
  });

  test("empty heading sections are kept and section text keeps its lines", () => {
    expect(
      parseBodySections("## Empty\n## Next\nline one\nline two\n"),
    ).toEqual([
      { level: 2, heading: "Empty", text: "", isContext: false },
      {
        level: 2,
        heading: "Next",
        text: "line one\nline two",
        isContext: false,
      },
    ]);
  });

  test("context text joins non-empty context sections", () => {
    expect(
      contextSectionText(
        "Statement.\n\n## Context\n\n## Notes\n\nfirst\n\n## Other\n\nskip\n\n## Why\n\nsecond\n",
      ),
    ).toBe("first\n\nsecond");
    expect(contextProse("adr", "## A\n\none\n\n## B\n\n## C\n\ntwo\n")).toBe(
      "one\ntwo",
    );
  });

  test("Jaccard compares lowercased token sets", () => {
    expect(tokenSetJaccard("straße", "STRASSE")).toBe(0);
    expect(tokenSetJaccard("a, b", "b")).toBe(0.5);
    expect(tokenSetJaccard("", "a")).toBe(0);
    expect(tokenSetJaccard("a", "")).toBe(0);
  });

  test("twelve words is enough, eleven is too short, none is none", () => {
    expect(assessContext("scenario", twelve, {})).toEqual({
      ok: true,
      words: 12,
    });
    expect(assessContext("scenario", twelve.replace(" mu", ""), {})).toEqual({
      ok: false,
      reason: "too_short",
      words: 11,
    });
    expect(assessContext("scenario", "## Only a heading\n", {})).toEqual({
      ok: false,
      reason: "none",
      words: 0,
    });
  });

  test("a restatement is a Jaccard of at least 0.8 against a string reference", () => {
    const fifteen = `${twelve} nu xi omicron`;
    const titleOfTwelve = twelve;
    expect(tokenSetJaccard(fifteen, titleOfTwelve)).toBe(0.8);
    expect(
      assessContext("scenario", fifteen, { title: titleOfTwelve }).reason,
    ).toBe("restatement");
    expect(assessContext("scenario", twelve, { title: 42 }).ok).toBe(true);
    expect(
      assessContext("scenario", twelve, { semantic_text: twelve }).ok,
    ).toBe(true);
    expect(
      assessContext("req", `S.\n\n## Context\n\n${twelve}\n`, {
        semantic_text: twelve,
      }).reason,
    ).toBe("restatement");
    expect(
      assessContext("req", `S.\n\n## Context\n\n${twelve}\n`, {
        semantic_text: 5,
      }).ok,
    ).toBe(true);
  });

  test("findings name the type, id and what is missing", () => {
    const labels: Array<[string, string]> = [
      ["req", "requirement"],
      ["scenario", "scenario"],
      ["test", "test"],
      ["adr", "ADR"],
    ];
    for (const [type, label] of labels)
      expect(contextFinding(type, "X-1", "", {})?.description).toStartWith(
        `${label} X-1 has no body context: `,
      );
    expect(
      contextFinding("fact", "F-1", "", { fact_kind: "observation" }),
    ).toEqual({
      type: "fact",
      id: "F-1",
      reason: "none",
      words: 0,
      description:
        "observation fact F-1 has no body context: body prose that states why this exists is missing",
      suggestion: CONTEXT_MISSING_HINT,
    });
    expect(contextFinding("adr", "A-1", twelve, {})).toBeNull();
    expect(contextFinding("adr", "A-1", "", {}, true)).toBeNull();
    expect(contextFinding("symbol", "S-1", "", {})).toBeNull();
  });

  test("descriptions say where context goes and what is wrong", () => {
    expect(contextFinding("adr", "A-2", "short", {})?.description).toBe(
      "ADR A-2 has no body context: body prose that states why this exists is shorter than 12 words",
    );
    expect(missingContextDescription("req", "restatement")).toBe(
      "a '## Context' (or Rationale, Why, Background, Source, Notes, Evidence) section that states why this exists only restates the title or statement",
    );
    expect(missingContextDescription("adr", "none")).toBe(
      "body prose that states why this exists is missing",
    );
    expect(missingContextDescription("adr", undefined)).toBe(
      "body prose that states why this exists is missing",
    );
  });

  test("only a tag list holding the reserved tag acknowledges missing context", () => {
    expect(isContextAcknowledged(["x", "review:context-missing"])).toBe(true);
    expect(isContextAcknowledged(["x"])).toBe(false);
    expect(isContextAcknowledged("review:context-missing")).toBe(false);
    expect(isContextAcknowledged(undefined)).toBe(false);
  });

  test("the snippet line prefers context prose over the body", () => {
    expect(
      bodySnippetLine(
        "req",
        "  Statement line.  \n\n## Context\n\n  why first  \nwhy second\n",
      ),
    ).toBe("why first");
    expect(bodySnippetLine("req", "\n   \n  Statement line.  \r\nmore\n")).toBe(
      "Statement line.",
    );
    expect(bodySnippetLine("req", "")).toBeUndefined();
  });
});

describe("requirement body rendering contracts", () => {
  test("blank context and source parts are left out and the rest is trimmed", () => {
    expect(
      renderRequirementBody({
        statement: "S.",
        context: "   ",
        source: { excerpt: "  ", title: "  ", reference: " R-1 " },
      }),
    ).toBe("S.\n\n## Source\n\nSource: R-1\n");
    expect(
      renderRequirementBody({
        statement: "S.",
        context: "  padded  ",
        source: { title: " T " },
      }),
    ).toBe("S.\n\n## Context\n\npadded\n\n## Source\n\nSource: T\n");
    expect(
      renderRequirementBody({ statement: "S.", source: { reference: "R" } }),
    ).toBe("S.\n\n## Source\n\nSource: R\n");
    expect(renderRequirementBody({ statement: "S.", source: {} })).toBe("S.\n");
  });

  test("an excerpt becomes a blockquote with bare markers on blank lines", () => {
    expect(
      renderRequirementBody({
        statement: "S.",
        source: { excerpt: " one\r\n\r\n   \rtwo " },
      }),
    ).toBe("S.\n\n## Source\n\n> one\n>\n>\n> two\n");
  });
});

describe("reviseRequirementBody contracts", () => {
  test("a supplied context replaces nested context headings with it", () => {
    expect(
      reviseRequirementBody({
        existingBody:
          "Old.\n\n## Context\n\nold reason\n\n### Notes\n\nold note\n",
        statement: "  New.  ",
        context: " Fresh. ",
      }),
    ).toBe("New.\n\n## Context\n\nFresh.\n");
  });

  test("blocks are keyed by their first heading word, emphasis aside", () => {
    expect(
      reviseRequirementBody({
        existingBody:
          "Old.\n\n## **Source** notes\n\n> old\n\n## Context-specific\n\nkeep\n",
        statement: "New.",
        source: { reference: "R-2" },
      }),
    ).toBe("New.\n\n## Source\n\nSource: R-2\n\n## Context-specific\n\nkeep\n");
  });

  test("emphasis after the first heading word does not change the key", () => {
    expect(
      reviseRequirementBody({
        existingBody: "Old.\n\n## Context *old*\n\nold reason\n",
        statement: "New.",
        context: "Fresh.",
      }),
    ).toBe("New.\n\n## Context\n\nFresh.\n");
  });

  test("a repeated section is replaced once and trailing blank lines are dropped", () => {
    expect(
      reviseRequirementBody({
        existingBody:
          "Old.\n\n## Context\n\nfirst\n\n## Notes\n\nkept\n\n\n\n## Context\n\nsecond\n\n## Plain\n",
        statement: "New.",
        context: "Fresh.",
      }),
    ).toBe("New.\n\n## Context\n\nFresh.\n\n## Notes\n\nkept\n");
  });
});
