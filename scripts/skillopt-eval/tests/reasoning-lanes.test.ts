// implements REQ-skillopt-codex-optimization
import { describe, expect, test } from "bun:test";
import { type CanonicalSkill, buildSkillCatalog } from "../catalog";
import {
  KIBI_ANSWER_FORMAT_INSTRUCTION,
  OBJECTIVE_CASE_CONTRACTS,
  answerScoredObjective,
} from "../fixtures/case-contracts";
import {
  parseHeldOutTaskSpec,
  parsePublicTaskSpec,
} from "../fixtures/contracts";
import { buildPrivateManifest } from "../fixtures/evaluator";
import { parsePrivateEvaluatorManifestValue } from "../fixtures/evaluator-contracts";
import { OBJECTIVE_WORKFLOWS } from "../fixtures/objective-expectations";
import {
  type CaseSignalContext,
  caseForbiddenObserved,
  caseSignalObserved,
  workspaceAssertionPasses,
} from "../runtime/case-signals";
import { sealDefaultCellEvidence } from "../runtime/codex-cell-defaults";
import {
  GOVERNED_AREA_IDS,
  PRECONDITION_IDS,
  PRECONDITION_INTENT,
  UNRESOLVED_RULE_IDS,
} from "../runtime/fixture-seeds";
import {
  finalAnswerEvidence,
  lastAgentMessage,
  parseKibiAnswer,
  transcriptOrdering,
} from "../runtime/transcript-evidence";
import {
  type CellEvidence,
  argumentsMatch,
  protocolContractViolations,
  requiredCallViolations,
} from "../scoring/cell";
import { evaluatorRoots } from "./fixtures/evaluator-authority-fixtures";

function line(value: unknown): string {
  return JSON.stringify(value);
}

function mcpCall(id: string, tool: string, args: unknown = {}): string {
  return line({
    type: "item.completed",
    item: { id, type: "mcp_tool_call", server: "kibi", tool, arguments: args },
  });
}

function agentMessage(id: string, text: string): string {
  return line({
    type: "item.completed",
    item: { id, type: "agent_message", text },
  });
}

function fileChange(id: string, path: string): string {
  return line({
    type: "item.completed",
    item: { id, type: "file_change", changes: [{ path, kind: "update" }] },
  });
}

const BLOCK_ANSWER = [
  "REQ-fixture-family-name-v2 governs this; the change conflicts with it.",
  "```kibi-answer",
  line({
    verdict: "conflict",
    governing: ["REQ-fixture-family-name-v2"],
    conflict: "empty names must be rejected",
    unknowns: [],
    nextStep: "ask the owner",
    proof: "proven",
  }),
  "```",
].join("\n");

describe("final-answer lane (H1)", () => {
  test("reads the last agent message and unwraps the output-schema answer", () => {
    const transcript = [
      agentMessage("m1", "thinking"),
      agentMessage("m2", line({ completed: true, answer: BLOCK_ANSWER })),
    ].join("\n");
    expect(lastAgentMessage(transcript)).toBe(BLOCK_ANSWER);
    const evidence = finalAnswerEvidence(transcript);
    expect(evidence.answer.source).toBe("block");
    expect(evidence.answer.verdict).toBe("conflict");
    expect(evidence.answer.governing).toEqual(["REQ-fixture-family-name-v2"]);
    expect(evidence.answer.proof).toBe("proven");
    expect(evidence.answer.nextStep).toBe("ask the owner");
  });

  test("falls back to regex when no block is emitted", () => {
    const answer = parseKibiAnswer(
      "REQ-fixture-family-name-v2 governs fixtureFamily.\nREQ-fixture-family-name is superseded and does not govern it.",
    );
    expect(answer.source).toBe("regex");
    expect(answer.governing).toEqual(["REQ-fixture-family-name-v2"]);
  });

  test("returns an empty answer for a transcript without messages", () => {
    const evidence = finalAnswerEvidence("");
    expect(evidence.text).toBe("");
    expect(evidence.answer.governing).toEqual([]);
  });
});

