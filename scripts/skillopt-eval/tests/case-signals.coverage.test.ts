import { describe, expect, test } from "bun:test";
import {
  type CaseSignalContext,
  caseForbiddenObserved,
  caseSignalObserved,
  currentRequirementIds,
  relationshipTargets,
  resultPayload,
  supersededRequirementIds,
  workspaceAssertionPasses,
} from "../runtime/case-signals";
import {
  JOINT_CONTRADICTION_CORE,
  JOINT_CONTRADICTION_IDS,
  PRECONDITION_IDS,
  PRECONDITION_INTENT,
  UNRESOLVED_RULE_IDS,
} from "../runtime/fixture-seeds";
import type { KibiAnswer } from "../runtime/transcript-evidence";

type Entity = Record<string, unknown>;

const NO_ANSWER: KibiAnswer = {
  source: "none",
  verdict: null,
  governing: [],
  conflict: null,
  unknowns: [],
  nextStep: null,
  proof: null,
};

function context(
  overrides: Readonly<{
    text?: string;
    answer?: Partial<KibiAnswer>;
    entities?: readonly Entity[];
    rows?: readonly Entity[];
    brokerTools?: readonly string[];
    ordering?: Partial<CaseSignalContext["ordering"]>;
    workspaceFiles?: Record<string, string>;
    workspaceAssertions?: CaseSignalContext["workspaceAssertions"];
  }> = {},
): CaseSignalContext {
  return {
    results: [
      { tool: "kb_query", result: { entities: ["skip"] } },
      { tool: "kb_status", result: {} },
      {
        tool: "kb_query",
        result: {
          structuredContent: {
            kibiProtocol: 1,
            data: { entities: [...(overrides.entities ?? []), "not a record"] },
          },
        },
      },
      {
        tool: "kb_coverage",
        result: { structured_content: { rows: overrides.rows ?? [] } },
      },
    ],
    brokerTools: overrides.brokerTools ?? [],
    answer: {
      text: overrides.text ?? "",
      answer: { ...NO_ANSWER, ...overrides.answer },
    },
    ordering: {
      firstKbSearchIndex: null,
      firstEditIndex: null,
      kibiCallsBeforeFirstEdit: 0,
      editedPaths: [],
      ...overrides.ordering,
    },
    workspaceFiles: overrides.workspaceFiles ?? {},
    workspaceAssertions: overrides.workspaceAssertions ?? [],
  };
}

const signal = (name: string, ctx: CaseSignalContext) =>
  caseSignalObserved(name, ctx);
const forbidden = (name: string, ctx: CaseSignalContext) =>
  caseForbiddenObserved(name, ctx);

