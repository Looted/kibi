// implements REQ-search-answer-hygiene
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  authorQuotaRequirement,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * Consumer view of what a check evaluated: `kibi check` on the built CLI
 * says which rules ran and, for domain-contradictions, how many pairs of
 * requirement facts it compared, so "no violations" on an empty KB is never
 * read as a consistency result.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Evaluated = {
  rules: string[];
  domainContradictions?: { factPairsExamined: number };
};

describe("kibi check reports what it evaluated", () => {
  test("an empty KB evaluated the rule over zero fact pairs, and says so", () => {
    const ws = createConsumerWorkspace("kibi-check-evaluated-empty-");
    workspace = ws;
    ws.sync();
    const result = ws.json(["check"], { rules: ["domain-contradictions"] });
    const data = result.data as Json;
    expect(data.violations).toEqual([]);
    expect(data.evaluated).toEqual({
      rules: ["domain-contradictions"],
      domainContradictions: { factPairsExamined: 0 },
    });
    expect(data.count).toBe(0);
  }, 120_000);

  test("two requirements constraining the same subject are one compared pair, found or not", () => {
    const ws = createConsumerWorkspace("kibi-check-evaluated-pair-");
    workspace = ws;
    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-CALL",
      title: "Calls need remaining quota",
      prose: "The remaining call quota must be greater than 0.",
      factId: "FACT-QUOTA-POSITIVE",
      operator: "gt",
      value: 0,
    });
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-FREE-TIER",
      title: "Free-tier remaining quota is zero",
      prose: "The free-tier remaining call quota must equal 0.",
      factId: "FACT-QUOTA-ZERO",
      operator: "eq",
      value: 0,
    });
    ws.sync();

    const scoped = ws.json(["check"], {
      rules: ["domain-contradictions", "required-fields"],
    });
    const data = scoped.data as Json;
    const evaluated = data.evaluated as Evaluated;
    expect(evaluated.rules.sort()).toEqual([
      "domain-contradictions",
      "required-fields",
    ]);
    expect(evaluated.domainContradictions).toEqual({ factPairsExamined: 1 });
    expect(
      (data.violations as Array<{ rule: string }>).map((row) => row.rule),
    ).toContain("domain-contradictions");

    // A check that never selected the rule reports no pair count: the
    // number says what ran, not what the KB holds.
    const other = ws.json(["check"], { rules: ["required-fields"] });
    expect((other.data as Json).evaluated).toEqual({
      rules: ["required-fields"],
    });

    // kb_search says how many rows this page returned apart from the
    // ranking's total, so a capped page is never read as the whole answer.
    const search = ws.json(["search"], {
      query: "remaining call quota",
      limit: 1,
    });
    const page = search.data as Json;
    expect(page.returned).toBe(1);
    expect(page.count as number).toBeGreaterThan(1);
    expect(page.truncated).toBe(true);
  }, 300_000);
});
