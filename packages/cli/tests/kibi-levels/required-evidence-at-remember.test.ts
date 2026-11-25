/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// At level remember a tested or proved floor is reported, not enforced, and
// a write may not raise a floor to tested or proved.
import { afterEach, describe, expect, test } from "bun:test";
import { KbRejection } from "../../src/cli-errors.js";
import { assertRequiredEvidenceFitsLevel } from "../../src/operations/mutation/level-evidence-guard.js";
import type { StoredEntity } from "../../src/operations/mutation/stored-entity.js";
import type { UpsertInput } from "../../src/operations/mutation/types.js";
import {
  REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE,
  collectRequiredEvidenceAboveLevelViolations,
} from "../../src/public/operations/level-evidence.js";
import {
  getDefaultRules,
  getRuleDefinition,
} from "../../src/utils/rule-registry.js";
import {
  atLevel,
  cleanupLevelWorkspaces,
  levelWorkspace,
  requirementDoc,
} from "./workspace.js";

afterEach(cleanupLevelWorkspaces);

const RULES = new Set([REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE]);

function requirements(level: string): string {
  return atLevel(level, {
    ".kb/requirements/REQ-tested.md": requirementDoc("REQ-tested", {
      required_evidence: "tested",
    }),
    ".kb/requirements/REQ-proved.md": requirementDoc("REQ-proved", {
      required_evidence: "proved",
    }),
    ".kb/requirements/REQ-asserted.md": requirementDoc("REQ-asserted", {
      required_evidence: "asserted",
    }),
    ".kb/requirements/REQ-none.md": requirementDoc("REQ-none"),
    ".kb/requirements/REQ-retired.md": requirementDoc("REQ-retired", {
      status: "retired",
      required_evidence: "tested",
    }),
    ".kb/requirements/REQ-old.md": requirementDoc("REQ-old", {
      required_evidence: "tested",
    }),
    ".kb/requirements/REQ-new.md": `${requirementDoc("REQ-new")}`.replace(
      "status: open",
      "status: open\nlinks:\n  - type: supersedes\n    target: REQ-old",
    ),
    ".kb/facts/FACT-x.md":
      "---\nid: FACT-x\ntitle: x\ntype: fact\nrequired_evidence: tested\n---\n\nx\n",
  });
}

describe("required_evidence at level remember", () => {
  test("the rule is a non-blocking knowledge rule every level runs", () => {
    const rule = getRuleDefinition(REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE);
    expect(rule?.enforcementClass).toBe("advisory");
    expect(rule?.layer).toBe("knowledge");
    expect(getDefaultRules("remember").has(rule?.name ?? "")).toBe(true);
    expect(getDefaultRules("test").has(rule?.name ?? "")).toBe(true);
  });

  test("at remember each current requirement with a tested or proved floor is reported, naming the level", () => {
    const root = requirements("remember");
    const findings = collectRequiredEvidenceAboveLevelViolations(
      RULES,
      root,
      "remember",
    );
    expect(findings.map((finding) => finding.entityId)).toEqual([
      "REQ-proved",
      "REQ-tested",
    ]);
    expect(findings[1]).toEqual({
      rule: REQUIRED_EVIDENCE_ABOVE_LEVEL_RULE,
      entityId: "REQ-tested",
      description:
        "REQ-tested has required_evidence tested, but the project's Kibi level is remember, which does not check scenarios, tests or proofs, so this floor is not enforced.",
      suggestion:
        "Ask the person whether the project should move to Kibi level test (kibi.level in package.json, or level in .kb/setup.json), which enforces the floor. Do not change the level or the requirement's required_evidence yourself.",
      source: ".kb/requirements/REQ-tested.md",
    });
  });

  test("at test, or when the rule is not selected, nothing is reported", () => {
    const root = requirements("test");
    expect(
      collectRequiredEvidenceAboveLevelViolations(RULES, root, "test"),
    ).toEqual([]);
    expect(
      collectRequiredEvidenceAboveLevelViolations(new Set(), root, "remember"),
    ).toEqual([]);
    expect(
      collectRequiredEvidenceAboveLevelViolations(
        RULES,
        levelWorkspace(),
        "remember",
      ),
    ).toEqual([]);
  });
});

