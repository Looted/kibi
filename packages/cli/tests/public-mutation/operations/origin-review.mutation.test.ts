import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import {
  AGENT_REQUIREMENT_UNAPPROVED_RULE,
  EXCEPTION_APPROVAL_SELF_ATTESTED_RULE,
  EXCEPTION_UNAPPROVED_RULE,
  ORIGIN_REVIEW_RULES,
  REQUIREMENT_RATIONALE_MISSING_RULE,
  collectOriginReviewViolations,
  evaluateOriginReview,
  markdownHasRationaleSection,
  rationaleSectionReader,
} from "../../../src/public/operations/origin-review.js";
import type { PrologQueryResult } from "../../../src/public/operations/runtime-types.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-origin-review-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const req = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  type: "req",
  status: "open",
  ...fields,
});

const ids = (rows: readonly { entityId: string }[]) =>
  rows.map((row) => row.entityId);

describe("markdownHasRationaleSection", () => {
  test("reads headings of the body only", () => {
    const has = markdownHasRationaleSection;
    expect(has("Intro\n---\n## Why\n---\n")).toBe(true);
    expect(has("---\n# Why it is here\n---\nBody\n")).toBe(false);
    expect(has("---\r\n# Why it is here\r\n---\r\nBody\r\n")).toBe(false);
    expect(has("---\n# Why it is here\n---")).toBe(false);
    expect(has("---\n# Why it is here\n---  \nBody\n")).toBe(false);
    expect(has("---\na: 1\n---x\n## Why\n---\nBody\n")).toBe(false);
    expect(has("---\na: 1\n---\n# Why\n")).toBe(true);
    expect(has("Text # Why\n")).toBe(false);
    expect(has("#\tContext\n")).toBe(true);
    expect(has("###  Rationale\n")).toBe(true);
    expect(has("####### Why\n")).toBe(false);
    expect(has("# Whyever\n")).toBe(false);
  });
});

describe("rationaleSectionReader", () => {
  test("reads Markdown sources once and treats the rest as none", () => {
    const root = workspace({
      "docs/a.md": "# Why\n",
      "docs/b.txt": "# Why\n",
    });
    const read = rationaleSectionReader(root);
    expect(read({ source: " docs/a.md " })).toBe(true);
    expect(read({ source: "docs/b.txt" })).toBe(false);
    expect(read({ source: "docs/missing.md" })).toBe(false);
    expect(read({ source: "   " })).toBe(false);
    expect(read({})).toBe(false);
    rmSync(join(root, "docs/a.md"));
    expect(read({ source: "docs/a.md" })).toBe(true);
  });
});

describe("evaluateOriginReview", () => {
  test("reviews exceptions, agent requirements and rationale", () => {
    const findings = evaluateOriginReview({
      requirements: [
        req("REQ-z-unapproved", { approved_by: "  ", source: " docs/z.md " }),
        req("REQ-a-plain", {
          origin: { kind: "agent", approved_by: "lee" },
          approved_by: "kim",
        }),
        req("REQ-b-human-approved", {
          origin: { kind: "human" },
          approved_by: "kim",
        }),
        req("REQ-c-agent", {
          origin: { kind: "agent", ref: "session-1" },
          approved_by: " kim ",
          source: "docs/c.md",
        }),
        req("REQ-d-agent-ref", {
          origin: { kind: "agent", approved_by: "lee" },
          approved_by: "kim",
        }),
        req("REQ-e-agent", { origin: { kind: "agent" }, rationale: "Why." }),
        req("REQ-f-no-origin", { approved_by: "kim" }),
        req("REQ-g-retired", { status: "deprecated" }),
        req("REQ-h-spaced", {
          status: " in_progress ",
          origin: JSON.stringify({ kind: "human" }),
        }),
        req("REQ-q-corroborated", {
          origin: { kind: "agent", approved_by: "lee" },
          approved_by: "kim",
          approval_ref: "ADR-1",
          rationale: "Why.",
        }),
        req("REQ-i-closed", { status: "closed", origin: { kind: "human" } }),
        req("REQ-j-active", { status: "active", origin: { kind: "human" } }),
        req("REQ-k-approved", {
          status: "approved",
          origin: { kind: "human" },
        }),
        req("REQ-l-nostatus", { status: undefined, origin: { kind: "human" } }),
        req("REQ-m-superseded", { origin: { kind: "human" } }),
        req("REQ-n-imported", { origin: { kind: "import" } }),
        req("REQ-o-adr", { origin: { kind: "human" } }),
        req("REQ-p-section", { origin: { kind: "human" } }),
      ],
      exempts: [
        ["REQ-z-unapproved", "REQ-base-b"],
        ["REQ-z-unapproved", "REQ-base-a"],
        ["REQ-z-unapproved", "REQ-base-b"],
        ["REQ-a-plain", "REQ-base-a"],
        ["REQ-b-human-approved", "REQ-base-a"],
        ["REQ-c-agent", "REQ-base-b"],
        ["REQ-c-agent", "REQ-base-a"],
        ["REQ-d-agent-ref", "REQ-base-a"],
        ["REQ-f-no-origin", "REQ-base-a"],
        ["REQ-g-retired", "REQ-base-a"],
        ["REQ-q-corroborated", "REQ-base-a"],
      ],
      superseded: new Set(["REQ-m-superseded"]),
      adrLinked: new Set(["REQ-o-adr"]),
      hasRationaleSection: (entity) => entity.id === "REQ-p-section",
    });
    expectGolden("origin-review-findings", findings);
    expect(
      findings.map((row) => Object.hasOwn(row, "source") && row.source),
    ).toEqual(
      findings.map((row) =>
        row.entityId === "REQ-z-unapproved"
          ? "docs/z.md"
          : row.entityId === "REQ-c-agent"
            ? "docs/c.md"
            : false,
      ),
    );
  });

  test("keeps to the selected rules", () => {
    const input = {
      requirements: [
        req("REQ-x", { origin: { kind: "agent" } }),
        req("REQ-y", { origin: { kind: "agent" }, approved_by: "kim" }),
      ],
      exempts: [
        ["REQ-y", "REQ-base"],
        ["REQ-x", "REQ-base"],
      ] as const,
      superseded: new Set<string>(),
    };
    const only = (rule: string) =>
      evaluateOriginReview(input, new Set([rule])).map(
        (row) => `${row.rule} ${row.entityId}`,
      );
    expect(only(EXCEPTION_UNAPPROVED_RULE)).toEqual([
      "exception-unapproved REQ-x",
    ]);
    expect(only(EXCEPTION_APPROVAL_SELF_ATTESTED_RULE)).toEqual([
      "exception-approval-self-attested REQ-y",
    ]);
    expect(only(AGENT_REQUIREMENT_UNAPPROVED_RULE)).toEqual([
      "agent-requirement-unapproved REQ-x",
      "agent-requirement-unapproved REQ-y",
    ]);
    expect(only(REQUIREMENT_RATIONALE_MISSING_RULE)).toEqual([
      "requirement-rationale-missing REQ-x",
      "requirement-rationale-missing REQ-y",
    ]);
  });

  test("lists up to the limit and then summarizes", () => {
    const many = (count: number) =>
      evaluateOriginReview({
        requirements: Array.from({ length: count }, (_, index) =>
          req(`REQ-${String(index).padStart(2, "0")}`, {
            origin: { kind: "agent" },
          }),
        ),
        exempts: [],
        superseded: new Set(),
      });
    expect(many(25)).toHaveLength(50);
    const over = many(27);
    expect(over).toHaveLength(52);
    expect(ids(over).filter((id) => id === "workspace")).toHaveLength(2);
    expectGolden(
      "origin-review-summaries",
      over.filter((row) => row.entityId === "workspace"),
    );
  });
});

