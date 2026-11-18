import { describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
import {
  ID_CHARS,
  ID_WORDS,
  MAX_TITLE,
  RECORD_FIELDS,
  type RecordInput,
  SAID_BY,
  assertRecordFields,
  freeRecordId,
  recordIdBase,
  recordTitle,
  recordUpsertPayload,
} from "../../../src/operations/mutation/record.js";

const STATEMENT = "The quota page must list at most twenty client calls.";
const BASE: RecordInput = {
  statement: STATEMENT,
  why: "Slow links time out on long call lists.",
  saidBy: "maintainer",
  quote: "keep the quota page to twenty calls",
  code: [{ file: "src/quota.ts", symbol: "capCalls" }],
};

function refusal(run: () => unknown): KbRejection {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(KbRejection);
    return error as KbRejection;
  }
  throw new Error("expected a refusal");
}

describe("kb_record input fields", () => {
  test("its own fields are the six inputs and dryRun", () => {
    expect(RECORD_FIELDS).toEqual([
      "statement",
      "why",
      "saidBy",
      "quote",
      "code",
      "test",
      "dryRun",
    ]);
    expect(SAID_BY).toEqual(["user", "maintainer", "agent"]);
    expect(() =>
      assertRecordFields({ ...BASE, test: "TEST-x", dryRun: true }),
    ).not.toThrow();
  });

  test("a field of its own is never refused, nor an input without code", () => {
    expect(() => assertRecordFields({ statement: "s" })).not.toThrow();
    expect(() => assertRecordFields({ code: "not a list" })).not.toThrow();
  });

  test("a top-level field it does not take is refused, naming kb_upsert", () => {
    const error = refusal(() =>
      assertRecordFields({ ...BASE, relationships: [], properties: {} }),
    );
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.message).toBe(
      "kb_record does not take relationships, properties: it records a rule from its statement, why, saidBy, quote, code and test. Facts, relationships, proof contracts and other modeling go through kb_upsert.",
    );
    expect(error.issues).toEqual([
      { rule: "record_field_unsupported", field: "relationships" },
      { rule: "record_field_unsupported", field: "properties" },
    ]);
  });

  test("a field a code entry does not take is refused with the entry's index", () => {
    const error = refusal(() =>
      assertRecordFields({
        ...BASE,
        code: [
          { file: "a.ts", symbol: "a" },
          { file: "b.ts", symbol: "b", coveredBy: ["TEST-b"] },
        ],
      }),
    );
    expect(error.message).toStartWith(
      "kb_record does not take coveredBy in code[1]: it records",
    );
    expect(error.issues).toEqual([
      { rule: "record_field_unsupported", field: "coveredBy" },
    ]);
  });

  test("a code entry that is not an object has no fields to refuse", () => {
    expect(() => assertRecordFields({ code: [null, 7] })).not.toThrow();
  });
});

