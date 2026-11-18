import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  checkViolations,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * A requirement written the way the capture template asks (a statement body,
 * why and origin.ref) is recorded with its reason, and the result returns
 * what kb_check still needs as nextActions with inputs the CLI accepts as
 * they are, plus the current requirements on the same terms.
 */

let workspace: ConsumerWorkspace;

const WHY =
  "Customers on slow links told support that their quota pages time out while a long call list loads.";
const REF =
  "Support ticket from the gateway team: quota pages must stay short because they time out";

type Step = {
  operation: string;
  code: string;
  input: Json;
  reason: string;
  required: boolean;
};

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-upsert-capture-why-");
  workspace.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
  workspace.write(
    ".kb/requirements/REQ-quota-page-calls.md",
    doc(
      "id: REQ-quota-page-calls\ntitle: The quota page lists recent client calls\nstatus: open",
      "The client quota page must list the recent client calls of the quota window.\n\n## Context\n\nSupport asked for it so a client can see which calls used up its quota window.\n",
    ),
  );
  workspace.sync();
}, 300_000);

afterAll(() => workspace?.cleanup());

function upsert(input: Json): Json {
  const result = workspace.json(["upsert"], input) as {
    status: unknown;
    data: Json;
    error?: unknown;
  };
  expect(result.error).toBeUndefined();
  expect(result.status).toBe("success");
  return result.data;
}

/** A step's input with each <placeholder> replaced by the case's text. */
function filled(input: Json): Json {
  return JSON.parse(
    JSON.stringify(input)
      .replace(
        /<one case [^>]*>/,
        "Given a quota window with sixty client calls, when the quota page loads, then it lists the twenty most recent calls.",
      )
      .replace(/<what the test checks about [^>]*>/, "Quota page call cap")
      .replace(
        "<what the test runs and what it checks>",
        "Loads a quota page for a client with sixty calls and counts the rows.",
      ),
  ) as Json;
}

describe("kb_upsert records why and returns the remaining steps", () => {
  test("the capture template's write records the reason and lists what is left", () => {
    const data = upsert({
      type: "req",
      id: "REQ-quota-page-call-cap",
      properties: {
        title: "The quota page lists at most twenty client calls",
        status: "open",
        firmness: "firm",
        origin: { kind: "agent", ref: REF },
      },
      document: {
        body: "The client quota page must list at most twenty recent client calls.",
      },
      why: WHY,
    });
    const warnings = (data.warnings as string[]).join("\n");
    expect(warnings).not.toContain("has no body context");
    expect(warnings).not.toContain("claim-subject-missing");

    const file = workspace.read(".kb/requirements/REQ-quota-page-call-cap.md");
    expect(file).toContain(`rationale: ${WHY}`);
    expect(file).toContain(
      "semantic_text: The client quota page must list at most twenty recent client calls.",
    );
    expect(file).toContain(`## Context\n\n${WHY}`);
    expect(file).toContain(`## Source\n\n> ${REF}`);

    const steps = data.nextActions as Step[];
    expect(steps.map((step) => [step.operation, step.code])).toEqual([
      ["kb_upsert", "claim-subject-missing"],
      ["kb_upsert", "evidence-floor"],
      ["kb_upsert", "evidence-floor"],
      ["kb_upsert", "evidence-floor"],
      ["kibi prove", "evidence-floor"],
    ]);
    expect(steps.every((step) => step.required)).toBe(true);
    expect(data.relatedRequirements).toEqual([
      {
        id: "REQ-quota-page-calls",
        statement:
          "The client quota page must list the recent client calls of the quota window.",
      },
    ]);

    // Each kb_upsert step is accepted as it comes, once its placeholders
    // are filled; the subject step names the only subject there is.
    expect(steps[0]?.input).toMatchObject({
      properties: {
        semantic_inventory: [
          { status: "missing", subjects: ["client.call_quota"] },
        ],
      },
    });
    for (const step of steps.slice(0, 4)) upsert(filled(step.input));
    const left = checkViolations(
      workspace,
      "claim-subject-missing,entity-context-missing,evidence-floor",
    ).filter((violation) => violation.entityId === "REQ-quota-page-call-cap");
    // Only the proof run is left, and it is the last step returned.
    expect(left.map((violation) => violation.rule)).toEqual(["evidence-floor"]);
  }, 300_000);

  test("a new body replaces the statement Kibi checks", () => {
    const statement =
      "The client quota page must list the recent client calls of the last hour.";
    const data = upsert({
      type: "req",
      id: "REQ-quota-page-calls",
      properties: {
        title: "The quota page lists recent client calls",
        status: "open",
        origin: { kind: "human", ref: "Support: list only the last hour" },
      },
      document: {
        body: `${statement}\n\n## Context\n\nSupport asked for it so a client can see which calls used up its quota window.\n`,
      },
    });
    expect(data.updated).toBe(1);
    const file = workspace.read(".kb/requirements/REQ-quota-page-calls.md");
    expect(file).toContain(`semantic_text: ${statement}`);
    expect(file).toContain(
      "claim_text: The client quota page must list the recent client calls of the last hour",
    );
    expect(file).not.toContain("of the quota window");
  }, 300_000);
});