describe("collectOriginReviewViolations", () => {
  const answer = (rows: string | undefined): PrologQueryResult => ({
    success: true,
    bindings: rows === undefined ? {} : { Rows: rows },
  });

  test("does nothing without a review rule", async () => {
    const load = spyOn(entities, "loadEntitiesPaged");
    spies.push(load);
    const prolog = { query: async () => answer("[]") };
    expect(
      await collectOriginReviewViolations(prolog, new Set(["other"])),
    ).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  test("reads exempts, supersedes and ADR links from one query", async () => {
    const root = workspace({ "docs/s.md": "## Rationale\n" });
    const load = spyOn(entities, "loadEntitiesPaged").mockResolvedValue([
      req("REQ-ex", { origin: { kind: "human" } }),
      req("REQ-old", { origin: { kind: "human" } }),
      req("REQ-adr", { origin: { kind: "human" } }),
      req("REQ-section", { origin: { kind: "human" }, source: "docs/s.md" }),
      req("REQ-plain", { origin: { kind: "human" } }),
    ]);
    spies.push(load);
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string) => {
        goals.push(goal);
        return answer(
          "[[exempts,'REQ-ex','REQ-base'],[supersedes,'REQ-new','REQ-old'],[adr_link,'REQ-adr','ADR-1'],[relates_to,'REQ-plain','REQ-ex'],[exempts]]",
        );
      },
    };
    const all = new Set(ORIGIN_REVIEW_RULES);
    expectGolden(
      "origin-review-collected",
      (await collectOriginReviewViolations(prolog, all, root)).map(
        (row) => `${row.rule} ${row.entityId}`,
      ),
    );
    expect(load).toHaveBeenCalledWith(prolog, "req");
    expect(goals).toEqual([
      "findall([Type,From,To], ((member(Type, [exempts, supersedes]), kb_relationship(Type, From, To)) ; (Type = adr_link, kb_entity(To, adr, _), kibi_relationships:relationship_type(Rel), (kb_relationship(Rel, To, From) ; kb_relationship(Rel, From, To)), kb_entity(From, req, _))), Rows)",
    ]);
    expect(
      ids(await collectOriginReviewViolations(prolog, all)).filter(
        (id) => id === "REQ-section",
      ),
    ).toEqual(["REQ-section"]);
    expect(
      ids(
        await collectOriginReviewViolations(
          prolog,
          new Set([EXCEPTION_UNAPPROVED_RULE]),
          root,
        ),
      ),
    ).toEqual(["REQ-ex"]);
    const bare = { query: async () => answer(undefined) };
    expect(
      await collectOriginReviewViolations(
        bare,
        new Set([EXCEPTION_UNAPPROVED_RULE]),
        root,
      ),
    ).toEqual([]);
  });

  test("surfaces a failing relationship query", async () => {
    spies.push(spyOn(entities, "loadEntitiesPaged").mockResolvedValue([]));
    const fail = (error?: string) => ({
      query: async () =>
        ({
          success: false,
          bindings: {},
          ...(error === undefined ? {} : { error }),
        }) as PrologQueryResult,
    });
    const rules = new Set(ORIGIN_REVIEW_RULES);
    await expect(collectOriginReviewViolations(fail(), rules)).rejects.toThrow(
      "Unable to read exempts, supersedes and ADR relationships: query failed",
    );
    await expect(
      collectOriginReviewViolations(fail("boom"), rules),
    ).rejects.toThrow(
      "Unable to read exempts, supersedes and ADR relationships: boom",
    );
  });
});
