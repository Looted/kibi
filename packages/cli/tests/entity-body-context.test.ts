import { describe, expect, test } from "bun:test";
import {
  assessContext,
  contextProse,
  hasContext,
  isContextExempt,
  parseBodySections,
  renderRequirementBody,
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
