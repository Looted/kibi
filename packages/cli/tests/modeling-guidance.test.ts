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

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

// implements REQ-002

const ROOT = path.resolve(import.meta.dir, "../../..");

function readDoc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

/**
 * Canonical entity-choice rule (must appear in all agent-targeted docs):
 *   - flag  = runtime/config gate
 *   - fact  = bugs, workarounds, incident notes  (observation / meta)
 *   - req   = intended behavior
 *   - test  = executable verification
 *   - adr   = durable design rationale
 *
 * All assertions here are positive (content MUST contain the wording)
 * or negative (content MUST NOT contain pseudo-type claims).
 *
 * These tests are written TDD-style and should FAIL until the documentation
 * in tasks 2–9 is updated.
 */
describe("modeling guidance: canonical entity-choice rule", () => {
  // ─── AGENTS.md ──────────────────────────────────────────────────────────────

  describe("AGENTS.md", () => {
    test("must contain the canonical rule that 'flag' is a runtime/config gate", () => {
      const content = readDoc("AGENTS.md");
      // Must explicitly characterize flag as a runtime or config gate — not just "feature flag"
      expect(content).toMatch(
        /flag\b.*runtime|flag\b.*config\s*gate|runtime.*gate.*flag|config\s*gate.*flag/i,
      );
    });

    test("must state that bugs/workarounds belong under 'fact'", () => {
      const content = readDoc("AGENTS.md");
      // Must say bug/workaround/incident notes → fact (observation or meta)
      expect(content).toMatch(
        /bug[^s].*fact|workaround.*fact|incident.*fact|fact.*bug|fact.*workaround/i,
      );
    });

    test("must state that observation and meta facts are for bug/workaround notes", () => {
      const content = readDoc("AGENTS.md");
      // Must say observation/meta for bugs or workarounds
      expect(content).toMatch(
        /observation.*bug|meta.*bug|bug.*observation|bug.*meta|observation.*workaround|workaround.*observation/i,
      );
    });

    test("must explicitly forbid creating flag for a bug/workaround without a gate", () => {
      const content = readDoc("AGENTS.md");
      // Must have a negative rule: do not use flag as bug record / no gate
      expect(content).toMatch(
        /not.*flag.*bug|flag.*not.*bug|do not.*create.*flag.*bug|flag.*without.*gate|not.*use.*flag.*workaround/i,
      );
    });

    test("must describe paired-model: flag (gate) + fact (issue) when both exist", () => {
      const content = readDoc("AGENTS.md");
      // Must mention paired modeling approach
      expect(content).toMatch(/paired|two records|flag.*fact|fact.*flag/i);
    });

    test("must not claim 'bug' is an entity type", () => {
      const content = readDoc("AGENTS.md");
      expect(content).not.toMatch(
        /type:\s*bug|entity type.*\bbug\b|\bbug\b.*entity type/i,
      );
    });

    test("must not claim 'workaround' is an entity type", () => {
      const content = readDoc("AGENTS.md");
      expect(content).not.toMatch(
        /type:\s*workaround|entity type.*workaround|workaround.*entity type/i,
      );
    });
  });

  // ─── docs/entity-schema.md ─────────────────────────────────────────────────

  describe("docs/entity-schema.md", () => {
    test("must contain an entity-choice decision table or equivalent section", () => {
      const content = readDoc("docs/entity-schema.md");
      // Must have a decision-table or entity-choice section
      expect(content).toMatch(
        /entity.choice|when to use|decision table|choose.*entity|entity selection/i,
      );
    });

    test("must characterize 'flag' as a runtime or config gate in the decision context", () => {
      const content = readDoc("docs/entity-schema.md");
      expect(content).toMatch(
        /flag\b.*runtime|flag\b.*config\s*gate|runtime.*gate/i,
      );
    });

    test("must characterize 'fact' as the home for bug/workaround notes", () => {
      const content = readDoc("docs/entity-schema.md");
      expect(content).toMatch(
        /fact.*bug|fact.*workaround|bug.*fact|workaround.*fact/i,
      );
    });

    test("must reference observation and meta fact_kinds for non-normative evidence", () => {
      const content = readDoc("docs/entity-schema.md");
      expect(content).toMatch(/observation.*meta|meta.*observation/i);
    });

    test("must not claim 'bug' is an entity type", () => {
      const content = readDoc("docs/entity-schema.md");
      expect(content).not.toMatch(
        /type:\s*bug|entity type.*\bbug\b|\bbug\b.*entity type/i,
      );
    });
  });

  // ─── docs/inference-rules.md ───────────────────────────────────────────────

  describe("docs/inference-rules.md", () => {
    test("must explain that observation/meta facts do not participate in contradiction inference", () => {
      const content = readDoc("docs/inference-rules.md");
      // already has a brief mention — test it's still there
      expect(content).toMatch(
        /observation.*meta.*not|observation.*meta.*excluded|excluded.*observation.*meta/i,
      );
    });

    test("must explain why bug/workaround notes should use observation/meta", () => {
      const content = readDoc("docs/inference-rules.md");
      // Must explicitly tie bug/workaround to observation/meta lane
      expect(content).toMatch(
        /bug.*observation|workaround.*observation|bug.*meta|workaround.*meta|observation.*bug|observation.*workaround/i,
      );
    });
  });

  // ─── bundled kibi-usage skill ───────────────────────────────────────────────

  describe("kibi-usage skill", () => {
    const usageSkill = "packages/runtime/src/skills/kibi-usage/SKILL.md";

    test("must explicitly state that flag is for runtime/config gating", () => {
      const content = readDoc(usageSkill);
      expect(content).toMatch(
        /flag\b.*runtime|flag\b.*config\s*gate|runtime.*gate.*flag/i,
      );
    });

    test("must explicitly forbid creating flag for a bug/workaround note without an actual gate", () => {
      const content = readDoc(usageSkill);
      expect(content).toMatch(
        /not.*flag.*bug|flag.*not.*bug|do not.*flag.*bug|flag.*without.*gate|wrong.*flag.*bug|incorrect.*flag.*bug|Bug-as-flag/i,
      );
    });

    test("must state that bugs/incident notes belong under observation/meta facts", () => {
      const content = readDoc(usageSkill);
      expect(content).toMatch(
        /flag[^a-z][\s\S]*observation|flag[^a-z][\s\S]*meta|observation[\s\S]*flag|meta[\s\S]*flag/i,
      );
    });
  });

  // ─── bundled kibi-bootstrap skill ────────────────────────────────────────────────

  describe("kibi-bootstrap skill", () => {
    test("must describe bootstrap preview, sequential apply, and repair-safe completion", () => {
      const content = readDoc("packages/runtime/src/skills/kibi-bootstrap/SKILL.md");
      expect(content).toContain("kb_plan_bootstrap");
      expect(content).toMatch(/preview/i);
      expect(content).toMatch(/approval/i);
      expect(content).toMatch(/sequential `kb_upsert`/);
      expect(content).toContain("committed_with_repairs");
    });
  });

  // ─── README.md ──────────────────────────────────────────────────────────────

  describe("README.md", () => {
    test("must not claim 'bug' or 'workaround' as entity types", () => {
      const content = readDoc("README.md");
      expect(content).not.toMatch(/type:\s*bug|type:\s*workaround/i);
    });
  });

  // ─── docs/mcp-reference.md ──────────────────────────────────────────────────

  describe("docs/mcp-reference.md", () => {
    test("must contain a modeling note using exact schema terms", () => {
      const content = readDoc("docs/mcp-reference.md");
      // Must have some modeling guidance using canonical terms
      expect(content).toMatch(/flag|fact|observation|meta/i);
    });

    test("must not claim 'bug' is an entity type", () => {
      const content = readDoc("docs/mcp-reference.md");
      expect(content).not.toMatch(/type:\s*bug|entity type.*\bbug\b/i);
    });
  });

  describe("docs/modeling-cheatsheet.md", () => {
    test("must teach strict and predicate modeling field names", () => {
      const content = readDoc("docs/modeling-cheatsheet.md");
      for (const term of [
        "subject_key",
        "property_key",
        "requires_property",
        "predicate_name",
        "predicate_args",
        "requires_predicate",
        "observation",
        "meta",
      ]) {
        expect(content).toContain(term);
      }
    });
  });

  // ─── docs/cli-reference.md ──────────────────────────────────────────────────

  describe("docs/cli-reference.md", () => {
    test("must mention all eight entity types", () => {
      const content = readDoc("docs/cli-reference.md");
      const requiredTypes = [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact",
      ];
      const missing = requiredTypes.filter((t) => !content.includes(t));
      expect(missing).toHaveLength(0);
    });

    test("must not claim 'bug' is an entity type", () => {
      const content = readDoc("docs/cli-reference.md");
      expect(content).not.toMatch(/type:\s*bug|entity type.*\bbug\b/i);
    });
  });
});
