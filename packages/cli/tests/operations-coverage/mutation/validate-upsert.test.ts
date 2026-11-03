import { describe, expect, test } from "bun:test";
import { executeValidateUpsert } from "../../../src/operations/mutation/validate-upsert.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../../helpers/what-if.js";
import { ctx } from "../planning/fixtures.js";

const fact = (id: string, extra: Record<string, unknown> = {}) => ({
  type: "fact",
  id,
  properties: { title: `Fact ${id}`, status: "active", ...extra },
});
const requirement = (plannedFacts?: unknown) => ({
  type: "req",
  id: "REQ-preview",
  properties: { title: "Preview", status: "open" },
  relationships: [
    { type: "constrained_by", from: "REQ-preview", to: "FACT-planned" },
  ],
  ...(plannedFacts !== undefined ? { plannedFacts } : {}),
});

const validate = async (
  input: Record<string, unknown>,
  context: OperationContext = ctx({ fs: null }),
) => (await executeValidateUpsert(input as never, context)).structuredContent;

const whatIf = (answer: (goal: string) => PrologQueryResult | undefined) =>
  ctx({
    fs: null,
    answer: (goal) => (isWhatIfGoal(goal) ? answer(goal) : undefined),
  });

describe("planned facts in a dry run", () => {
  test("need a KB store", async () => {
    const { prolog: _prolog, ...storeless } = ctx({ fs: null });
    expect(
      (
        await validate(
          requirement([fact("FACT-planned")]),
          storeless as OperationContext,
        )
      )?.errors,
    ).toStrictEqual([
      "plannedFacts needs a KB store: the planned facts are staged against the current KB",
    ]);
  });

  test("reject malformed planned facts", async () => {
    const errors = async (planned: unknown) =>
      (await validate(requirement(planned)))?.errors;
    expect(await errors("FACT-planned")).toStrictEqual([
      "plannedFacts must be an array of fact upsert payloads",
    ]);
    expect(await errors([{ type: "req", id: "REQ-x" }, null])).toStrictEqual([
      "planned fact REQ-x is invalid: plannedFacts stages fact entities only (got type 'req')",
    ]);
    expect(await errors([null])).toStrictEqual([
      "planned fact #1 is invalid: plannedFacts stages fact entities only (got type 'undefined')",
    ]);
    expect(await errors([{ ...fact("REQ-preview") }])).toStrictEqual([
      "planned fact REQ-preview is invalid: it has the same id as the payload",
    ]);
    const [invalid] =
      (await errors([{ type: "fact", id: "FACT-planned", properties: {} }])) ??
      [];
    expect(invalid).toStartWith(
      "planned fact FACT-planned is invalid: Entity validation failed",
    );
  });

  test("stage the facts ahead of the payload and report the what-if", async () => {
    const result = await validate(
      requirement([
        fact("FACT-planned"),
        {
          ...fact("FACT-linked"),
          relationships: [
            { type: "relates_to", from: "FACT-linked", to: "FACT-planned" },
          ],
        },
      ]),
    );
    expect(result?.valid).toBe(true);
    expect(result?.stagedFacts).toStrictEqual(["FACT-planned", "FACT-linked"]);
    expect(result?.whatIf).toStrictEqual({
      introduced: [],
      removed: [],
      unchanged: [],
    });
  });

  test("refuse a staged batch the store rejects or cannot report", async () => {
    const rejected = await validate(
      requirement([fact("FACT-planned")]),
      whatIf(() => ({ success: false, bindings: {}, error: "staging failed" })),
    );
    expect(rejected?.valid).toBe(false);
    expect(rejected?.errors[0]).toContain("staging failed");
    const unreadable = await validate(
      requirement([fact("FACT-planned")]),
      whatIf(() => ({ success: true, bindings: { JsonString: "not json" } })),
    );
    expect(unreadable?.errors).toStrictEqual([
      "Failed to preview REQ-preview with planned facts: the staged contradiction analysis could not be read",
    ]);
  });

  test("refuse a requirement its planned facts would contradict", async () => {
    const conflicting = whatIf(() =>
      whatIfResult({
        introduced: [
          { requirements: ["REQ-preview", "REQ-old"], reason: "limits differ" },
          { requirements: ["REQ-preview"], reason: "self clash" },
        ],
      }),
    );
    const refused = await validate(
      requirement([fact("FACT-planned")]),
      conflicting,
    );
    expect(refused?.errors[0]).toStartWith(
      "Contradiction detected for requirement REQ-preview once its planned facts are written:\n  - Conflicts with REQ-old: limits differ\n  - Conflicts with REQ-preview: self clash\n",
    );
    const skipped = await validate(
      { ...requirement([fact("FACT-planned")]), _skipContradictionCheck: true },
      conflicting,
    );
    expect(skipped?.valid).toBe(true);
    expect(skipped?.whatIf?.introduced).toHaveLength(2);
  });
});

describe("dry run warnings and document previews", () => {
  test("warns about a numeric id only for a new entity", async () => {
    const numeric = {
      type: "fact",
      id: "FACT-001",
      properties: { title: "One", status: "active" },
    };
    const fresh = await validate(
      numeric,
      ctx({
        fs: null,
        answer: (goal) =>
          goal.startsWith("once(kb_entity('FACT-001'")
            ? { success: false, bindings: {} }
            : undefined,
      }),
    );
    expect(
      fresh?.warnings.some((line: string) =>
        line.startsWith(
          "entity-id-style: Entity ID FACT-001 is a sequence number",
        ),
      ),
    ).toBe(true);
    const existing = await validate(
      numeric,
      ctx({
        fs: null,
        answer: (goal) =>
          goal.startsWith("once(kb_entity('FACT-001'")
            ? { success: true, bindings: {} }
            : undefined,
      }),
    );
    expect(
      existing?.warnings.some((line: string) =>
        line.startsWith("entity-id-style:"),
      ),
    ).toBe(false);
  });

  test("locates the document without a store", async () => {
    const { prolog: _prolog, ...storeless } = ctx();
    const located = await validate(fact("FACT-doc"), {
      ...storeless,
      fs: nodeFilesystem,
    } as OperationContext);
    expect(located?.valid).toBe(true);
    const unlocated = await validate(
      { ...fact("FACT-doc"), document: { path: "../outside.md" } },
      { ...storeless, fs: nodeFilesystem } as OperationContext,
    );
    expect(unlocated?.valid).toBe(true);
  });
});