describe("pre-edit ordering lane (H2)", () => {
  test("orders the first kb_search before the first file change", () => {
    const ordering = transcriptOrdering(
      [
        mcpCall("c1", "kb_skills"),
        mcpCall("c2", "kb_search", { query: "fixtureFamily" }),
        mcpCall("c2", "kb_search", { query: "fixtureFamily" }),
        fileChange("f1", "src/fixture.ts"),
        mcpCall("c3", "kb_check"),
      ].join("\n"),
    );
    expect(ordering.firstKbSearchIndex).not.toBeNull();
    expect(ordering.firstEditIndex).not.toBeNull();
    expect(ordering.firstKbSearchIndex ?? 99).toBeLessThan(
      ordering.firstEditIndex ?? -1,
    );
    expect(ordering.kibiCallsBeforeFirstEdit).toBe(1);
    expect(ordering.editedPaths).toEqual(["src/fixture.ts"]);
  });

  test("reports an edit with no prior lookup", () => {
    const ordering = transcriptOrdering(
      [fileChange("f1", "src/fixture.ts"), mcpCall("c1", "kb_search")].join(
        "\n",
      ),
    );
    expect(ordering.kibiCallsBeforeFirstEdit).toBe(0);
    expect(ordering.firstEditIndex ?? 99).toBeLessThan(
      ordering.firstKbSearchIndex ?? -1,
    );
  });
});

function queryResult(entities: readonly Record<string, unknown>[]) {
  return {
    tool: "kb_query",
    result: { structuredContent: { kibiProtocol: 1, data: { entities } } },
  };
}

function context(
  overrides: Partial<CaseSignalContext> & { text?: string } = {},
): CaseSignalContext {
  const text = overrides.text ?? BLOCK_ANSWER;
  return {
    results: overrides.results ?? [
      queryResult([
        { id: GOVERNED_AREA_IDS.superseded, type: "req", status: "closed" },
        {
          id: GOVERNED_AREA_IDS.current,
          type: "req",
          status: "open",
          supersedes: [`kb:entity/${GOVERNED_AREA_IDS.superseded}`],
        },
        {
          id: GOVERNED_AREA_IDS.observation,
          type: "fact",
          fact_kind: "observation",
        },
      ]),
    ],
    brokerTools: overrides.brokerTools ?? ["kb_search"],
    answer: overrides.answer ?? {
      text,
      answer: parseKibiAnswer(text),
    },
    ordering: overrides.ordering ?? transcriptOrdering(""),
    workspaceFiles: overrides.workspaceFiles ?? {},
    workspaceAssertions: overrides.workspaceAssertions ?? [],
  };
}

describe("case signals", () => {
  test("credits the current governing requirement and its conflict", () => {
    const ctx = context();
    expect(caseSignalObserved("current governing requirement cited", ctx)).toBe(
      true,
    );
    expect(caseSignalObserved("governing conflict reported", ctx)).toBe(true);
    expect(caseSignalObserved("kibi-answer block emitted", ctx)).toBe(true);
    expect(
      caseForbiddenObserved("superseded requirement cited as governing", ctx),
    ).toBe(false);
    expect(caseSignalObserved("unknown signal", ctx)).toBeUndefined();
    expect(caseForbiddenObserved("unknown action", ctx)).toBeUndefined();
  });

  test("flags superseded or observation entities cited as governing", () => {
    const superseded = context({
      text: `${GOVERNED_AREA_IDS.superseded} governs fixtureFamily.`,
    });
    expect(
      caseForbiddenObserved(
        "superseded requirement cited as governing",
        superseded,
      ),
    ).toBe(true);
    const observation = context({
      text: [
        "```kibi-answer",
        line({
          verdict: "governed",
          governing: [GOVERNED_AREA_IDS.observation],
        }),
        "```",
      ].join("\n"),
    });
    expect(
      caseForbiddenObserved("observation cited as governing", observation),
    ).toBe(true);
  });

  test("workspace assertions guard the governing rule in src", () => {
    const assertion =
      OBJECTIVE_CASE_CONTRACTS.governing_intent_before_edit
        ?.workspaceAssertions?.[0];
    if (assertion === undefined) throw new Error("missing assertion");
    const kept = {
      [assertion.path]:
        'export function fixtureFamily(name: string) {\n  if (name.trim() === "") throw new Error("empty");\n  return name.trim();\n}\n',
    };
    const removed = {
      [assertion.path]:
        "export function fixtureFamily(name: string) {\n  return name.trim();\n}\n",
    };
    expect(workspaceAssertionPasses(assertion, kept)).toBe(true);
    expect(workspaceAssertionPasses(assertion, removed)).toBe(false);
    expect(
      caseForbiddenObserved(
        "source edit violating governing requirement",
        context({ workspaceFiles: removed, workspaceAssertions: [assertion] }),
      ),
    ).toBe(true);
  });

  test("agent origin is credited only without approval fields", () => {
    const withOrigin = (origin: Record<string, unknown>) =>
      context({
        results: [
          queryResult([
            {
              id: "REQ-fixture-family-trimmed",
              type: "req",
              status: "open",
              origin,
            },
          ]),
        ],
      });
    expect(
      caseSignalObserved(
        "agent origin recorded",
        withOrigin({ kind: "agent" }),
      ),
    ).toBe(true);
    const human = withOrigin({ kind: "human", approved_by: "Agent" });
    expect(caseSignalObserved("agent origin recorded", human)).toBe(false);
    expect(
      caseForbiddenObserved("self-attested requirement approval", human),
    ).toBe(true);
  });

  test("base requirement must stay unchanged for scenario cases", () => {
    const base = (semantic_text: string) =>
      context({
        results: [
          queryResult([
            {
              id: PRECONDITION_IDS.base,
              type: "req",
              status: "open",
              semantic_text,
            },
          ]),
        ],
      });
    expect(
      caseForbiddenObserved(
        "base requirement superseded or edited",
        base(PRECONDITION_INTENT),
      ),
    ).toBe(false);
    expect(
      caseForbiddenObserved(
        "base requirement superseded or edited",
        base("A client call may always happen."),
      ),
    ).toBe(true);
  });
});

