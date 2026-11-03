import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { handleKbSuggestPredicates } from "../../../src/operations/modeling/suggest-predicates.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import * as orchestration from "../../../src/operations/semantic-advisor/plugin-orchestration.js";
import * as discoveryExecutors from "../../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../../helpers/what-if.js";
import { type FakeEntity, context, scratch } from "../helpers.js";

const TEXT =
  "The editor must save changes automatically when the user navigates away.";
const CLAIM = semanticClaimKey(TEXT);
const CANONICAL = "commit_action(editor.autosave,navigation,changes)";
const FACT = "FACT-PRED-5BBD31A6099C";

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const ledgerRow = (claimKey: string) => ({
  claim_key: claimKey,
  claim_text: TEXT,
  role: "normative",
  status: "ontology_gap",
  span: { start: 0, end: TEXT.length },
});
const requirement = (extra: Record<string, unknown> = {}): FakeEntity =>
  Object.fromEntries(
    Object.entries({
      id: "REQ-auto",
      type: "req",
      title: "Autosave",
      status: "open",
      semantic_text: TEXT,
      semantic_inventory: JSON.stringify([ledgerRow(CLAIM)]),
      ...extra,
    }).filter(([, value]) => value !== undefined),
  ) as FakeEntity;

type Handler = (goal: string) => Record<string, unknown> | undefined;
function kb(
  entities: FakeEntity[],
  options: { handle?: Handler; withClock?: boolean; fs?: boolean } = {},
): OperationContext {
  spies.push(
    spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
      content: [],
      structuredContent: { branch: "develop", snapshotId: "missing" },
    } as never),
  );
  let root = "/nonexistent-kibi-workspace";
  if (options.fs) {
    const workspace = scratch({ ".kb/.keep": "" });
    cleanups.push(workspace.cleanup);
    root = workspace.root;
  }
  const base = context(root, entities, (goal) => {
    const handled = options.handle?.(goal);
    if (handled !== undefined) return handled;
    if (isWhatIfGoal(goal)) return whatIfResult();
    if (goal.includes("kb_relationship("))
      return {
        success: true,
        bindings: { Targets: "[]", Keys: "['editor.autosave']" },
      };
    return undefined;
  });
  return {
    ...base,
    ...(options.withClock === false ? {} : { clock: () => new Date(0) }),
    ...(options.fs ? { fs: nodeFilesystem } : {}),
  } as OperationContext;
}

const suggest = (ctx: OperationContext, args: Record<string, unknown> = {}) =>
  handleKbSuggestPredicates(
    ctx.prolog as never,
    {
      text: TEXT,
      requirementId: "REQ-auto",
      maxCandidates: 1,
      includeExistingSchemas: false,
      ...args,
    },
    ctx,
  ).then((result) => result.structuredContent);