const lookupOf = (stored: StoredEntity) => ({
  exists: async () => stored !== undefined,
  entity: async () => stored,
});

function write(properties: Record<string, unknown>, type = "req"): UpsertInput {
  return {
    type,
    id: "REQ-floor",
    properties: { title: "Floor", status: "open", ...properties },
  } as UpsertInput;
}

async function refusal(promise: Promise<void>): Promise<KbRejection> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof KbRejection) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("kb_upsert and kb_record at level remember", () => {
  test("a write that raises required_evidence to tested or proved is refused, saying a person chooses test first", async () => {
    const root = atLevel("remember");
    const refused = await refusal(
      assertRequiredEvidenceFitsLevel(
        write({ required_evidence: "tested" }),
        root,
        "remember",
        lookupOf(undefined),
      ),
    );
    expect(refused.code).toBe("LEVEL_DOES_NOT_CHECK_EVIDENCE");
    expect(refused.message).toBe(
      "Entity validation failed: REQ-floor asks for required_evidence tested, but the project's Kibi level is remember, which checks no scenario, test or proof. A person chooses level test first (kibi.level in package.json); until then, write the requirement without required_evidence.",
    );
    expect(refused.issues).toEqual([
      { rule: "kibi_level", field: "properties.required_evidence" },
    ]);
    // tested to proved raises it too.
    await refusal(
      assertRequiredEvidenceFitsLevel(
        write({ required_evidence: "proved" }),
        root,
        "remember",
        lookupOf({ required_evidence: "tested" }),
      ),
    );
    // A store without a package.json names .kb/setup.json.
    const setup = await refusal(
      assertRequiredEvidenceFitsLevel(
        write({ required_evidence: "proved" }),
        levelWorkspace({ ".kb/setup.json": '{"level":"remember"}' }),
        "remember",
        lookupOf(null),
      ),
    );
    expect(setup.message).toContain("(level in .kb/setup.json)");
  });

  test("a write that keeps or lowers the floor, or sets none, is not judged", async () => {
    const root = atLevel("remember", {
      ".kb/requirements/REQ-floor.md": requirementDoc("REQ-floor", {
        required_evidence: "proved",
      }),
    });
    const authored = { source: ".kb/requirements/REQ-floor.md" };
    for (const properties of [
      { required_evidence: "proved" },
      { required_evidence: "tested" },
      { required_evidence: "asserted" },
      {},
    ])
      await assertRequiredEvidenceFitsLevel(
        write(properties),
        root,
        "remember",
        lookupOf(authored),
      );
    // The store's floor counts when the document cannot be read.
    await assertRequiredEvidenceFitsLevel(
      write({ required_evidence: "tested" }),
      root,
      "remember",
      lookupOf({
        source: ".kb/requirements/REQ-gone.md",
        required_evidence: "tested",
      }),
    );
    await assertRequiredEvidenceFitsLevel(
      write({ required_evidence: "tested" }),
      root,
      "remember",
      lookupOf({ source: "src/a.ts", required_evidence: "proved" }),
    );
  });

  test("at test, and for other entity types, nothing is refused", async () => {
    const root = atLevel("test");
    await assertRequiredEvidenceFitsLevel(
      write({ required_evidence: "proved" }),
      root,
      "test",
      lookupOf(undefined),
    );
    await assertRequiredEvidenceFitsLevel(
      write({ required_evidence: "proved" }, "fact"),
      root,
      "remember",
      lookupOf(undefined),
    );
    await assertRequiredEvidenceFitsLevel(
      write({ required_evidence: 3 }),
      root,
      "remember",
      lookupOf(undefined),
    );
  });
});
