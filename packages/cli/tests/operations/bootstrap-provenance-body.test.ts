import { describe, expect, test } from "bun:test";

import { hasContext } from "../../src/entity-body-context.js";
import { buildBootstrapCandidates } from "../../src/operations/bootstrap/candidates.js";
import type { BootstrapEvidence } from "../../src/operations/bootstrap/types.js";

// executable_for TEST-kb-entity-body-context

type Step = {
  type: string;
  id: string;
  properties: Record<string, unknown>;
  document?: { body?: string };
};

function steps(evidence: readonly BootstrapEvidence[]): Step[] {
  return buildBootstrapCandidates(
    evidence,
    new Set(),
    0.5,
    true,
  ).candidates.flatMap((candidate) => candidate.applyPlan as unknown as Step[]);
}

describe("bootstrap provenance bodies", () => {
  test("every entity a deterministic provider or generic prose plans carries body context", () => {
    const planned = steps([
      {
        provider: "repo_layout",
        kind: "repo_layout",
        label: "src",
        relativePath: "src",
        data: { title: "Repository layout: src" },
      },
      {
        provider: "repo_metadata",
        kind: "repo_metadata",
        label: "package.json",
        relativePath: "package.json",
        data: { title: "Package metadata: package.json" },
      },
      {
        provider: "generic_repo_docs",
        kind: "generic_markdown",
        label: "docs/policy.md",
        relativePath: "docs/policy.md",
        content:
          "# Policies\n\n## Requirements\n\nThe uploader must retry a failed upload three times.\n\n## Observations\n\nUploads run in a worker pool.\n",
        data: {},
      },
    ]);

    const governed = planned.filter(
      (step) =>
        ["req", "adr"].includes(step.type) ||
        (step.type === "fact" &&
          ["observation", "meta"].includes(String(step.properties.fact_kind))),
    );
    expect(governed.length).toBeGreaterThanOrEqual(3);
    for (const step of governed) {
      const body = step.document?.body ?? "";
      expect(
        hasContext(step.type, body, {
          title: step.properties.title,
          semantic_text: step.properties.semantic_text,
          fact_kind: step.properties.fact_kind,
        }),
      ).toBe(true);
    }
  });
});