describe("hash-bound grounding plans", () => {
  test("plans the fact and the link, merging the stored manifest", async () => {
    const data = await suggest(
      kb([requirement({ logic_claims: ["CLAIM-0000000000000001", 7] })]),
    );
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.logicClaims).toStrictEqual(["CLAIM-0000000000000001", CLAIM]);
    const plan = data.plan as {
      status: string;
      steps: Record<string, unknown>[];
    };
    expect(plan.status).toBe("ready");
    expect(plan.steps[1]).toMatchObject({
      type: "req",
      id: "REQ-auto",
      properties: {
        logic_claims: ["CLAIM-0000000000000001", CLAIM],
        semantic_inventory: [
          {
            ...ledgerRow(CLAIM),
            status: "modeled",
            reason: `Grounded by the ${FACT} predicate fact this plan writes.`,
          },
        ],
      },
      relationships: [
        { type: "requires_predicate", from: "REQ-auto", to: FACT },
      ],
    });
  });

  test("warns when the plan would contradict the KB", async () => {
    const data = await suggest(
      kb([requirement()], {
        handle: (goal) =>
          isWhatIfGoal(goal)
            ? whatIfResult({
                introduced: [
                  { requirements: ["REQ-auto"], reason: "autosave clashes" },
                  { requirements: ["REQ-auto"], reason: "" },
                ],
              })
            : undefined,
      }),
    );
    expect((data.plan as { status: string }).status).toBe("blocked");
    expect(data.warnings).toContain(
      "Applying this grounding would contradict the current KB, so plan.status is blocked: autosave clashes. Supersede or close the conflicting requirement before grounding this claim.",
    );
  });

  test("warns when the plan needs resolution", async () => {
    const data = await suggest(
      kb([requirement({ status: "not-a-status" })], { fs: true }),
    );
    expect((data.plan as { status: string }).status).toBe("needs_resolution");
    expect(
      data.warnings.some((line: string) =>
        line.startsWith(
          "The hash-bound plan needs resolution before kb_apply_plan can run it: A plan step cannot be applied as written:",
        ),
      ),
    ).toBe(true);
  });

  test("reports a plan that could not be compiled", async () => {
    const data = await suggest(kb([requirement()], { withClock: false }));
    expect(data.plan).toBeNull();
    expect(data.warnings[0]).toStartWith(
      "No hash-bound plan could be compiled (",
    );
  });

  test("plans for a requirement without a ledger, keeping other ledger rows", async () => {
    const unledgered = await suggest(
      kb([requirement({ semantic_inventory: undefined })]),
    );
    expect((unledgered.plan as { status: string }).status).toBe("ready");
    const other = ledgerRow("CLAIM-0000000000000004");
    const data = await suggest(
      kb([
        requirement({
          semantic_inventory: JSON.stringify([other, ledgerRow(CLAIM)]),
        }),
      ]),
    );
    const steps = (
      data.plan as {
        steps: { properties: { semantic_inventory: unknown[] } }[];
      }
    ).steps;
    expect(steps[1]?.properties.semantic_inventory[0]).toStrictEqual(other);
  });

  test("plans nothing for a requirement that is not stored", async () => {
    for (const entities of [[], [requirement({ title: 5 })]]) {
      const data = await suggest(kb(entities));
      expect(data.plan).toBeNull();
      expect(data.warnings).toContain(
        "No hash-bound plan: requirement REQ-auto is not stored, so its upsert step cannot restate the stored title and status. Apply applyPlan and relationshipPlan with kb_upsert.",
      );
    }
  });

  test("asks to extend a requirement whose ledger lacks the claim", async () => {
    const data = await suggest(
      kb([
        requirement({
          semantic_inventory: JSON.stringify([
            ledgerRow("CLAIM-0000000000000002"),
          ]),
        }),
      ]),
    );
    expect(data.recommendedAction).toBe("extend_requirement");
    expect(data.warnings).toContain(
      `The proposition ledger of REQ-auto has no claim ${CLAIM} for this text, so the requirement cannot ground it: a requirement grounds only the propositions its prose states. No fact was planned, because it would be written without a link. Extend the requirement's prose with this clause (kb_model mode requirement, or kb_upsert with the extended semantic_text and the ledger kb_model mode analyze returns), then call mode predicates again.`,
    );
  });
});

describe("reads that fail", () => {
  const throwing =
    (fragment: string): Handler =>
    (goal) => {
      if (goal.includes(fragment)) throw new Error("store offline");
      return undefined;
    };

  test("warn about unreadable subjects, grounding and requirement", async () => {
    const subjects = await suggest(
      kb([requirement()], { handle: throwing("kb_relationship(constrains") }),
    );
    expect(subjects.warnings).toContain(
      "The subject facts REQ-auto constrains could not be read (store offline); pass subjectHint with the requirement's subject_key.",
    );
    const grounding = await suggest(
      kb([requirement()], { handle: throwing("requires_property") }),
    );
    expect(grounding.warnings).toContain(
      "Existing grounding of REQ-auto could not be read (store offline); check its requires_property, requires_predicate and requires_rule links before linking a predicate.",
    );
    const stored = await suggest(
      kb([requirement()], { handle: throwing("kb_entity('REQ-auto'") }),
    );
    expect(stored.warnings).toContain(
      "Requirement REQ-auto could not be read (store offline); add its stored title and status to the last replacementPlan step before applying it.",
    );
  });
});