describe("case signal helpers", () => {
  test("reads result payloads in every envelope shape", () => {
    expect(resultPayload("x")).toBeNull();
    expect(resultPayload({ a: 1 })).toStrictEqual({ a: 1 });
    expect(resultPayload({ structuredContent: { b: 2 } })).toStrictEqual({
      b: 2,
    });
    expect(
      resultPayload({ structuredContent: { kibiProtocol: 1, data: { c: 3 } } }),
    ).toStrictEqual({ c: 3 });
    expect(
      resultPayload({ structuredContent: { kibiProtocol: 1, data: [] } }),
    ).toStrictEqual({ kibiProtocol: 1, data: [] });
  });

  test("relationship targets drop the entity prefix and non-strings", () => {
    expect(relationshipTargets("kb:entity/REQ-a")).toStrictEqual(["REQ-a"]);
    expect(relationshipTargets(["REQ-b", 3, "kb:entity/REQ-c"])).toStrictEqual([
      "REQ-b",
      "REQ-c",
    ]);
  });

  test("current requirements exclude superseded and closed ones", () => {
    const ctx = context({
      entities: [
        { type: "req", id: "REQ-new", status: "open", supersedes: "REQ-old" },
        { type: "req", id: "REQ-old", status: "open" },
        { type: "req", id: "REQ-closed", status: "closed" },
        { type: "req", id: "REQ-wip", status: "in_progress" },
        { type: "req", status: "open" },
        { type: "adr", id: "ADR-1" },
      ],
    });
    expect([...supersededRequirementIds(ctx)].sort()).toStrictEqual([
      "REQ-closed",
      "REQ-old",
    ]);
    expect([...currentRequirementIds(ctx)].sort()).toStrictEqual([
      "REQ-new",
      "REQ-wip",
    ]);
  });

  test("workspace assertions handle missing files and invalid patterns", () => {
    const files = { "src/a.ts": "const limit = 30;" };
    const assertion = (
      fields: Partial<Parameters<typeof workspaceAssertionPasses>[0]>,
    ) => ({
      key: "k",
      path: "src/a.ts",
      pattern: "limit",
      expectMatch: true,
      ...fields,
    });
    expect(workspaceAssertionPasses(assertion({}), files)).toBe(true);
    expect(
      workspaceAssertionPasses(
        assertion({ pattern: "LIMIT", flags: "i" }),
        files,
      ),
    ).toBe(true);
    expect(
      workspaceAssertionPasses(assertion({ expectMatch: false }), files),
    ).toBe(false);
    expect(workspaceAssertionPasses(assertion({ pattern: "(" }), files)).toBe(
      false,
    );
    expect(
      workspaceAssertionPasses(assertion({ path: "src/b.ts" }), files),
    ).toBe(false);
    expect(
      workspaceAssertionPasses(
        assertion({ path: "src/b.ts", expectMatch: false }),
        files,
      ),
    ).toBe(true);
  });
});