describe("unresolved consistency signals (C2.2)", () => {
  const refundRequirements = (extra: Record<string, unknown>[] = []) => [
    queryResult([
      { id: UNRESOLVED_RULE_IDS.settledAmount, type: "req", status: "open" },
      { id: UNRESOLVED_RULE_IDS.chargeback, type: "req", status: "open" },
      ...extra,
    ]),
  ];
  const answer = (value: Record<string, unknown>) =>
    ["```kibi-answer", line(value), "```"].join("\n");
  const unresolved = {
    verdict: "unresolved",
    governing: [
      UNRESOLVED_RULE_IDS.settledAmount,
      UNRESOLVED_RULE_IDS.chargeback,
    ],
    conflict: null,
    unknowns: ["whether an order with an open chargeback can settle at zero"],
    nextStep: "Ask the payments owner whether chargeback refunds are exempt.",
    proof: null,
  };

  test("credits an unresolved verdict that names both requirements and a next step", () => {
    const ctx = context({
      results: refundRequirements(),
      text: answer(unresolved),
    });
    expect(caseSignalObserved("unresolved pair reported", ctx)).toBe(true);
    expect(caseSignalObserved("resolving step reported", ctx)).toBe(true);
    expect(
      caseForbiddenObserved("unresolved pair settled by supersession", ctx),
    ).toBe(false);
  });

  test("rejects a decided verdict, a missing ID or a missing next step", () => {
    for (const value of [
      { ...unresolved, verdict: "no_conflict" },
      { ...unresolved, verdict: "conflict" },
      { ...unresolved, governing: [UNRESOLVED_RULE_IDS.chargeback] },
    ]) {
      expect(
        caseSignalObserved(
          "unresolved pair reported",
          context({ results: refundRequirements(), text: answer(value) }),
        ),
      ).toBe(false);
    }
    expect(
      caseSignalObserved(
        "resolving step reported",
        context({
          results: refundRequirements(),
          text: answer({ ...unresolved, nextStep: null }),
        }),
      ),
    ).toBe(false);
  });

  test("flags a supersedes edge, a closed or a missing refund requirement", () => {
    const settled = (results: CaseSignalContext["results"]) =>
      caseForbiddenObserved(
        "unresolved pair settled by supersession",
        context({ results, text: answer(unresolved) }),
      );
    expect(
      settled(
        refundRequirements([
          {
            id: "REQ-refund-chargeback-v2",
            type: "req",
            status: "open",
            supersedes: [`kb:entity/${UNRESOLVED_RULE_IDS.chargeback}`],
          },
        ]),
      ),
    ).toBe(true);
    expect(
      settled([
        queryResult([
          {
            id: UNRESOLVED_RULE_IDS.settledAmount,
            type: "req",
            status: "closed",
          },
          { id: UNRESOLVED_RULE_IDS.chargeback, type: "req", status: "open" },
        ]),
      ]),
    ).toBe(true);
    expect(
      settled([
        queryResult([
          { id: UNRESOLVED_RULE_IDS.chargeback, type: "req", status: "open" },
        ]),
      ]),
    ).toBe(true);
  });
});