describe("decision conflicts without a plan", () => {
  const rows =
    (Rows: string): Handler =>
    (goal) =>
      goal.includes("decision_signatures")
        ? { success: true, bindings: { Rows } }
        : undefined;

  test("names each stored decision the candidate would contradict", async () => {
    const data = await suggest(
      kb([], {
        handle: rows(
          "['REQ-b|FACT-b|deny|allow','broken','REQ-a|FACT-a|deny|allow']",
        ),
      }),
      { requirementId: undefined, subjectHint: "editor.autosave" },
    );
    expect(data.decisionConflicts).toStrictEqual([
      {
        requirementId: "REQ-a",
        factId: "FACT-a",
        effect: "deny",
        proposedEffect: "allow",
        canonicalKey: CANONICAL,
      },
      {
        requirementId: "REQ-b",
        factId: "FACT-b",
        effect: "deny",
        proposedEffect: "allow",
        canonicalKey: CANONICAL,
      },
    ]);
    expect(data.warnings).toContain(
      `The proposed ${CANONICAL} (allow) contradicts FACT-a (deny) under REQ-a: both decide commit_action on the same key arguments. kb_upsert refuses a grounding link that introduces this conflict; supersede or close the conflicting requirement, or correct the decision, before applying.`,
    );
    const own = await suggest(
      kb([], { handle: rows("['REQ-auto|FACT-a|deny|allow']") }),
    );
    expect(own.warnings.join("\n")).toContain(
      "under REQ-auto, the requirement this claim would ground:",
    );
  });

  test("warns when the decisions cannot be read", async () => {
    const data = await suggest(
      kb([], {
        handle: (goal) => {
          if (goal.includes("decision_signatures"))
            throw new Error("no signatures");
          return undefined;
        },
      }),
      { requirementId: undefined, subjectHint: "editor.autosave" },
    );
    expect(data.warnings).toContain(
      `Decision conflicts for ${CANONICAL} could not be read (no signatures); preview the grounding with kb_upsert dryRun and plannedFacts before applying.`,
    );
  });
});

describe("existing grounding", () => {
  const grounded =
    (claimKey: string, canonicalKey: string): Handler =>
    (goal) => {
      if (goal.includes("kb_relationship(requires_property, 'REQ-auto'"))
        return { success: true, bindings: { Targets: "['FACT-old']" } };
      if (goal.includes("kb_entity('FACT-old'"))
        return {
          success: true,
          bindings: {
            ClaimKey: `'${claimKey}'`,
            FactKind: "property_value",
            CanonicalKey: `'${canonicalKey}'`,
          },
        };
      return undefined;
    };

  test("keeps a grounding of the same predicate tuple", async () => {
    const data = await suggest(
      kb([requirement()], {
        handle: grounded("CLAIM-0000000000000003", CANONICAL),
      }),
    );
    expect(data.recommendedAction).toBe("keep_existing_grounding");
    expect(data.warnings).toContain(
      `REQ-auto already grounds the predicate ${CANONICAL} through requires_property -> FACT-old (matched by canonical_key; its claim_key CLAIM-0000000000000003 differs from this text's ${CLAIM}). Keep that grounding: no fact or link is needed. If this text is a further proposition of the requirement, extend its prose and run kb_model mode analyze before grounding it separately.`,
    );
  });

  test("restates the stored requirement in the replacement plan", async () => {
    const data = await suggest(
      kb([requirement({ priority: "must" })], { handle: grounded(CLAIM, "") }),
    );
    expect(data.recommendedAction).toBe("replace_grounding");
    const steps = data.replacementPlan as {
      steps?: Record<string, unknown>[];
    } | null;
    expect(JSON.stringify(steps)).toContain('"priority":"must"');
  });
});

describe("ontology pack catalogs", () => {
  test("adds pack schemas and reports catalog diagnostics", async () => {
    spies.push(
      spyOn(
        orchestration,
        "composeOntologyCatalogForOperation",
      ).mockResolvedValue({
        schemas: [
          {
            schemaId: "PACK-one",
            predicateName: "pack_rule",
            argumentNames: ["subject"],
            argumentTypes: ["entity"],
            aliases: ["pack rule"],
          },
          {
            schemaId: "PACK-two",
            predicateName: "pack_other",
            title: "Pack other",
            description: "Another pack schema",
            argumentNames: [],
            argumentTypes: [],
          },
        ],
        diagnostics: ["pack catalog is partial"],
        replaced: false,
      } as never),
    );
    const data = await suggest(kb([requirement()]), {
      maxCandidates: 20,
      minScore: 0,
    });
    expect(data.warnings).toContain("pack catalog is partial");
  });
});
