import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  BaselineInsertionValidationError,
  MAX_BASELINE_INSERTION_PARAGRAPH_BYTES,
  composeBaselineInsertion,
  validateBaselineInsertionParagraph,
  validateBaselineInsertionPlan,
} from "../baseline-insertion";
import { validateCompleteCandidateBody } from "../candidate-body";
import { surface } from "../real-workflow";
import { validateCandidateBody } from "../variants";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const baseline =
  "Preamble with Unicode: cafe\u0301 and \u65e5\u672c.\r\n\r\n## Closeout fields\r\nTail bytes stay exact.\r\n";
const plan = {
  currentBaselineBodyHash: sha256(baseline),
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
  headingAnchor: "## Closeout fields",
  objective: "Repair REQ-FIXTURE-001 without exposing fixture metadata",
} as const;
const paragraph =
  "Read the supplied request, keep its actual target and intended edges, search and query those targets, validate the same payload, fix diagnosed pre-commit errors, perform the authorized same-payload kb_upsert, exact-read back every affected endpoint, and finish with an unfiltered kb_check and kb_status final check; validation is not completion.";

describe("baseline-preserving insertion", () => {
  test("accepts the current canonical baseline shallowly and preserves its source bytes", async () => {
    const current = await surface(process.cwd(), "kibi-usage");

    expect(Buffer.byteLength(current.body, "utf8")).toBeGreaterThan(0);
    expect(() => validateCandidateBody(current.body)).not.toThrow();
    const result = composeBaselineInsertion({
      baselineBody: current.body,
      paragraph,
      plan: {
        ...plan,
        currentBaselineBodyHash: sha256(current.body),
        frontmatterHash: current.frontmatterHash,
        resourcesHash: current.resourcesHash,
      },
    });

    expect(result.composedBody.slice(0, result.insertionOffset)).toBe(
      current.body.slice(0, result.insertionOffset),
    );
    expect(
      result.composedBody.slice(
        result.insertionOffset + result.insertion.length,
      ),
    ).toBe(current.body.slice(result.insertionOffset));
    expect(result.receipt.baselineBodyHash).toBe(sha256(current.body));
    expect(result.receipt.baselineBodyBytes).toBe(
      Buffer.byteLength(current.body, "utf8"),
    );
    expect(result.receipt.frontmatterHash).toBe(current.frontmatterHash);
    expect(result.receipt.resourcesHash).toBe(current.resourcesHash);
  });

  test("keeps legacy completeness rejection for static synthetic input", () => {
    expect(() => validateCompleteCandidateBody(baseline)).toThrow(
      "optimizer_output_incomplete_body",
    );
  });

  test("composes before one host-owned heading without changing baseline bytes", () => {
    const result = composeBaselineInsertion({
      baselineBody: baseline,
      paragraph,
      plan,
    });
    const before = baseline.slice(0, result.insertionOffset);
    const after = baseline.slice(result.insertionOffset);

    expect(result.composedBody).toBe(`${before}${result.insertion}${after}`);
    expect(result.composedBody.slice(0, result.insertionOffset)).toBe(before);
    expect(
      result.composedBody.slice(
        result.insertionOffset + result.insertion.length,
      ),
    ).toBe(after);
    expect(result.composedBody.indexOf(paragraph)).toBeLessThan(
      result.composedBody.indexOf(plan.headingAnchor),
    );
    expect(result.receipt.paragraphHash).toBe(sha256(paragraph));
    expect(result.receipt.objectiveHash).toBe(sha256(plan.objective));
    expect(paragraph).not.toContain("REQ-FIXTURE-001");
    expect(result.receipt.insertionHash).toBe(sha256(result.insertion));
    expect(result.receipt.composedBodyHash).toBe(sha256(result.composedBody));
    expect(result.receipt.baselineBodyHash).toBe(sha256(baseline));
    expect(result.receipt.frontmatterHash).toBe(plan.frontmatterHash);
    expect(result.receipt.resourcesHash).toBe(plan.resourcesHash);
    expect(result.receipt.insertionBytes).toBe(
      Buffer.byteLength(result.insertion, "utf8"),
    );
  });

  test("validates the plan and rejects missing or repeated anchors", () => {
    expect(() =>
      composeBaselineInsertion({
        baselineBody: baseline.replace("## Closeout fields", "## Other"),
        paragraph,
        plan,
      }),
    ).toThrow("baseline_insertion_baseline_hash_mismatch");
    expect(() =>
      composeBaselineInsertion({
        baselineBody: baseline,
        paragraph,
        plan: { ...plan, headingAnchor: "## Missing" },
      }),
    ).toThrow("baseline_insertion_anchor_missing");
    expect(() =>
      composeBaselineInsertion({
        baselineBody: `${baseline}## Closeout fields\r\n`,
        paragraph,
        plan: {
          ...plan,
          currentBaselineBodyHash: sha256(`${baseline}## Closeout fields\r\n`),
        },
      }),
    ).toThrow("baseline_insertion_anchor_not_unique");
    expect(() =>
      validateBaselineInsertionPlan({
        ...plan,
        headingAnchor: "Closeout fields",
      }),
    ).toThrow(BaselineInsertionValidationError);
  });

  test("rejects unsafe, policy-leaking, oversized, and non-paragraph additions", () => {
    expect(() =>
      validateBaselineInsertionParagraph(
        "For task-specific recovery, use the supplied payload and preserve run-time authorization boundaries; validate before applying its exact corrected mutation.",
        plan,
      ),
    ).not.toThrow();
    for (const unsafe of [
      "Use OpenCode for the supplied request.",
      "Run bun run version-packages for the supplied request.",
      "Read .kb directly for the supplied request.",
    ]) {
      expect(() => validateBaselineInsertionParagraph(unsafe, plan)).toThrow();
    }
    for (const metadata of [
      "Repair REQ-FIXTURE-001 after the mutation.",
      "Apply task t1 and report the result.",
      "Record runId: run-1 in the paragraph.",
      "Apply the request from 7908c398-bb6f-4bb9-bcfc-5da3e8349d07.",
    ]) {
      expect(() => validateBaselineInsertionParagraph(metadata, plan)).toThrow(
        "baseline_insertion_metadata_leak",
      );
    }
    expect(() =>
      validateBaselineInsertionParagraph(
        "Read the supplied request.\n\nSecond paragraph.",
        plan,
      ),
    ).toThrow("baseline_insertion_multiple_paragraphs");
    expect(() =>
      validateBaselineInsertionParagraph(
        "# Heading\nRead the supplied request.",
        plan,
      ),
    ).toThrow("baseline_insertion_header");
    expect(() =>
      validateBaselineInsertionParagraph(
        "```\nRead the supplied request.",
        plan,
      ),
    ).toThrow("baseline_insertion_fence");
    expect(() =>
      validateBaselineInsertionParagraph(
        `Read the supplied request ${"x".repeat(MAX_BASELINE_INSERTION_PARAGRAPH_BYTES)}`,
        plan,
      ),
    ).toThrow("baseline_insertion_paragraph_too_large");
    expect(() =>
      validateBaselineInsertionParagraph("- Read the supplied request.", plan),
    ).toThrow("baseline_insertion_non_paragraph");
    expect(() =>
      validateBaselineInsertionParagraph(
        "    Read the supplied request.",
        plan,
      ),
    ).toThrow("baseline_insertion_non_paragraph");
    expect(() =>
      validateBaselineInsertionParagraph("missing context", plan),
    ).not.toThrow();
  });
});
