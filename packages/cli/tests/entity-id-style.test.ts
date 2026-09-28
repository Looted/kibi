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
import { ontologyQualityOverridesGoal } from "../src/commands/aggregated-checks.js";
import { partitionCheckFindings } from "../src/public/operations/check-helpers.js";
import type { StagedFile } from "../src/traceability/git-staged.js";
import { createStagedEntityIdStyleDiagnostics } from "../src/traceability/staged-entity-id-style.js";
import {
  entityIdStyleIssues,
  entityIdStyleWarnings,
  isNumericEntityId,
  markdownSourceStem,
} from "../src/utils/entity-id-style.js";
import { getRuleDefinition } from "../src/utils/rule-registry.js";

function stagedMarkdown(
  path: string,
  id: string,
  status: StagedFile["status"],
): StagedFile {
  return {
    path,
    status,
    hunkRanges: [{ start: 1, end: 6 }],
    content: `---\nid: ${id}\ntitle: Example\nstatus: open\n---\n\nBody.\n`,
  };
}

// executable_for TEST-kibi-entity-id-style
describe("entity-id-style", () => {
  test("recognizes purely numeric IDs only", () => {
    expect(isNumericEntityId("REQ-001")).toBe(true);
    expect(isNumericEntityId("ADR-12")).toBe(true);
    expect(isNumericEntityId("REQ-cli-gc")).toBe(false);
    expect(isNumericEntityId("REQ-opencode-kibi-plugin-v1")).toBe(false);
    expect(isNumericEntityId("REQ-AUTO-941B0CE68BAF3331")).toBe(false);
  });

  test("derives stems only from authored Markdown paths", () => {
    expect(markdownSourceStem(".kb/requirements/REQ-cli-gc.md")).toBe(
      "REQ-cli-gc",
    );
    expect(markdownSourceStem("mcp://kibi/upsert")).toBeUndefined();
    expect(markdownSourceStem(".kb/symbols.yaml")).toBeUndefined();
    expect(markdownSourceStem(undefined)).toBeUndefined();
  });

  test("reports numeric IDs and stem mismatches with slug remediation", () => {
    expect(
      entityIdStyleIssues({
        id: "REQ-cli-gc",
        sourcePath: ".kb/requirements/REQ-cli-gc.md",
      }),
    ).toEqual([]);
    const issues = entityIdStyleIssues({
      id: "REQ-042",
      sourcePath: ".kb/requirements/REQ-login.md",
    });
    expect(issues.map((issue) => issue.code)).toEqual([
      "numeric_id",
      "stem_mismatch",
    ]);
    expect(issues[0]?.suggestion).toContain("<TYPE>-<area>-<behavior>");
    expect(
      entityIdStyleWarnings({ id: "SYM-7", sourcePath: ".kb/symbols.yaml" }),
    ).toEqual([expect.stringMatching(/^entity-id-style: Entity ID SYM-7/)]);
  });

  test("staged review covers only added or renamed entity Markdown", () => {
    const diagnostics = createStagedEntityIdStyleDiagnostics([
      stagedMarkdown(".kb/requirements/REQ-021.md", "REQ-021", "A"),
      stagedMarkdown(".kb/requirements/REQ-003.md", "REQ-003", "M"),
      stagedMarkdown(".kb/scenarios/SCEN-gc.md", "SCEN-cli-gc", "R"),
      stagedMarkdown(".kb/requirements/REQ-cli-new.md", "REQ-cli-new", "A"),
      stagedMarkdown("docs/REQ-099.md", "REQ-099", "A"),
    ]);
    expect(
      diagnostics.map((diagnostic) => [
        diagnostic.entityId,
        diagnostic.message,
      ]),
    ).toEqual([
      ["REQ-021", expect.stringContaining("sequence number")],
      ["SCEN-cli-gc", expect.stringContaining("filename stem SCEN-gc")],
    ]);
    for (const diagnostic of diagnostics) {
      expect(diagnostic.id).toBe("entity_id_style_review");
      expect(diagnostic.blocking).toBe(false);
      expect(diagnostic.severity).toBe("warning");
    }
  });

  test("staged review ignores files whose frontmatter cannot be read", () => {
    expect(
      createStagedEntityIdStyleDiagnostics([
        {
          path: ".kb/requirements/REQ-001.md",
          status: "A",
          hunkRanges: [],
        },
        {
          path: ".kb/requirements/REQ-002.md",
          status: "A",
          hunkRanges: [],
          content: "no frontmatter",
        },
      ]),
    ).toEqual([]);
  });
});

// executable_for TEST-kibi-domain-redundancy
describe("advisory rule partitioning", () => {
  test("new vocabulary rules are advisory with warning or info severity", () => {
    for (const rule of [
      "entity-id-style",
      "domain-redundancy",
      "subject-key-identity",
      "subject-key-shape",
    ]) {
      expect(getRuleDefinition(rule)?.enforcementClass).toBe("advisory");
      expect(getRuleDefinition(rule)?.diagnosticSeverity).toBeUndefined();
    }
    for (const rule of ["domain-implication", "ontology-quality"]) {
      expect(getRuleDefinition(rule)?.diagnosticSeverity).toBe("info");
    }
    const { violations, qualityDiagnostics } = partitionCheckFindings([
      {
        rule: "ontology-quality",
        entityId: "FACT-SCHEMA-X",
        description: "prose atoms",
      },
      { rule: "domain-redundancy", entityId: "A/B", description: "dup" },
    ]);
    expect(violations).toEqual([]);
    expect(
      qualityDiagnostics.map((d) => [d.id, d.severity, d.blocking]),
    ).toEqual([
      ["rule.ontology-quality", "info", false],
      ["rule.domain-redundancy", "warning", false],
    ]);
  });

  test("ontology-quality thresholds are forwarded from the invoking process", () => {
    expect(ontologyQualityOverridesGoal({})).toContain(
      "set_ontology_quality_overrides(default, default)",
    );
    expect(
      ontologyQualityOverridesGoal({
        KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO: "0.4",
        KIBI_ONTOLOGY_QUALITY_MIN_FACTS: "12",
      }),
    ).toContain("set_ontology_quality_overrides(0.4, 12)");
    expect(
      ontologyQualityOverridesGoal({
        KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO: "abc');halt('",
      }),
    ).toContain("set_ontology_quality_overrides(default, default)");
  });
});
