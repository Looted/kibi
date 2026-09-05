// implements REQ-014
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  FrontmatterError,
  detectEmbeddedEntities,
  extractFromMarkdown,
  extractFromMarkdownString,
  inferTypeFromPath,
  normalizeDateLike,
  requirementSemanticText,
} from "../../src/extractors/markdown.js";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";

describe("markdown extractor leftover branches", () => {
  test("FrontmatterError formatting and type inference", () => {
    const err = new FrontmatterError("boom", "file.md", {
      classification: "X",
      hint: "fix it",
      originalError: "raw",
    });
    expect(err.toString()).toContain("file.md");
    expect(err.toString()).toContain("Original error");
    const bare = new FrontmatterError("bare", "file.md");
    expect(bare.classification).toBe("Generic Error");
    expect(inferTypeFromPath("/x/flags/FLAG.md")).toBe("flag");
    expect(inferTypeFromPath("/x/events/EVENT.md")).toBe("event");
    expect(inferTypeFromPath("/x/facts/FACT.md")).toBe("fact");
    expect(inferTypeFromPath("/x/other/file.md")).toBeNull();
    expect(normalizeDateLike(new Date("2026-01-01T00:00:00Z"))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(normalizeDateLike("already")).toBe("already");
    expect(normalizeDateLike(12)).toBeUndefined();
    expect(requirementSemanticText("")).toBe("");
    expect(requirementSemanticText("# Title\n- item\n> quote\nBody")).toContain(
      "Body",
    );
    expect(detectEmbeddedEntities({ scenario: "x" }, "scenario")).toEqual([]);
    expect(detectEmbeddedEntities({ tests: ["a"] }, "req")).toContain("test");
    expect(detectEmbeddedEntities({ given: null }, "req")).toEqual([]);
  });

  test("extracts facts, tests, links, and error classifications", () => {
    const fact = extractFromMarkdownString(
      `---
id: FACT-DATE
title: Dated fact
type: fact
fact_kind: observation
valid_from: 2026-01-01
valid_to: 2026-12-31
value_int: 3
value_bool: true
predicate_args:
  - a
  - 1
---
`,
      "/tmp/facts/FACT-DATE.md",
    );
    expect(fact.entity.type).toBe("fact");

    const claimText = "Widgets must remain enabled.";
    const claimed = extractFromMarkdownString(
      `---
id: FACT-CLAIM-OK
title: Claimed
type: fact
fact_kind: observation
claim_text: ${claimText}
claim_key: ${semanticClaimKey(claimText)}
---
`,
      "/tmp/facts/FACT-CLAIM-OK.md",
    );
    expect(claimed.entity.claim_key).toBe(semanticClaimKey(claimText));

    expect(() =>
      extractFromMarkdownString(
        `---
id: FACT-CLAIM
title: Claimed
type: fact
fact_kind: observation
claim_text: Widgets must remain enabled.
claim_key: wrong-key
---
`,
        "/tmp/facts/FACT-CLAIM.md",
      ),
    ).toThrow(/claim_key|Entity validation failed/);

    const testEntity = extractFromMarkdownString(
      `---
id: TEST-UNIT
title: Unit test
type: test
verification_scope: unit
verification_perspective: internal
---
`,
      "/tmp/tests/TEST-UNIT.md",
    );
    expect(testEntity.entity.verification_scope).toBe("unit");

    const linked = extractFromMarkdownString(
      `---
id: REQ-LINK
title: Linked
type: req
links:
  - REQ-OTHER
  - type: specified_by
    target: SCEN-1
  - { ignored: true }
logic_claims:
  - CLAIM-AAAAAAAAAAAAAAAA
semantic_clauses:
  - must
semantic_inventory:
  - {
      claim_key: CLAIM-AAAAAAAAAAAAAAAA,
      claim_text: must,
      role: normative,
      status: modeled,
      span: { start: 0, end: 4 }
    }
  - "skip"
semantic_inventory_version: "kibi.semantic-inventory.v1"
semantic_source_field: semantic_text
semantic_source_hash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
tags: [a]
owner: team
priority: high
---

# Heading
Body text.
`,
      "/tmp/requirements/REQ-LINK.md",
    );
    expect(linked.relationships.some((rel) => rel.type === "relates_to")).toBe(
      true,
    );
    expect(linked.entity.semantic_text).toContain("Body text");

    expect(() =>
      extractFromMarkdownString(
        `---
id: REQ-BAD
title: Bad
type: req
links:
  - type: not_a_rel
    target: REQ-X
---
`,
        "/tmp/requirements/REQ-BAD.md",
      ),
    ).toThrow(FrontmatterError);

    expect(() =>
      extractFromMarkdownString(
        `---
id: REQ-DIR
title: Bad direction
type: req
links:
  - type: validates
    target: REQ-X
---
`,
        "/tmp/requirements/REQ-DIR.md",
      ),
    ).toThrow(/Invalid relationship direction/);

    expect(() =>
      extractFromMarkdownString(
        `---
title: Missing type
---
`,
        "/tmp/unknown/file.md",
      ),
    ).toThrow(/Could not determine entity type/);

    expect(() =>
      extractFromMarkdownString(
        `---
type: req
---
`,
        "/tmp/requirements/missing-title.md",
      ),
    ).toThrow(/Missing required field: title/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: REQ-EMB
title: Embedded
type: req
scenarios: [one]
---
`,
        "/tmp/requirements/REQ-EMB.md",
      ),
    ).toThrow(/embedded entity/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: REQ-FACTFIELD
title: Fact field
type: req
fact_kind: observation
---
`,
        "/tmp/requirements/REQ-FACTFIELD.md",
      ),
    ).toThrow(/Fact-only fields/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: REQ-TESTFIELD
title: Test field
type: req
verification_scope: unit
---
`,
        "/tmp/requirements/REQ-TESTFIELD.md",
      ),
    ).toThrow(/Test-only fields/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: TEST-SCOPE
title: Bad scope
type: test
verification_scope: nope
---
`,
        "/tmp/tests/TEST-SCOPE.md",
      ),
    ).toThrow(/verification_scope/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: TEST-PER
title: Bad perspective
type: test
verification_perspective: nope
---
`,
        "/tmp/tests/TEST-PER.md",
      ),
    ).toThrow(/verification_perspective/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: TEST-CONTRACT
title: Bad contract
type: test
proof_contract: []
---
`,
        "/tmp/tests/TEST-CONTRACT.md",
      ),
    ).toThrow(/proof_contract/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: TEST-BIND
title: Bad bindings
type: test
proof_bindings: {}
---
`,
        "/tmp/tests/TEST-BIND.md",
      ),
    ).toThrow(/proof_bindings/);

    expect(() =>
      extractFromMarkdownString(
        `---
id: TEST-REC
title: Bad receipts
type: test
proof_receipts: {}
---
`,
        "/tmp/tests/TEST-REC.md",
      ),
    ).toThrow(/proof_receipts/);

    expect(() =>
      extractFromMarkdownString("---\ntitle: unclosed\n", "/tmp/x.md"),
    ).toThrow(/Missing closing/);

    expect(() =>
      extractFromMarkdownString(
        `---
title: Foo: Bar
type: req
---
`,
        "/tmp/requirements/colon.md",
      ),
    ).toThrow(FrontmatterError);

    const root = mkdtempSync(path.join(tmpdir(), "kibi-md-"));
    try {
      expect(() => extractFromMarkdown(path.join(root, "missing.md"))).toThrow(
        /Failed to read file/,
      );
      const file = path.join(root, "ok.md");
      writeFileSync(
        file,
        `---
id: REQ-FILE
title: From file
type: req
---
Hello
`,
      );
      expect(extractFromMarkdown(file).entity.id).toBe("REQ-FILE");
      expect(() =>
        extractFromMarkdownString("no frontmatter here", "/tmp/plain.md"),
      ).toThrow(/Could not determine entity type/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
