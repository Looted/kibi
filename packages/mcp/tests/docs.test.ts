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
import { DOC_RESOURCES, PROMPTS } from "../src/server/docs.js";

// implements REQ-002, REQ-013

/**
 * Regression tests for MCP runtime self-documentation.
 *
 * These tests lock the canonical entity-choice wording in the MCP server's
 * built-in prompts and resources.  They are written TDD-style and should
 * FAIL until `packages/mcp/src/server/docs.ts` is updated in task 7.
 *
 * Canonical terse modeling sentence (target form, exact wording may vary
 * slightly after editing, but the key terms must be present):
 *   "Modeling: flags gate runtime/config behavior; normative rules use facts;
 *    bug and workaround notes use observation/meta facts."
 */
describe("MCP runtime docs: canonical modeling wording", () => {
  // ─── Helpers ────────────────────────────────────────────────────────────────

  function findPrompt(name: string) {
    const p = PROMPTS.find((p) => p.name === name);
    if (!p) throw new Error(`Prompt '${name}' not found in PROMPTS`);
    return p;
  }

  function findResource(uri: string) {
    const r = DOC_RESOURCES.find((r) => r.uri === uri);
    if (!r) throw new Error(`Resource '${uri}' not found in DOC_RESOURCES`);
    return r;
  }

  // ─── PROMPTS ────────────────────────────────────────────────────────────────

  describe("kibi_overview prompt", () => {
    test("must contain the terse modeling sentence mentioning 'flags gate'", () => {
      const prompt = findPrompt("kibi_overview");
      // Must say flags gate runtime/config behavior (or equivalent)
      expect(prompt.text).toMatch(
        /flags?\s+gate|flags?\s+runtime|flags?\s+config/i,
      );
    });

    test("must state that bug/workaround notes use observation or meta facts", () => {
      const prompt = findPrompt("kibi_overview");
      expect(prompt.text).toMatch(
        /bug.*observation|bug.*meta|workaround.*observation|workaround.*meta|observation.*bug|meta.*bug/i,
      );
    });

    test("must use exact schema terms: 'flag', 'fact', 'observation', 'meta'", () => {
      const prompt = findPrompt("kibi_overview");
      expect(prompt.text).toMatch(/\bflag\b/);
      expect(prompt.text).toMatch(/\bfact\b/);
      expect(prompt.text).toMatch(/\bobservation\b/);
      expect(prompt.text).toMatch(/\bmeta\b/);
    });

    test("must not claim 'bug' is an entity type", () => {
      const prompt = findPrompt("kibi_overview");
      expect(prompt.text).not.toMatch(
        /type:\s*bug|entity type.*\bbug\b|\bbug\b.*entity type/i,
      );
    });

    test("must not claim 'workaround' is an entity type", () => {
      const prompt = findPrompt("kibi_overview");
      expect(prompt.text).not.toMatch(
        /type:\s*workaround|entity type.*workaround/i,
      );
    });

    test("modeling guidance must be terse (under 250 characters for the modeling section)", () => {
      const prompt = findPrompt("kibi_overview");
      // Extract the modeling line(s) - should be a short bullet or sentence
      const modelingMatch = prompt.text.match(/Modeling:?[^\n]*/i);
      if (modelingMatch) {
        // If a terse modeling line exists, it should be under 250 chars
        expect(modelingMatch[0].length).toBeLessThan(250);
      } else {
        // If no "Modeling:" prefix exists yet, force failure - the terse form is required
        expect(prompt.text).toMatch(/Modeling:/i);
      }
    });
  });

  describe("kibi_workflow prompt", () => {
    test("must not claim 'bug' or 'workaround' are entity types", () => {
      const prompt = findPrompt("kibi_workflow");
      expect(prompt.text).not.toMatch(/type:\s*bug|type:\s*workaround/i);
    });
  });

  describe("init-kibi prompt", () => {
    test("must not claim 'bug' or 'workaround' are entity types", () => {
      const prompt = findPrompt("init-kibi");
      expect(prompt.text).not.toMatch(/type:\s*bug|type:\s*workaround/i);
    });

    test("must instruct agents to execute candidate applyPlan steps sequentially", () => {
      const prompt = findPrompt("init-kibi");
      expect(prompt.text).toMatch(/candidate\.applyPlan/i);
      expect(prompt.text).toMatch(/sequentially/i);
    });
  });

  // ─── DOC_RESOURCES ─────────────────────────────────────────────────────────

  describe("kibi docs examples resource", () => {
    test("must contain a modeling note about flag vs fact", () => {
      const resource = findResource("kibi://docs/examples");
      // Must have a note about flag/fact distinction
      expect(resource.text).toMatch(
        /flag.*fact|fact.*flag|flag.*gate|gate.*flag/i,
      );
    });

    test("must reference observation/meta fact_kinds in modeling note", () => {
      const resource = findResource("kibi://docs/examples");
      expect(resource.text).toMatch(/observation|meta/i);
    });

    test("must not claim 'bug' or 'workaround' are entity types", () => {
      const resource = findResource("kibi://docs/examples");
      expect(resource.text).not.toMatch(/type:\s*bug|type:\s*workaround/i);
    });
  });

  describe("kibi docs overview resource", () => {
    test("must not claim 'bug' or 'workaround' are entity types", () => {
      const resource = findResource("kibi://docs/overview");
      expect(resource.text).not.toMatch(/type:\s*bug|type:\s*workaround/i);
    });
  });

  // ─── PROMPTS array completeness ─────────────────────────────────────────────

  describe("PROMPTS array", () => {
    test("must contain kibi_overview, kibi_workflow, kibi_constraints, and init-kibi", () => {
      const promptNames = PROMPTS.map((p) => p.name);
      expect(promptNames).toContain("kibi_overview");
      expect(promptNames).toContain("kibi_workflow");
      expect(promptNames).toContain("kibi_constraints");
      expect(promptNames).toContain("init-kibi");
    });
  });

  // ─── DOC_RESOURCES array completeness ────────────────────────────────────────

  describe("DOC_RESOURCES array", () => {
    test("must contain overview, tools, errors, and examples resources", () => {
      const uris = DOC_RESOURCES.map((r) => r.uri);
      expect(uris).toContain("kibi://docs/overview");
      expect(uris).toContain("kibi://docs/tools");
      expect(uris).toContain("kibi://docs/errors");
      expect(uris).toContain("kibi://docs/examples");
    });
  });
});
