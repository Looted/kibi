import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  adviseProse,
  checkViolations,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the domain subject layer: two prose requirements about
 * one product view that nobody modeled. Kibi cannot compare their sentences,
 * but once each claim names the subject it is about, the subject's domain
 * view puts both requirements side by side, and a claim that names no
 * subject, or a subject nobody defined, blocks kibi check.
 */

const SUBJECT_RULES =
  "claim-subject-missing,claim-subject-undefined,subject-definition-missing,subject-duplicate";

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function payload(result: Json): Json {
  return (result.data ?? result) as Json;
}

function subjectFact(id: string, key: string, title: string, body: string) {
  return doc(
    `
id: ${id}
title: ${title}
type: fact
status: active
fact_kind: subject
subject_key: ${key}
`,
    body,
  );
}

function prose(
  ws: ConsumerWorkspace,
  id: string,
  title: string,
  text: string,
  subjects: readonly string[] | undefined,
): void {
  const { contract, propositions } = adviseProse(ws, text);
  const entries = propositions.map((proposition) => ({
    ...proposition,
    status: proposition.status === "modeled" ? "missing" : proposition.status,
    ...(subjects === undefined ? {} : { subjects }),
  }));
  ws.write(
    `.kb/requirements/${id}.md`,
    doc(
      `
id: ${id}
title: ${title}
type: req
status: open
${semanticFrontMatter(text, contract, entries)}
`,
      [
        text,
        "",
        "## Context",
        "",
        "Reviewers asked for this in the design review of the drawing tools; the reason was not written down beyond that.",
      ].join("\n"),
    ),
  );
}

