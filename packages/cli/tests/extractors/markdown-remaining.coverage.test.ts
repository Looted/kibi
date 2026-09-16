// implements REQ-007
import { afterEach, describe, expect, test } from "bun:test";
import {
  FrontmatterError,
  extractFromMarkdownString,
  inferTypeFromPath,
} from "../../src/extractors/markdown.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

describe("markdown extractor leftover status, schema, and YAML branches", () => {
  test("assigns default statuses and generates an id when omitted", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const adr = extractFromMarkdownString(
      `---
title: Decision
type: adr
---
`,
      "/tmp/adr/ADR-X.md",
    );
    expect(adr.entity.status).toBe("proposed");
    expect(adr.entity.id.length).toBeGreaterThan(0);
    expect(inferTypeFromPath("/tmp/adr/ADR-X.md")).toBe("adr");
    const scenario = extractFromMarkdownString(
      `---
title: Flow
type: scenario
created_at: 2026-01-01T00:00:00.000Z
---
`,
      "/tmp/scenarios/SCEN-X.md",
    );
    expect(scenario.entity.status).toBe("draft");
    const req = extractFromMarkdownString(
      `---
id: REQ-SEM
title: Semantic
type: req
semantic_text: explicit body
---
ignored body
`,
      "/tmp/requirements/REQ-SEM.md",
    );
    expect(req.entity.semantic_text).toBe("explicit body");
  });

  test("rejects invalid proof contract, bindings, and receipt history objects", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(() =>
      extractFromMarkdownString(
        `---
id: TEST-CONTRACT
title: Bad contract
type: test
proof_contract:
  version: old
  integration: self-proof
  required_proofs: []
  success_policy: all_required_first_attempt
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
proof_bindings:
  - symbol_id: ""
    target: default
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
verification_scope: end_to_end
proof_receipts:
  - not-an-object
  - started_at: 2026-01-01T00:00:00.000Z
    finished_at: 2026-01-01T00:00:01.000Z
---
`,
        "/tmp/tests/TEST-REC.md",
      ),
    ).toThrow(/proof_receipts|receipt/);
  });

  test("classifies YAML flow-collection and unexpected-end errors", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(() =>
      extractFromMarkdownString(
        `---
title: [unclosed
type: req
---
`,
        "/tmp/requirements/flow.md",
      ),
    ).toThrow(FrontmatterError);
    expect(() =>
      extractFromMarkdownString(
        `---
title: "unterminated
type: req
`,
        "/tmp/requirements/end.md",
      ),
    ).toThrow(FrontmatterError);
    expect(() =>
      extractFromMarkdownString(
        `---
- list
---
`,
        "/tmp/requirements/list.md",
      ),
    ).toThrow(/title|type/);
    const bare = new FrontmatterError("bare", "file.md");
    expect(bare.toString()).toContain("How to fix");
    expect(bare.toString()).not.toContain("Original error");
  });

  test("parses a typed path without frontmatter as a missing-type error", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(() =>
      extractFromMarkdownString("just prose", "/tmp/requirements/plain.md"),
    ).toThrow(/title|type|frontmatter/i);
  });
});