function evidence(
  rawCalls: readonly { tool: string; args: Record<string, unknown> }[],
): CellEvidence {
  const empty = { complete: true, integrityValid: true, claims: [] };
  return {
    finalState: empty,
    broker: {
      ...empty,
      orderedCalls: rawCalls.map(({ tool }) => ({ tool, predicate: "" })),
      rawCalls: rawCalls.map((call) => ({ ...call, resultOk: true })),
    },
    diagnostic: empty,
    codex: empty,
    isolation: { observedSentinels: [], violations: [] },
  };
}

describe("protocol argument predicates (H4)", () => {
  test("argumentsMatch is a recursive subset predicate", () => {
    expect(
      argumentsMatch(
        { sourceLocations: [{ path: "src/fixture.ts" }] },
        {
          query: "x",
          sourceLocations: [
            { path: "src/other.ts" },
            { path: "src/fixture.ts", line: 3 },
          ],
        },
      ),
    ).toBe(true);
    expect(
      argumentsMatch(
        { rules: ["domain-contradictions"] },
        { rules: ["required-fields"] },
      ),
    ).toBe(false);
    expect(argumentsMatch({ by: "req" }, { by: "req" })).toBe(true);
    expect(argumentsMatch({ by: "req" }, {})).toBe(false);
  });

  test("required calls are matched in order with their arguments", () => {
    const contract = {
      requiredCalls: [
        {
          tool: "kb_search",
          args: { sourceLocations: [{ path: "src/fixture.ts" }] },
        },
        { tool: "kb_check", args: { rules: ["domain-contradictions"] } },
      ],
      forbiddenTools: ["kb_upsert"],
    };
    const good = evidence([
      {
        tool: "kb_search",
        args: { sourceLocations: [{ path: "src/fixture.ts" }] },
      },
      { tool: "kb_check", args: { rules: ["domain-contradictions", "x"] } },
    ]);
    expect(requiredCallViolations(contract, good)).toEqual([]);
    const wrongArgs = evidence([
      { tool: "kb_search", args: { query: "fixture" } },
      { tool: "kb_check", args: {} },
    ]);
    expect(requiredCallViolations(contract, wrongArgs)).toHaveLength(2);
    const forbidden = evidence([
      {
        tool: "kb_search",
        args: { sourceLocations: [{ path: "src/fixture.ts" }] },
      },
      { tool: "kb_upsert", args: {} },
      { tool: "kb_check", args: { rules: ["domain-contradictions"] } },
    ]);
    expect(protocolContractViolations(contract, forbidden)).toEqual([
      "forbidden tool attempted: kb_upsert",
    ]);
  });
});

function taskFor(skill: CanonicalSkill, family: string, split: string) {
  const task = buildSkillCatalog(skill).find(
    (candidate) => candidate.family === family && candidate.split === split,
  );
  if (task === undefined)
    throw new Error(`missing ${skill}/${family}/${split}`);
  return task;
}

function manifestFor(task: ReturnType<typeof taskFor>) {
  const parsed =
    task.split === "held-out"
      ? parseHeldOutTaskSpec(task)
      : parsePublicTaskSpec(task);
  return parsePrivateEvaluatorManifestValue(
    buildPrivateManifest({
      task: parsed,
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
    }),
  );
}

