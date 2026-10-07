// implements REQ-bootstrap-subject-key-shape
import { describe, expect, test } from "bun:test";
import { buildIntentClaimCandidates } from "../../src/operations/bootstrap/intent-claims.js";
import { markdownComponentHint } from "../../src/operations/bootstrap/markdown-candidates.js";
import { normalizeBootstrapContext } from "../../src/operations/bootstrap/presentation.js";
import { resolveBootstrapSubjectKey } from "../../src/operations/bootstrap/requirement-claims.js";
import { validateBootstrapPayload } from "../../src/operations/bootstrap/validation.js";
import { isConventionalSubjectKey } from "../../src/utils/strict-modeling.js";

const STATEMENT = "Beginning to record while idle must start a new take.";

function plan(
  claim: Record<string, unknown>,
  source: Record<string, unknown> = {},
) {
  return buildIntentClaimCandidates(
    normalizeBootstrapContext({
      knowledgeSources: [
        {
          id: "spec",
          title: "Recorder spec",
          locator: "docs/recorder.md",
          kind: "specification",
          authority: "authoritative",
          ...source,
        },
      ],
      intentClaims: [
        {
          sourceId: "spec",
          reference: "REC-1",
          statement: STATEMENT,
          excerpt: STATEMENT,
          ...claim,
        },
      ],
    } as never),
    new Set(),
    0.8,
  );
}

function subjectKeys(result: ReturnType<typeof plan>): string[] {
  return result.candidates
    .flatMap((candidate) => candidate.applyPlan)
    .map((step) => (step.properties as Record<string, unknown>).subject_key)
    .filter((key): key is string => typeof key === "string");
}

describe("bootstrap subject keys follow component.aspect[.sub]", () => {
  test("a declared component prefixes the claim's subject", () => {
    expect(
      resolveBootstrapSubjectKey(
        "Beginning to record while idle",
        "x",
        "Recorder",
      ),
    ).toEqual({
      ok: true,
      subjectKey: "recorder.beginning_to_record_while_idle",
    });
  });

  test("a subject that repeats the component is not doubled", () => {
    expect(
      resolveBootstrapSubjectKey("the recorder idle state", "x", "recorder"),
    ).toEqual({ ok: true, subjectKey: "recorder.idle_state" });
    expect(
      resolveBootstrapSubjectKey(
        "The recorder",
        "start a new take",
        "recorder",
      ),
    ).toEqual({ ok: true, subjectKey: "recorder.start_a_new_take" });
  });

  test("a one-word subject is the component and the property the aspect", () => {
    expect(resolveBootstrapSubjectKey("Refunds", "exceed the charge")).toEqual({
      ok: true,
      subjectKey: "refunds.exceed_the_charge",
    });
  });

  test("an already dotted subject is kept", () => {
    expect(resolveBootstrapSubjectKey("billing/refunds", "x")).toEqual({
      ok: true,
      subjectKey: "billing.refunds",
    });
  });

  test("a multi-word subject without a component is not resolved", () => {
    const result = resolveBootstrapSubjectKey(
      "Beginning to record while idle",
      "start a new take",
    );
    expect(result.ok).toBe(false);
  });

  test("intent claims take the knowledge source's component", () => {
    const result = plan({}, { component: "recorder" });
    const keys = subjectKeys(result);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys)).toEqual(
      new Set(["recorder.beginning_to_record_while_idle"]),
    );
    expect(keys.every(isConventionalSubjectKey)).toBe(true);
    for (const step of result.candidates[0]?.applyPlan ?? [])
      expect(() => validateBootstrapPayload(step, new Date())).not.toThrow();
  });

  test("a claim's own component overrides the source's", () => {
    const keys = subjectKeys(
      plan({ component: "studio" }, { component: "recorder" }),
    );
    expect(new Set(keys)).toEqual(
      new Set(["studio.beginning_to_record_while_idle"]),
    );
  });

  test("without a component the claim is reported, not written with a malformed key", () => {
    const result = plan({});
    expect(result.candidates).toEqual([]);
    expect(result.sourceOnlySignals).toHaveLength(1);
    expect(result.diagnostics.join("\n")).toContain("spec:REC-1");
    expect(result.diagnostics.join("\n")).toContain("component");
  });

  test("a stated rationale becomes the requirement's rationale and Context", () => {
    const rationale = "Users lost takes when recording silently did nothing.";
    const result = plan({ rationale }, { component: "recorder" });
    const req = result.candidates[0]?.applyPlan.find(
      (step) => step.type === "req",
    ) as {
      properties: Record<string, unknown>;
      document: { body: string };
    };
    expect(req.properties.rationale).toBe(rationale);
    expect(req.document.body).toContain("## Context");
    expect(req.document.body).toContain(rationale);
    expect(() => validateBootstrapPayload(req, new Date())).not.toThrow();
  });

  test("a claim without a rationale gets none invented", () => {
    const result = plan({}, { component: "recorder" });
    const req = result.candidates[0]?.applyPlan.find(
      (step) => step.type === "req",
    ) as { properties: Record<string, unknown>; document: { body: string } };
    expect(req.properties.rationale).toBeUndefined();
    expect(req.document.body).not.toContain("## Context");
  });

  test("repository documents name their component by file or directory", () => {
    expect(markdownComponentHint("docs/recorder.md")).toBe("recorder");
    expect(markdownComponentHint("packages/recorder/README.md")).toBe(
      "recorder",
    );
    expect(markdownComponentHint("README.md")).toBeUndefined();
  });
});
