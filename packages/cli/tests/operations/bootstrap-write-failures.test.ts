// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
import { describe, expect, test } from "bun:test";
import { buildBootstrapCandidates } from "../../src/operations/bootstrap/candidates.js";
import { selectBootstrapCandidates } from "../../src/operations/bootstrap/generate.js";
import { buildIntentClaimCandidates } from "../../src/operations/bootstrap/intent-claims.js";
import { markdownCandidates } from "../../src/operations/bootstrap/markdown-candidates.js";
import { normalizeBootstrapContext } from "../../src/operations/bootstrap/presentation.js";
import type {
  Candidate,
  BootstrapEvidence,
} from "../../src/operations/bootstrap/types.js";
import { validateBootstrapPayload } from "../../src/operations/bootstrap/validation.js";

function candidate(index: number, sourceKind = "intent_claim"): Candidate {
  const type = sourceKind === "intent_claim" ? "req" : "fact";
  return {
    candidateId: `candidate:${index}`,
    entityType: type,
    title: `Claim ${index}`,
    sourceKind,
    sourcePath: `source:${index}`,
    confidence: 0.82,
    confidenceBand: "medium",
    evidence: [`citation:${index}`],
    relationships: [],
    applyPlan: [
      {
        type,
        id: `${type === "req" ? "REQ" : "FACT"}-candidate-${index}`,
        properties: {
          title: `Claim ${index}`,
          status: type === "req" ? "open" : "active",
          ...(type === "fact" ? { fact_kind: "observation" } : {}),
        },
        relationships: [],
      },
    ],
  };
}
function evidence(
  content: string,
  kind: BootstrapEvidence["kind"] = "generic_markdown",
): BootstrapEvidence {
  return {
    provider:
      kind === "typed_markdown" ? "typed_kibi_docs" : "generic_repo_docs",
    kind,
    label: "requirements.md",
    relativePath: "requirements.md",
    content,
    data: {},
  };
}

describe("bootstrap write safety and evidence accounting", () => {
  test("schema-valid inbound relationships remain writable", () => {
    const payload = {
      type: "scenario",
      id: "SCEN-inbound",
      properties: { title: "Inbound scenario", status: "active" },
      relationships: [
        { from: "REQ-existing", type: "specified_by", to: "SCEN-inbound" },
      ],
    };
    expect(validateBootstrapPayload(payload, new Date())).toBe(payload);
  });
  test("invalid candidate is suppressed with the writer error and a cited authoring follow-up", () => {
    const invalid = {
      ...candidate(1),
      applyPlan: [
        {
          type: "fact",
          id: "FACT-invalid",
          properties: {
            title: "Invalid",
            status: "active",
            fact_kind: "property_value",
            subject_key: "exports",
            property_key: "headers",
            polarity: "require",
          },
        },
      ],
    };
    const result = selectBootstrapCandidates(
      [invalid, candidate(2)],
      new Set(),
      undefined,
      1,
    );
    expect(result.candidates.map((row) => row.candidateId)).toEqual([
      "candidate:2",
    ]);
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({
        reason: "invalid_write",
        message: expect.stringContaining("requires operator"),
      }),
    );
    expect(result.sourceOnlySignals[0]).toMatchObject({
      kind: "req",
      sourcePath: "source:1",
      evidence: ["citation:1"],
    });
  });
  test("product claims precede source observations; existing and duplicate candidates do not consume capacity", () => {
    const claims = Array.from({ length: 60 }, (_, index) => candidate(index));
    const observations = Array.from({ length: 100 }, (_, index) =>
      candidate(index + 100, "source_symbols"),
    );
    const result = selectBootstrapCandidates(
      [...observations, ...claims, candidate(0)],
      new Set(["REQ-candidate-1"]),
      undefined,
      50,
    );
    expect(result.candidates).toHaveLength(50);
    expect(
      result.candidates.every((row) => row.sourceKind === "intent_claim"),
    ).toBe(true);
    expect(
      result.suppressed.filter((row) => row.reason === "over_limit"),
    ).toHaveLength(109);
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({ reason: "entity_exists" }),
    );
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({ reason: "duplicate_title" }),
    );
  });
  test("task markers are stripped and questions and invalid keys remain line-cited follow-ups", () => {
    const result = markdownCandidates(
      evidence(
        "# Requirements\n- [ ] Must support SSO\n- [x] Admins should review access\n- [ ] should we keep the CSV export?\n- [ ] 🚀 must 🚀",
      ),
      new Set(),
      0.8,
    );
    expect(result.candidates).toHaveLength(2);
    const subjects = result.candidates
      .flatMap((row) => row.applyPlan)
      .map((row) => (row.properties as Record<string, unknown>).subject_key)
      .filter(Boolean);
    expect(subjects).toContain("system");
    expect(subjects).toContain("admins");
    expect(subjects).not.toContain("x_admins");
    expect(result.sourceOnlySignals.map((row) => row.sourcePath)).toEqual(
      expect.arrayContaining(["requirements.md#L4", "requirements.md#L5"]),
    );
    expect(result.diagnostics.join("\n")).toContain("#L5");
  });
  test("one malformed intent claim does not prevent later claims from being modeled", () => {
    const context = normalizeBootstrapContext({
      knowledgeSources: [
        {
          id: "spec",
          title: "Spec",
          locator: "spec",
          kind: "specification",
          authority: "authoritative",
        },
      ],
      intentClaims: [
        { sourceId: "spec", reference: "line:1", statement: "🚀 must 🚀" },
        {
          sourceId: "spec",
          reference: "line:2",
          statement: "Telemetry must be disabled.",
        },
      ],
    });
    const result = buildIntentClaimCandidates(context, new Set(), 0.8);
    expect(result.candidates).toHaveLength(1);
    expect(result.sourceOnlySignals).toHaveLength(1);
    expect(result.diagnostics.join("\n")).toContain("line:1");
    for (const payload of result.candidates[0]!.applyPlan)
      expect(() => validateBootstrapPayload(payload, new Date())).not.toThrow();
  });
  test("typed extractor failures name the path and suppression reason", () => {
    const result = buildBootstrapCandidates(
      [
        evidence(
          "---\nid: REQ-broken\ntitle: Broken\nstatus: open\ntype: req\ninvalid: [\n---",
          "typed_markdown",
        ),
      ],
      new Set(),
      0.8,
      true,
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics.join("\n")).toContain("requirements.md");
    expect(result.suppressed).toContainEqual(
      expect.objectContaining({
        reason: "extraction_failed",
        sourcePath: "requirements.md",
      }),
    );
  });
});