describe("kb_record title and id", () => {
  test("the title is the first sentence without its final stop", () => {
    expect(recordTitle(`  ${STATEMENT} It never pages.`)).toBe(
      "The quota page must list at most twenty client calls",
    );
    expect(recordTitle("Keys rotate yearly! Old ones expire.")).toBe(
      "Keys rotate yearly",
    );
    expect(recordTitle("Does it page? Yes.")).toBe("Does it page");
    expect(recordTitle("No stop at all")).toBe("No stop at all");
    expect(recordTitle("v1.2 is the floor")).toBe("v1.2 is the floor");
  });

  test("a title over the limit is cut at a word with an ellipsis", () => {
    const exact = "a".repeat(MAX_TITLE);
    expect(MAX_TITLE).toBe(100);
    expect(recordTitle(exact)).toBe(exact);
    const words = `${"word ".repeat(30)}end`;
    const cut = recordTitle(words);
    expect(cut).toBe(`${"word ".repeat(19).trimEnd()}…`);
    expect(cut.length).toBeLessThanOrEqual(MAX_TITLE);
    // One long word has no space to cut at.
    expect(recordTitle("x".repeat(150))).toBe(`${"x".repeat(99)}…`);
    // Leading space is trimmed before the cut.
    expect(recordTitle(` ${"y".repeat(150)}`)).toBe(`${"y".repeat(99)}…`);
  });

  test("the id is REQ- and the first six words that are not filler", () => {
    expect(ID_WORDS).toBe(6);
    expect(recordIdBase(STATEMENT)).toBe(
      "REQ-quota-page-list-most-twenty-client",
    );
    expect(
      recordIdBase(
        "A an and are as at be by for from in is it its must of on or shall should that the this to with keys rotate",
      ),
    ).toBe("REQ-keys-rotate");
    expect(recordIdBase("API_Keys v2 expire!")).toBe("REQ-api-keys-v2-expire");
    expect(recordIdBase("The — of")).toBe("REQ-rule");
    expect(recordIdBase("— …")).toBe("REQ-rule");
    // Long words are cut to 80 characters, never ending on a dash.
    expect(ID_CHARS).toBe(80);
    expect(recordIdBase(`${"x".repeat(300)} keys`)).toBe(
      `REQ-${"x".repeat(80)}`,
    );
    expect(recordIdBase(`${"y".repeat(79)} keys`)).toBe(
      `REQ-${"y".repeat(79)}`,
    );
  });

  test("the first free id is the base, else the base numbered from 2", async () => {
    const taken = new Set([
      "REQ-quota-page-list-most-twenty-client",
      "REQ-quota-page-list-most-twenty-client-2",
    ]);
    const asked: string[] = [];
    const id = await freeRecordId(STATEMENT, async (candidate) => {
      asked.push(candidate);
      return taken.has(candidate);
    });
    expect(id).toBe("REQ-quota-page-list-most-twenty-client-3");
    expect(asked).toEqual([
      "REQ-quota-page-list-most-twenty-client",
      "REQ-quota-page-list-most-twenty-client-2",
      "REQ-quota-page-list-most-twenty-client-3",
    ]);
    expect(await freeRecordId(STATEMENT, async () => false)).toBe(
      "REQ-quota-page-list-most-twenty-client",
    );
  });
});

describe("kb_record translates to one kb_upsert payload", () => {
  test("a rule a maintainer stated is a firm requirement of human origin", () => {
    expect(recordUpsertPayload(BASE, "REQ-x")).toEqual({
      type: "req",
      id: "REQ-x",
      properties: {
        title: "The quota page must list at most twenty client calls",
        status: "open",
        firmness: "firm",
        origin: { kind: "human", ref: "keep the quota page to twenty calls" },
      },
      document: { body: `${STATEMENT}\n` },
      why: "Slow links time out on long call lists.",
      implementedBy: [{ sourceFile: "src/quota.ts", symbol: "capCalls" }],
    });
  });

  test("a rule a user stated is firm too; without a quote it has no origin.ref", () => {
    const payload = recordUpsertPayload(
      { ...BASE, saidBy: "user", quote: undefined },
      "REQ-x",
    );
    expect(payload.properties.firmness).toBe("firm");
    expect(payload.properties.origin).toStrictEqual({ kind: "human" });
  });

  test("a rule the agent chose is default with agent origin", () => {
    const payload = recordUpsertPayload(
      { ...BASE, saidBy: "agent", statement: `  ${STATEMENT}  ` },
      "REQ-x",
    );
    expect(payload.properties.firmness).toBe("default");
    expect(payload.properties.origin).toEqual({
      kind: "agent",
      ref: "keep the quota page to twenty calls",
    });
    expect(payload.document).toEqual({ body: `${STATEMENT}\n` });
  });

  test("a test is the verified_by link and every symbol's covered_by link", () => {
    const payload = recordUpsertPayload(
      {
        ...BASE,
        code: [
          { file: "src/quota.ts", symbol: "capCalls" },
          { file: "src/page.ts", symbol: "render" },
        ],
        test: "TEST-quota-cap",
      },
      "REQ-x",
    );
    expect(payload.implementedBy).toEqual([
      {
        sourceFile: "src/quota.ts",
        symbol: "capCalls",
        coveredBy: ["TEST-quota-cap"],
      },
      {
        sourceFile: "src/page.ts",
        symbol: "render",
        coveredBy: ["TEST-quota-cap"],
      },
    ]);
    expect(payload.relationships).toEqual([
      { type: "verified_by", from: "REQ-x", to: "TEST-quota-cap" },
    ]);
  });

  test("it never sets approved_by, and dryRun is not part of the payload", () => {
    const payload = recordUpsertPayload(
      { ...BASE, test: "TEST-t", dryRun: true },
      "REQ-x",
    );
    expect(JSON.stringify(payload)).not.toContain("approved_by");
    expect(payload).not.toHaveProperty("dryRun");
  });
});