describe("domain subjects through the kibi CLI", () => {
  test("requirements that name one subject meet in its domain view, and unanchored or undefined subjects block", () => {
    const ws = createConsumerWorkspace("kibi-domain-subjects-");
    workspace = ws;

    ws.write(
      ".kb/facts/FACT-SUBJ-DRAWING.md",
      subjectFact(
        "FACT-SUBJ-DRAWING",
        "drawing",
        "Drawing",
        "A sketch a user draws on the canvas of the product; it is not an uploaded image or a template.",
      ),
    );
    ws.write(
      ".kb/facts/FACT-SUBJ-READ-ONLY-VIEW.md",
      subjectFact(
        "FACT-SUBJ-READ-ONLY-VIEW",
        "drawing.read_only_view",
        "Read-only drawing view",
        "The view of a drawing in which nobody can change its strokes, used for sharing and review; it is not the editor.",
      ),
    );
    prose(
      ws,
      "REQ-VIEW-LOCKS",
      "The read-only view locks the drawing",
      "The read-only view must lock the drawing against every edit.",
      ["drawing.read_only_view"],
    );
    prose(
      ws,
      "REQ-REVIEW-EDITOR",
      "The review editor opens in the read-only view",
      "The review editor must open inside the read-only view of the drawing.",
      ["drawing.read_only_view"],
    );
    ws.sync();

    // Both prose requirements are listed under the subject they name.
    const view = payload(
      ws.json(["query"], {
        factKind: "subject",
        subjectKey: "drawing.read_only_view",
      }),
    );
    const factQuery = view.factQuery as Json;
    const domain = factQuery.domain as Json;
    expect(factQuery.mode).toBe("subject");
    expect(domain.defined).toBe(true);
    expect(domain.broader).toEqual(["drawing"]);
    expect(
      (domain.requirements as Json[]).map((requirement) => requirement.id),
    ).toEqual(["REQ-REVIEW-EDITOR", "REQ-VIEW-LOCKS"]);
    expect((view.entities as Json[])[0]?.definition).toContain(
      "nobody can change its strokes",
    );
    expect(factQuery.warnings).toEqual([]);

    // The broader subject reaches them through its narrower subject.
    const broader = payload(
      ws.json(["query"], { factKind: "subject", subjectKey: "drawing" }),
    );
    expect(
      ((broader.factQuery as Json).domain as Json).narrower as string[],
    ).toEqual(["drawing.read_only_view"]);
    expect(checkViolations(ws, SUBJECT_RULES)).toEqual([]);

    // A claim that names no subject, and one that names an undefined subject,
    // block the check.
    prose(
      ws,
      "REQ-EXPORT",
      "Drawings export as PNG",
      "A drawing must export as a PNG file.",
      undefined,
    );
    prose(
      ws,
      "REQ-STAMP",
      "Reviews stamp the drawing",
      "A finished review must stamp the drawing with the reviewer name.",
      ["drawing.review_stamp"],
    );
    ws.sync();
    const findings = checkViolations(ws, SUBJECT_RULES).map(
      (violation) => `${violation.rule} ${violation.entityId}`,
    );
    expect(findings).toContain("claim-subject-missing REQ-EXPORT");
    expect(findings).toContain("claim-subject-undefined REQ-STAMP");
    expect(
      findings.filter(
        (finding) =>
          !finding.endsWith("REQ-EXPORT") && !finding.endsWith("REQ-STAMP"),
      ),
    ).toEqual([]);

    // kibi migrate suggests the subject the unanchored claim's words match and
    // writes it only once a person approves the action by id.
    const before = ws.read(".kb/requirements/REQ-EXPORT.md");
    const plan = ws.json(["migrate", "--format", "json"]);
    const anchors = (plan.actions as Json[]).filter((action) =>
      String(action.id).startsWith("claim-subject-anchor-REQ-EXPORT-"),
    );
    expect(anchors).toHaveLength(1);
    const [anchor] = anchors as [Json];
    expect(anchor).toMatchObject({
      code: "claim_subject_anchor_suggest",
      safety: "review",
      autoApplicable: false,
    });
    expect((anchor.evidence as Json).subjects).toEqual(["drawing"]);
    ws.kibi([
      "migrate",
      "--apply-safe",
      "--approved-plan-hash",
      String(plan.planHash),
    ]);
    expect(ws.read(".kb/requirements/REQ-EXPORT.md")).toBe(before);
    const replanned = ws.json(["migrate", "--format", "json"]);
    ws.kibi([
      "migrate",
      "--apply-safe",
      "--approved-plan-hash",
      String(replanned.planHash),
      "--approved-action",
      String(anchor.id),
    ]);
    const after = ws.read(".kb/requirements/REQ-EXPORT.md");
    expect(after).not.toBe(before);
    expect(after).toContain("    subjects:\n      - drawing\n");
    ws.sync();
    expect(
      checkViolations(ws, "claim-subject-missing").map(
        (violation) => violation.entityId,
      ),
    ).toEqual([]);

    // Writing a requirement on the subject names the requirements already on
    // it, so the writer compares them before relying on either.
    const text =
      "The read-only view must show the reviewer comments beside the drawing.";
    const { contract, propositions } = adviseProse(ws, text);
    const written = ws.json(["upsert"], {
      type: "req",
      id: "REQ-COMMENTS",
      properties: {
        title: "The read-only view shows reviewer comments",
        status: "open",
        semantic_text: text,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: propositions.map((proposition) => ({
          ...proposition,
          status:
            proposition.status === "modeled" ? "missing" : proposition.status,
          subjects: ["drawing.read_only_view"],
        })),
        logic_claims: propositions.map((proposition) => proposition.claim_key),
      },
      document: {
        body: `${text}\n\n## Context\n\nReviewers asked to see comments without leaving the read-only view; the reason was not written down beyond that.\n`,
      },
    });
    const warnings = JSON.stringify(payload(written).warnings ?? written);
    expect(warnings).toContain("Subject drawing.read_only_view");
    expect(warnings).toContain("REQ-REVIEW-EDITOR");
    expect(warnings).toContain("REQ-VIEW-LOCKS");
  });
});