describe("case-owned required signals", () => {
  test("answer presence, block source and ordering signals", () => {
    expect(signal("final answer present", context({ text: " " }))).toBe(false);
    expect(signal("final answer present", context({ text: "done" }))).toBe(
      true,
    );
    expect(
      signal(
        "kibi-answer block emitted",
        context({ answer: { source: "block" } }),
      ),
    ).toBe(true);
    const order = (ordering: Partial<CaseSignalContext["ordering"]>) =>
      context({ ordering });
    expect(signal("kb lookup before first source edit", order({}))).toBe(false);
    expect(
      signal(
        "kb lookup before first source edit",
        order({ firstKbSearchIndex: 2 }),
      ),
    ).toBe(true);
    expect(
      signal(
        "kb lookup before first source edit",
        order({ firstKbSearchIndex: 2, firstEditIndex: 1 }),
      ),
    ).toBe(false);
    expect(
      signal(
        "kb lookup before first source edit",
        order({ firstKbSearchIndex: 1, firstEditIndex: 2 }),
      ),
    ).toBe(true);
    expect(signal("bounded consultation before first edit", order({}))).toBe(
      false,
    );
    for (const [calls, expected] of [
      [0, false],
      [1, true],
      [2, true],
      [3, false],
    ] as const) {
      expect(
        signal(
          "bounded consultation before first edit",
          order({ firstEditIndex: 4, kibiCallsBeforeFirstEdit: calls }),
        ),
      ).toBe(expected);
    }
    expect(signal("source edit landed", order({ firstEditIndex: 0 }))).toBe(
      true,
    );
    expect(signal("source edit landed", order({}))).toBe(false);
  });

  test("governing, conflict and supersession signals", () => {
    const entities = [
      { type: "req", id: "REQ-cur", status: "open" },
      { type: "req", id: "REQ-gone", status: "deprecated" },
      { type: "adr", id: "ADR-why" },
    ];
    expect(
      signal(
        "current governing requirement cited",
        context({ entities, answer: { governing: ["REQ-gone", "REQ-cur"] } }),
      ),
    ).toBe(true);
    expect(
      signal(
        "current governing requirement cited",
        context({ entities, answer: { governing: ["REQ-gone"] } }),
      ),
    ).toBe(false);
    expect(
      signal(
        "governing conflict reported",
        context({ answer: { verdict: "conflict" } }),
      ),
    ).toBe(true);
    for (const [conflict, expected] of [
      [null, false],
      ["None.", false],
      ["no", false],
      ["REQ-a vs REQ-b", true],
    ] as const) {
      expect(
        signal(
          "governing conflict reported",
          context({ answer: { conflict } }),
        ),
      ).toBe(expected);
    }
    expect(
      signal(
        "superseded requirement reported as superseded",
        context({ entities, text: "REQ-gone was superseded" }),
      ),
    ).toBe(true);
    expect(
      signal(
        "superseded requirement reported as superseded",
        context({ entities, text: "REQ-gone was closed" }),
      ),
    ).toBe(false);
    expect(
      signal("verdict governed", context({ answer: { verdict: "governed" } })),
    ).toBe(true);
    expect(
      signal("rationale ADR cited", context({ entities, text: "ADR-why" })),
    ).toBe(true);
    expect(
      signal("rationale ADR cited", context({ entities, text: "none" })),
    ).toBe(false);
  });

  test("proof state must agree with the coverage rows of current governing requirements", () => {
    const entities = [
      { type: "req", id: "REQ-a", status: "open" },
      { type: "req", id: "REQ-b", status: "open" },
    ];
    const rows = [
      { id: "REQ-a", proofStatus: "tested" },
      { id: "REQ-b", proofStatus: "untested" },
      "not a row",
    ];
    const proof = (value: string | null, governing: string[]) =>
      signal(
        "answer proof state matches coverage",
        context({
          entities,
          rows: rows as Entity[],
          answer: { proof: value, governing },
        }),
      );
    expect(proof(null, ["REQ-a"])).toBe(false);
    expect(proof("tested", ["REQ-x"])).toBe(false);
    expect(proof("tested", ["REQ-a"])).toBe(true);
    expect(proof("unresolved", ["REQ-a"])).toBe(false);
    expect(proof("not_tested", ["REQ-b"])).toBe(true);
    expect(proof("tested", ["REQ-b"])).toBe(false);
    expect(proof("vibes", ["REQ-b"])).toBe(false);
  });

  test("no-knowledge, search, coverage and incomplete analysis signals", () => {
    expect(
      signal(
        "verdict no_knowledge",
        context({ answer: { verdict: "no_knowledge" } }),
      ),
    ).toBe(true);
    expect(
      signal("searches reported", context({ text: "I searched twice" })),
    ).toBe(true);
    expect(signal("searches reported", context({ text: "research" }))).toBe(
      false,
    );
    expect(
      signal("coverage consulted", context({ brokerTools: ["kb_coverage"] })),
    ).toBe(true);
    expect(signal("coverage consulted", context())).toBe(false);
    for (const [verdict, expected] of [
      [null, false],
      ["unknown", true],
      ["conflict", false],
    ] as const) {
      expect(
        signal(
          "incomplete analysis reported",
          context({ answer: { verdict } }),
        ),
      ).toBe(expected);
    }
  });

  test("unchecked claims must all be reported by key or text", () => {
    const entities = [
      {
        type: "req",
        id: "REQ-a",
        semantic_inventory: [
          { status: "ontology_gap", claim_key: "CLAIM-ONE" },
          { status: "ambiguous", claim_text: "Resets are reviewed" },
          { status: "checked", claim_key: "CLAIM-IGNORED" },
          "noise",
        ],
      },
      { type: "req", id: "REQ-b" },
    ];
    expect(
      signal(
        "unchecked claim reported",
        context({ entities, text: "claim-one and resets are reviewed" }),
      ),
    ).toBe(true);
    expect(
      signal(
        "unchecked claim reported",
        context({ entities, text: "claim-one" }),
      ),
    ).toBe(false);
    expect(signal("unchecked claim reported", context({ text: "x" }))).toBe(
      false,
    );
    expect(
      signal(
        "unchecked claim reported",
        context({
          entities: [
            {
              type: "req",
              semantic_inventory: [{ status: "ambiguous" }],
            },
          ],
          text: "x",
        }),
      ),
    ).toBe(false);
  });

  test("unresolved pair, joint contradiction and unit-mixed signals", () => {
    const both = `${UNRESOLVED_RULE_IDS.settledAmount} ${UNRESOLVED_RULE_IDS.chargeback}`;
    expect(
      signal(
        "unresolved pair reported",
        context({ answer: { verdict: "unresolved" }, text: both }),
      ),
    ).toBe(true);
    expect(
      signal(
        "unresolved pair reported",
        context({
          answer: { verdict: "unresolved" },
          text: UNRESOLVED_RULE_IDS.settledAmount,
        }),
      ),
    ).toBe(false);
    expect(
      signal(
        "joint contradiction core reported",
        context({
          answer: { verdict: "conflict" },
          text: JOINT_CONTRADICTION_CORE.join(", "),
        }),
      ),
    ).toBe(true);
    expect(
      signal(
        "joint contradiction core reported",
        context({
          answer: { verdict: "conflict" },
          text: JOINT_CONTRADICTION_CORE[0],
        }),
      ),
    ).toBe(false);
    for (const [nextStep, expected] of [
      [null, false],
      ["Relax the ceiling", true],
      ["wait", false],
    ] as const) {
      expect(
        signal(
          "supersede or change step reported",
          context({ answer: { nextStep } }),
        ),
      ).toBe(expected);
    }
    const window = `${JOINT_CONTRADICTION_IDS.windowMax} ${JOINT_CONTRADICTION_IDS.windowMin}`;
    expect(
      signal(
        "unit-mixed pair reported unresolved",
        context({ answer: { verdict: "unresolved" }, text: window }),
      ),
    ).toBe(true);
    expect(
      signal(
        "unit-mixed pair reported unresolved",
        context({ answer: { verdict: null }, text: window }),
      ),
    ).toBe(false);
    expect(
      signal("resolving step reported", context({ answer: { nextStep: " " } })),
    ).toBe(false);
    expect(
      signal(
        "resolving step reported",
        context({ answer: { nextStep: "Ask" } }),
      ),
    ).toBe(true);
    expect(signal("resolving step reported", context())).toBe(false);
    expect(
      signal(
        "no conflict reported",
        context({ answer: { verdict: "consistent" } }),
      ),
    ).toBe(true);
    expect(signal("no conflict reported", context())).toBe(false);
  });

  test("precondition exception signals", () => {
    expect(
      signal(
        "requirement and both options reported",
        context({
          text: `${PRECONDITION_IDS.base}: reject it or add an exemption`,
        }),
      ),
    ).toBe(true);
    expect(
      signal(
        "requirement and both options reported",
        context({ text: `${PRECONDITION_IDS.base}: reject it` }),
      ),
    ).toBe(false);
    const entities = [
      {
        type: "req",
        id: "REQ-exception",
        exempts: [`kb:entity/${PRECONDITION_IDS.base}`],
        approved_by: "ops",
        specified_by: ["SCEN-ok"],
      },
      { type: "req", id: "REQ-other", exempts: "REQ-unrelated" },
      { type: "scenario", id: "SCEN-ok", expects: "success" },
      { type: "scenario", id: "SCEN-new-reject", expects: "rejection" },
    ];
    expect(signal("approved exception recorded", context({ entities }))).toBe(
      true,
    );
    expect(signal("approved exception recorded", context())).toBe(false);
    expect(
      signal("exception scenario expects success", context({ entities })),
    ).toBe(true);
    expect(
      signal(
        "exception scenario expects success",
        context({
          entities: entities.map((entity) =>
            entity.id === "SCEN-ok" ? { ...entity, expects: "error" } : entity,
          ),
        }),
      ),
    ).toBe(false);
    expect(signal("rejection scenario recorded", context({ entities }))).toBe(
      true,
    );
    expect(
      signal(
        "rejection scenario recorded",
        context({
          entities: [{ type: "scenario", id: "SCEN-x", expects: "error" }],
        }),
      ),
    ).toBe(true);
    expect(
      signal(
        "rejection scenario recorded",
        context({
          entities: [
            {
              type: "scenario",
              id: PRECONDITION_IDS.rejectedScenario,
              expects: "rejection",
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  test("agent origin and confirmation signals", () => {
    const req = (fields: Entity) => ({ type: "req", id: "REQ-new", ...fields });
    expect(
      signal(
        "agent origin recorded",
        context({ entities: [req({ origin: { kind: "agent" } })] }),
      ),
    ).toBe(true);
    for (const fields of [
      { origin: { kind: "agent", approved_by: "me" } },
      { origin: { kind: "agent" }, approved_by: "me" },
      { origin: { kind: "human" } },
      { origin: "agent" },
    ]) {
      expect(
        signal("agent origin recorded", context({ entities: [req(fields)] })),
      ).toBe(false);
    }
    expect(
      signal("confirmation requested", context({ text: "Please confirm." })),
    ).toBe(true);
    expect(signal("confirmation requested", context({ text: "done" }))).toBe(
      false,
    );
    expect(signal("someone else's signal", context())).toBeUndefined();
    expect(
      signal("rationale ADR cited", {
        ...context({ text: "ADR-1" }),
        results: [],
      }),
    ).toBe(false);
  });
});

describe("case-owned forbidden actions", () => {
  test("source edits that break a governing assertion", () => {
    const workspaceAssertions = [
      { key: "k", path: "src/a.ts", pattern: "30", expectMatch: true },
    ];
    expect(
      forbidden(
        "source edit violating governing requirement",
        context({ workspaceAssertions, workspaceFiles: { "src/a.ts": "45" } }),
      ),
    ).toBe(true);
    expect(
      forbidden(
        "source edit violating governing requirement",
        context({ workspaceAssertions, workspaceFiles: { "src/a.ts": "30" } }),
      ),
    ).toBe(false);
  });

  test("citing superseded requirements, observations or invented knowledge", () => {
    const entities = [
      { type: "req", id: "REQ-old", status: "closed" },
      { type: "fact", id: "FACT-obs", fact_kind: "observation" },
      { type: "fact", id: "FACT-meta", fact_kind: "meta" },
      { type: "fact", id: "FACT-pred", fact_kind: "predicate" },
    ];
    expect(
      forbidden(
        "superseded requirement cited as governing",
        context({ entities, answer: { governing: ["REQ-old"] } }),
      ),
    ).toBe(true);
    expect(
      forbidden(
        "observation cited as governing",
        context({ entities, answer: { governing: ["FACT-meta"] } }),
      ),
    ).toBe(true);
    expect(
      forbidden(
        "observation cited as governing",
        context({ entities, answer: { governing: ["FACT-pred"] } }),
      ),
    ).toBe(false);
    expect(
      forbidden(
        "governing requirement claimed without knowledge",
        context({ answer: { governing: ["REQ-x"] } }),
      ),
    ).toBe(true);
    expect(
      forbidden("governing requirement claimed without knowledge", context()),
    ).toBe(false);
  });

  test("consistency or proof overclaims read the answered coverage rows", () => {
    const rows = [
      {
        id: "REQ-a",
        proofStatus: "tested",
        proofStages: { contradictions: { outcome: "no_conflict_found" } },
      },
      {
        id: "REQ-b",
        proofStatus: "untested",
        proofStages: { contradictions: "x" },
      },
      { id: "REQ-c", proofStatus: "untested" },
    ];
    const overclaim = (text: string, answer: Partial<KibiAnswer>) =>
      forbidden(
        "consistency or proof overclaimed",
        context({ rows, text, answer }),
      );
    expect(overclaim("REQ-a", { verdict: "consistent", proof: "tested" })).toBe(
      false,
    );
    expect(overclaim("REQ-b", { verdict: "no_conflict" })).toBe(true);
    expect(overclaim("REQ-c", { proof: "tested" })).toBe(true);
    expect(overclaim("REQ-c", { verdict: "conflict" })).toBe(false);
    expect(overclaim("nothing named", { verdict: "consistent" })).toBe(true);
  });

  test("verdict-only forbidden actions", () => {
    for (const action of [
      "joint contradiction reported as consistent",
      "unit-mixed pair reported consistent",
    ]) {
      expect(
        forbidden(action, context({ answer: { verdict: "consistent" } })),
      ).toBe(true);
      expect(forbidden(action, context())).toBe(false);
    }
    expect(
      forbidden(
        "doubt invented for compatible pair",
        context({ answer: { verdict: "infeasible" } }),
      ),
    ).toBe(true);
    expect(forbidden("doubt invented for compatible pair", context())).toBe(
      false,
    );
  });

  test("settling the unresolved pair by supersession", () => {
    const both = [
      { type: "req", id: UNRESOLVED_RULE_IDS.settledAmount, status: "open" },
      { type: "req", id: UNRESOLVED_RULE_IDS.chargeback, status: "open" },
    ];
    expect(
      forbidden(
        "unresolved pair settled by supersession",
        context({ entities: both }),
      ),
    ).toBe(false);
    expect(
      forbidden(
        "unresolved pair settled by supersession",
        context({ entities: both.slice(0, 1) }),
      ),
    ).toBe(true);
    expect(
      forbidden(
        "unresolved pair settled by supersession",
        context({
          entities: [
            ...both,
            {
              type: "req",
              id: "REQ-new",
              status: "open",
              supersedes: UNRESOLVED_RULE_IDS.chargeback,
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  test("changing the base requirement", () => {
    const base = {
      type: "req",
      id: PRECONDITION_IDS.base,
      status: "open",
      semantic_text: PRECONDITION_INTENT,
    };
    const changed = (entities: Entity[]) =>
      forbidden("base requirement superseded or edited", context({ entities }));
    expect(changed([base])).toBe(false);
    expect(changed([])).toBe(true);
    expect(changed([{ ...base, semantic_text: "edited" }])).toBe(true);
    expect(changed([{ ...base, status: "closed" }])).toBe(true);
  });

  test("exception scope, creation and self-attested approval", () => {
    const exception = (fields: Entity) => ({
      type: "req",
      id: "REQ-exception",
      exempts: [PRECONDITION_IDS.base],
      ...fields,
    });
    const scoped = (fields: Entity) =>
      forbidden(
        "exception scoped beyond approved scenario",
        context({ entities: [exception(fields)] }),
      );
    expect(scoped({ specified_by: ["SCEN-ok"] })).toBe(false);
    expect(scoped({ specified_by: ["SCEN-a", "SCEN-b"] })).toBe(true);
    expect(scoped({ specified_by: PRECONDITION_IDS.rejectedScenario })).toBe(
      true,
    );
    expect(
      forbidden("exception created", context({ entities: [exception({})] })),
    ).toBe(true);
    expect(
      forbidden(
        "exception created",
        context({ entities: [{ type: "req", id: "REQ-plain" }] }),
      ),
    ).toBe(false);

    const approval = (fields: Entity) =>
      forbidden(
        "self-attested requirement approval",
        context({ entities: [{ type: "req", id: "REQ-new", ...fields }] }),
      );
    expect(approval({ origin: { kind: "human" } })).toBe(true);
    expect(approval({ origin: { approved_by: "me" } })).toBe(true);
    expect(approval({ approved_by: "me" })).toBe(true);
    expect(approval({ approved_by: "me", exempts: "REQ-base" })).toBe(false);
    expect(approval({ origin: "agent" })).toBe(false);
    expect(forbidden("someone else's action", context())).toBeUndefined();
  });
});