describe("supplemental case manifests", () => {
  test("every case contract objective has a workflow and a format instruction", () => {
    for (const objective of Object.keys(OBJECTIVE_CASE_CONTRACTS)) {
      expect(OBJECTIVE_WORKFLOWS[objective]).toBeDefined();
    }
    const task = taskFor("kibi-usage", "intent-consult", "development");
    expect(answerScoredObjective(task.taskData.objectiveCode)).toBe(true);
    expect(task.prompt).toContain(KIBI_ANSWER_FORMAT_INSTRUCTION.trim());
  });

  test("C1.1 manifest carries setup, argument contract and assertions", () => {
    const manifest = manifestFor(
      taskFor("kibi-usage", "intent-consult", "train"),
    );
    expect(manifest.fixtureSetup).toBe("seeded_governed_area_kb");
    expect(manifest.protocolContract?.requiredCalls[0]).toEqual({
      tool: "kb_search",
      args: { sourceLocations: [{ path: "src/fixture.ts" }] },
    });
    expect(manifest.workspaceAssertions?.[0]?.key).toBe(
      "governing-rule-preserved",
    );
    expect(
      manifest.expectedFinalState.some(
        (entry) =>
          entry.query === "workspace://assert/0" && entry.critical === true,
      ),
    ).toBe(true);
  });

  test("scenario and consistency manifests use their seeded setups", () => {
    expect(
      manifestFor(taskFor("kibi-traceability", "scenario-feasibility", "train"))
        .fixtureSetup,
    ).toBe("seeded_precondition_kb");
    expect(
      manifestFor(taskFor("kibi-freshness", "consistency-report", "train"))
        .fixtureSetup,
    ).toBeDefined();
  });

  test("the development case is the compatible edit (C1.2)", () => {
    const task = taskFor("kibi-usage", "intent-consult", "development");
    expect(task.taskData.objectiveCode).toBe("compatible_change_after_intent");
    const manifest = manifestFor(task);
    expect(manifest.workspaceAssertions?.map((entry) => entry.key)).toEqual([
      "governing-rule-preserved",
      "logging-added",
    ]);
    expect(
      OBJECTIVE_WORKFLOWS[task.taskData.objectiveCode]?.requiredSignals,
    ).toContain("kb lookup before first source edit");
  });

  test("sealed evidence scores the answer and workspace lanes", () => {
    const task = taskFor("kibi-usage", "intent-consult", "train");
    const manifest = manifestFor(task);
    const requests = [
      { tool: "kb_query" as const, args: {} },
      { tool: "kb_check" as const, args: {} },
      { tool: "kb_status" as const, args: {} },
      { tool: "kb_coverage" as const, args: { by: "req" } },
    ];
    const finalState = `${line({
      schemaVersion: "1.0.0",
      workspaceRoot: "/isolated/workspace",
      binding: { caseId: task.id, roots: evaluatorRoots, sequence: 1 },
      requests: requests.map((request) => ({
        ...request,
        result:
          request.tool === "kb_query"
            ? queryResult([
                {
                  id: GOVERNED_AREA_IDS.superseded,
                  type: "req",
                  status: "closed",
                },
                { id: GOVERNED_AREA_IDS.current, type: "req", status: "open" },
              ]).result
            : { structuredContent: {} },
        resultHash: "0".repeat(64),
      })),
    })}\n`;
    const transcript = [
      mcpCall("c1", "kb_search", {
        sourceLocations: [{ path: "src/fixture.ts" }],
      }),
      agentMessage("m1", line({ completed: true, answer: BLOCK_ANSWER })),
    ].join("\n");
    const sealed = sealDefaultCellEvidence(
      { evaluatorManifest: manifest, finalStateRequests: requests },
      {
        finalState,
        brokerTrace: "",
        diagnosticReceipt: "",
        transcript,
        workspaceFiles: {
          "src/fixture.ts":
            'export function fixtureFamily(name: string) {\n  if (name.trim() === "") throw new Error("empty");\n  return name;\n}\n',
        },
      },
    );
    const claim = (key: string) =>
      sealed.finalState.claims.find((entry) => entry.key === key)?.value;
    expect(claim("workspace-assert-governing-rule-preserved")).toBe(true);
    const signalKeys = manifest.expectedFinalState
      .filter((entry) => entry.query.startsWith("workflow://signal/"))
      .map((entry) => entry.key);
    const workflow = OBJECTIVE_WORKFLOWS[task.taskData.objectiveCode];
    const citedIndex =
      workflow?.requiredSignals.indexOf(
        "current governing requirement cited",
      ) ?? -1;
    expect(citedIndex).toBeGreaterThanOrEqual(0);
    expect(claim(signalKeys[citedIndex] ?? "")).toBe(true);
  });

  test("C2.2 cases use the unresolved-rule seed and forbid writes", () => {
    const tasks = buildSkillCatalog("kibi-freshness").filter(
      (task) => task.taskData.objectiveCode === "consistency_unresolved_report",
    );
    expect(tasks.map((task) => `${task.split}:${task.id}`)).toEqual([
      "development:kibi-freshness-consistency-report-development-2",
      "held-out:kibi-freshness-consistency-report-held-out-4",
    ]);
    for (const task of tasks) {
      const manifest = manifestFor(task);
      expect(manifest.fixtureSetup).toBe("seeded_unresolved_rule_kb");
      expect(manifest.protocolContract?.forbiddenTools).toEqual([
        "kb_upsert",
        "kb_delete",
      ]);
      expect(manifest.protocolContract?.requiredCalls).toEqual([
        { tool: "kb_query" },
        { tool: "kb_check", args: { rules: ["domain-contradictions"] } },
      ]);
      expect(task.prompt).toContain(UNRESOLVED_RULE_IDS.settledAmount);
      expect(task.prompt).toContain(UNRESOLVED_RULE_IDS.chargeback);
    }
  });

  test("C2.2 counts the seeded unresolved pair as a clean final check", () => {
    const task = buildSkillCatalog("kibi-freshness").find(
      (candidate) =>
        candidate.taskData.objectiveCode === "consistency_unresolved_report" &&
        candidate.split === "development",
    );
    if (task === undefined) throw new Error("missing C2.2 task");
    const manifest = manifestFor(task);
    const requests = [
      { tool: "kb_query" as const, args: {} },
      { tool: "kb_check" as const, args: {} },
      { tool: "kb_status" as const, args: {} },
      { tool: "kb_coverage" as const, args: { by: "req" } },
    ];
    const seeded = {
      rule: "domain-contradictions",
      entityId: `${UNRESOLVED_RULE_IDS.chargeback}/${UNRESOLVED_RULE_IDS.settledAmount}`,
      description: `Rule conflict (unresolved) between ${UNRESOLVED_RULE_IDS.chargeback} and ${UNRESOLVED_RULE_IDS.settledAmount}`,
    };
    const seal = (violations: readonly Record<string, unknown>[]) => {
      const finalState = `${line({
        schemaVersion: "1.0.0",
        workspaceRoot: "/isolated/workspace",
        binding: { caseId: task.id, roots: evaluatorRoots, sequence: 1 },
        requests: requests.map((request) => ({
          ...request,
          result:
            request.tool === "kb_query"
              ? queryResult([
                  {
                    id: UNRESOLVED_RULE_IDS.settledAmount,
                    type: "req",
                    status: "open",
                  },
                  {
                    id: UNRESOLVED_RULE_IDS.chargeback,
                    type: "req",
                    status: "open",
                  },
                ]).result
              : request.tool === "kb_check"
                ? {
                    structuredContent: {
                      violations,
                      count: violations.length,
                    },
                  }
                : request.tool === "kb_status"
                  ? {
                      structuredContent: {
                        syncState: "fresh",
                        dirty: false,
                        proofSnapshotDirty: false,
                      },
                    }
                  : { structuredContent: {} },
          resultHash: "0".repeat(64),
        })),
      })}\n`;
      const transcript = [
        mcpCall("c1", "kb_query", {}),
        mcpCall("c2", "kb_check", { rules: ["domain-contradictions"] }),
        agentMessage(
          "m1",
          line({
            completed: true,
            answer: [
              "```kibi-answer",
              line({
                verdict: "unresolved",
                governing: [
                  UNRESOLVED_RULE_IDS.settledAmount,
                  UNRESOLVED_RULE_IDS.chargeback,
                ],
                conflict: null,
                unknowns: [],
                nextStep: "Ask the payments owner which rule wins.",
                proof: null,
              }),
              "```",
            ].join("\n"),
          }),
        ),
      ].join("\n");
      const sealed = sealDefaultCellEvidence(
        { evaluatorManifest: manifest, finalStateRequests: requests },
        { finalState, brokerTrace: "", diagnosticReceipt: "", transcript },
      );
      return (key: string) =>
        sealed.finalState.claims.find((entry) => entry.key === key)?.value;
    };
    const clean = seal([seeded]);
    expect(clean("final-consistency-report")).toBe(true);
    expect(clean("workflow-outcome")).toBe("complete");
    const signals = OBJECTIVE_WORKFLOWS.consistency_unresolved_report;
    for (const [index] of (signals?.requiredSignals ?? []).entries()) {
      if (signals?.requiredSignals[index] === "final check executed") continue;
      expect(clean(`workflow-signal-${index + 1}`)).toBe(true);
    }
    const extra = seal([
      seeded,
      { ...seeded, entityId: "REQ-other/REQ-refund-chargeback" },
    ]);
    expect(extra("final-consistency-report")).toBe(false);
  });
});
