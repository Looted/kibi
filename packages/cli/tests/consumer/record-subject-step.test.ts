import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  checkViolations,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * kb_record sets a requirement's title to the first sentence of its
 * statement, so the title is itself a rule. The claim-subject-missing step it
 * returns must still be accepted as it comes once its subject is named, for
 * a one-sentence and a two-sentence statement, without moving the ledger off
 * the statement.
 */

let workspace: ConsumerWorkspace;

type Step = { operation: string; code: string; input: Json };

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-record-subject-step-");
  workspace.write(
    "src/limits.ts",
    "export function retry(left: number): boolean {\n  return left > 0 && left <= 500;\n}\n",
  );
  workspace.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
  workspace.git("add", "src");
  workspace.sync();
}, 300_000);

afterAll(() => workspace?.cleanup());

function subjectStep(statement: string): { id: string; step: Step } {
  const result = workspace.json(["record"], {
    statement,
    why: "Reason not stated",
    saidBy: "agent",
    code: [{ file: "src/limits.ts", symbol: "retry" }],
  }) as { status: string; data: Json; error?: unknown };
  expect(result.status, JSON.stringify(result.error)).toBe("success");
  const steps = result.data.nextActions as Step[];
  const step = steps.find((each) => each.code === "claim-subject-missing");
  expect(step).toBeDefined();
  return { id: result.data.id as string, step: step as Step };
}

describe("kb_record's claim-subject-missing step", () => {
  for (const statement of [
    "A client must have at most 500 remaining calls.",
    "A client must have at most 400 remaining calls. A client must not retry after its last call.",
  ])
    test(statement, () => {
      const { id, step } = subjectStep(statement);
      const input = JSON.parse(
        JSON.stringify(step.input).replaceAll(
          "<subject_key>",
          "client.call_quota",
        ),
      ) as Json;
      const result = workspace.json(["upsert"], input) as {
        status: string;
        error?: unknown;
      };
      expect(result.status, JSON.stringify(result.error)).toBe("success");
      const file = workspace.read(`.kb/requirements/${id}.md`);
      expect(file).toContain("semantic_source_field: semantic_text");
      expect(file).toContain("client.call_quota");
      expect(
        checkViolations(workspace, "claim-subject-missing").filter(
          (violation) => violation.entityId === id,
        ),
      ).toEqual([]);
    }, 300_000);
});
