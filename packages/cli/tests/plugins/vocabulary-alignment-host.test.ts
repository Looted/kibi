/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { kibiPlugin as builtinPlugin } from "kibi-plugin-builtin";
import { createJevPlugin } from "kibi-plugin-jev";
import type { JevClient } from "kibi-plugin-jev";
import {
  type KibiPluginV1,
  NEW_SUBJECT_CHOICE,
  type PluginMode,
  type RankSubjectsInput,
  VOCABULARY_ALIGNMENT_CAPABILITY_ID,
} from "kibi-plugin-sdk";

type JevSystemOneRequest = Parameters<JevClient["systemOne"]>[0];
import { executeModelRequirement } from "../../src/operations/modeling/model-requirement.js";
import { alignRequirementVocabulary } from "../../src/operations/modeling/vocabulary-alignment.js";
import {
  CapabilityRegistry,
  composeClaimComparison,
  composeSubjectRanking,
} from "../../src/plugins/index.js";
import * as impact from "../../src/public/impact-diagnostics.js";
import { executeCheck } from "../../src/public/operations/check-executor.js";
import * as discovery from "../../src/public/operations/discovery-executors.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
});

type Answers = Record<string, { choice: string } | { noul: number }>;

/** Fake TypeSafe client: answers every question through `answer`. */
function fakeJevClient(
  answer: (key: string, request: JevSystemOneRequest) => unknown,
): { client: JevClient; calls: JevSystemOneRequest[] } {
  const calls: JevSystemOneRequest[] = [];
  return {
    calls,
    client: {
      systemOne: async (request) => {
        calls.push(request);
        const answers: Answers = {};
        for (const key of Object.keys(request.questions)) {
          answers[key] = answer(key, request) as Answers[string];
        }
        return { answers };
      },
    },
  };
}

function registryWith(
  mode: PluginMode | null,
  client: JevClient,
): CapabilityRegistry {
  return new CapabilityRegistry({
    workspaceRoot: process.cwd(),
    builtinFactory: () => builtinPlugin as KibiPluginV1,
    projectConfig:
      mode === null
        ? {}
        : {
            plugins: [
              {
                package: "kibi-plugin-jev",
                capabilities: {
                  [VOCABULARY_ALIGNMENT_CAPABILITY_ID]: { mode },
                },
              },
            ],
          },
    loadPlugin: async (_root, packageName) => ({
      packageName,
      plugin: createJevPlugin({
        clientFactory: () => client,
        model: "jev-test",
      }) as KibiPluginV1,
      resolved: {
        packageName,
        packageRoot: `/tmp/${packageName}`,
        packageJsonPath: `/tmp/${packageName}/package.json`,
        packageJson: { name: packageName },
        entryPath: `/tmp/${packageName}/index.js`,
        entryUrl: `file:///tmp/${packageName}/index.js`,
      },
    }),
  });
}

const rankInput = (score: number): RankSubjectsInput => ({
  clauses: [
    {
      claimKey: "CLAIM-A",
      text: "Idle logins time out after half an hour",
      proposedSubjectKey: "idle_login",
      candidates: [{ subjectKey: "session.lifetime", score }],
    },
  ],
});

const choose =
  (subjectKey: string) =>
  (key: string): unknown =>
    key.startsWith("subject:") ? { choice: subjectKey } : { noul: 0.9 };

// executable_for TEST-kibi-vocabulary-alignment-capability
describe("vocabulary alignment composition", () => {
  test("builtin only: deterministic decision with a builtin stamp", async () => {
    const { client, calls } = fakeJevClient(choose("session.lifetime"));
    const resolution = await registryWith(
      null,
      client,
    ).resolveVocabularyAlignment();
    const result = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_model_requirement",
    });
    expect(result.results[0]?.choice).toBe(NEW_SUBJECT_CHOICE);
    expect(result.stamps.map((s) => s.pluginId)).toEqual([
      "kibi-plugin-builtin",
    ]);
    expect(result.fallbackUsed).toBe(false);
    expect(calls).toHaveLength(0);
  });

  test("replace: Jev owns the decision and its stamp discloses the model", async () => {
    const { client, calls } = fakeJevClient(choose("session.lifetime"));
    const resolution = await registryWith(
      "replace",
      client,
    ).resolveVocabularyAlignment();
    const result = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_model_requirement",
    });
    expect(result.results[0]?.choice).toBe("session.lifetime");
    expect(result.stamps).toEqual([
      expect.objectContaining({
        pluginId: "kibi-plugin-jev",
        mode: "replace",
        model: "jev-test",
        external: true,
      }),
    ]);
    expect(calls).toHaveLength(1);
  });

  test("replace failure falls back to builtin with fallbackUsed and no secrets", async () => {
    const client: JevClient = {
      systemOne: async () => {
        throw new Error("connect ECONNREFUSED api_key=sk-live-secret");
      },
    };
    const resolution = await registryWith(
      "replace",
      client,
    ).resolveVocabularyAlignment();
    const result = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_model_requirement",
    });
    expect(result.fallbackUsed).toBe(true);
    expect(result.results[0]?.choice).toBe(NEW_SUBJECT_CHOICE);
    expect(result.stamps).toEqual([
      expect.objectContaining({
        pluginId: "kibi-plugin-builtin",
        fallbackUsed: true,
      }),
    ]);
    expect(result.diagnostics[0]?.code).toBe("network");
    expect(JSON.stringify(result.diagnostics)).not.toContain("sk-live-secret");
  });

  test("an invented subject from the provider is rejected and falls back", async () => {
    const { client } = fakeJevClient(choose("invented.subject"));
    const resolution = await registryWith(
      "replace",
      client,
    ).resolveVocabularyAlignment();
    const result = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_model_requirement",
    });
    expect(result.fallbackUsed).toBe(true);
    expect(result.diagnostics[0]?.code).toBe("INVALID_CAPABILITY_RESULT");
  });

  test("augment only refines clauses the builtin left as new_subject", async () => {
    const { client, calls } = fakeJevClient(choose("session.lifetime"));
    const resolution = await registryWith(
      "augment",
      client,
    ).resolveVocabularyAlignment();
    const refined = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_model_requirement",
    });
    expect(refined.results[0]?.choice).toBe("session.lifetime");
    expect(refined.stamps.map((s) => s.mode)).toEqual(["augment", "augment"]);

    const resolved = await composeSubjectRanking(resolution, rankInput(0.9), {
      operationName: "kb_model_requirement",
    });
    expect(resolved.results[0]?.choice).toBe("session.lifetime");
    expect(calls).toHaveLength(1);
  });

  test("shadow records Jev results without changing the builtin outcome", async () => {
    const { client } = fakeJevClient(choose("session.lifetime"));
    const resolution = await registryWith(
      "shadow",
      client,
    ).resolveVocabularyAlignment();
    const result = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_model_requirement",
    });
    expect(result.results[0]?.choice).toBe(NEW_SUBJECT_CHOICE);
    expect(result.shadowComparisons[0]?.results[0]?.choice).toBe(
      "session.lifetime",
    );
  });

  test("compareClaims in augment mode can add, never remove, duplicate candidates", async () => {
    const { client } = fakeJevClient(() => ({ noul: 0.95 }));
    const resolution = await registryWith(
      "augment",
      client,
    ).resolveVocabularyAlignment();
    const result = await composeClaimComparison(
      resolution,
      {
        pairs: [
          {
            pairKey: "P1",
            sharedKey: "session.lifetime",
            left: { claimText: "Sessions must expire after 30 minutes" },
            right: { claimText: "Idle logins time out after half an hour" },
          },
        ],
      },
      { operationName: "kb_model_requirement" },
    );
    expect(result.results).toEqual([
      { pairKey: "P1", sameObligation: true, confidence: 0.95 },
    ]);
  });

  test("operations off the allowlist never reach an external provider", async () => {
    const { client, calls } = fakeJevClient(choose("session.lifetime"));
    const resolution = await registryWith(
      "replace",
      client,
    ).resolveVocabularyAlignment();
    const result = await composeSubjectRanking(resolution, rankInput(0.1), {
      operationName: "kb_check",
    });
    expect(calls).toHaveLength(0);
    expect(result.results[0]?.choice).toBe(NEW_SUBJECT_CHOICE);
  });
});

const VOCABULARY = [
  {
    factId: "FACT-SUBJ-SESSION-LIFETIME",
    subjectKey: "session.lifetime",
    title: "Session lifetime",
    reqDerived: false,
    requirements: [{ id: "REQ-session-expiry", title: "Sessions expire" }],
  },
  {
    factId: "FACT-SUBJ-REQ-LEGACY",
    subjectKey: "req.req_session_lifetime",
    title: "Session lifetime legacy",
    reqDerived: true,
    requirements: [],
  },
];

const CLAIMS = [
  {
    factId: "FACT-PROP-SESSION-TTL",
    subjectKey: "session.lifetime",
    propertyKey: "ttl",
    signature: "property('session.lifetime',ttl,lte,int,1800,s,'',require)",
    claimText: "Session lifetime must expire after 30 minutes",
    title: "TTL <= 30 min",
    requirements: ["REQ-session-expiry"],
  },
];

function modelingContext(overrides: Partial<OperationContext> = {}): {
  context: OperationContext;
  goals: string[];
} {
  const goals: string[] = [];
  const prolog: PrologPort = {
    query: async (goal): Promise<PrologQueryResult> => {
      goals.push(goal);
      if (goal.includes("subject_vocabulary_json")) {
        return {
          success: true,
          bindings: { Json: JSON.stringify(VOCABULARY) },
        };
      }
      if (goal.includes("subject_claims_json")) {
        return { success: true, bindings: { Json: JSON.stringify(CLAIMS) } };
      }
      return { success: true, bindings: {} };
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    goals,
    context: {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(0),
      prolog,
      ...overrides,
    },
  };
}

type ModelData = {
  applyPlan: Array<{
    type: string;
    id: string;
    relationships: Array<{ type: string; to: string }>;
  }>;
  warnings: Array<{ kind: string }>;
  vocabularyAlignment: {
    subject: {
      decision: string;
      subjectKey: string;
      existingFactId: string | null;
      candidates: Array<{ subjectKey: string }>;
    };
    redundancyCandidates: Array<{ factId: string }>;
    reviewPlan: Array<{
      id: string;
      properties: { tags: string[] };
      relationships: Array<{ type: string; from: string; to: string }>;
    }>;
    stamps: Array<{ pluginId: string; fallbackUsed?: boolean }>;
    fallbackUsed: boolean;
  };
};

// executable_for TEST-kibi-vocabulary-alignment-capability
describe("kb_model_requirement subject reuse", () => {
  test("builtin reuses the existing subject fact and flags a possible duplicate", async () => {
    restores.push(isolateKibiEnv());
    const { context } = modelingContext();
    const result = await executeModelRequirement(
      {
        text: "Session lifetime must expire after 30 minutes of idle time.",
        source: ".kb/requirements/REQ-demo.md",
      },
      context,
    );
    const data = result.structuredContent as unknown as ModelData;
    const alignment = data.vocabularyAlignment;
    expect(alignment.subject).toEqual(
      expect.objectContaining({
        decision: "reuse_existing",
        subjectKey: "session.lifetime",
        existingFactId: "FACT-SUBJ-SESSION-LIFETIME",
      }),
    );
    // Requirement-derived subjects are never offered for reuse.
    expect(alignment.subject.candidates.map((c) => c.subjectKey)).not.toContain(
      "req.req_session_lifetime",
    );
    // No duplicate subject fact: the plan links the existing one.
    expect(data.applyPlan.map((step) => step.id)).not.toContain(
      "FACT-SUBJ-SESSION-LIFETIME",
    );
    const req = data.applyPlan.find((step) => step.type === "req");
    expect(req?.relationships).toContainEqual({
      type: "constrains",
      from: expect.any(String),
      to: "FACT-SUBJ-SESSION-LIFETIME",
    } as never);
    expect(alignment.redundancyCandidates.map((c) => c.factId)).toEqual([
      "FACT-PROP-SESSION-TTL",
    ]);
    expect(alignment.reviewPlan[0]?.properties.tags).toContain(
      "review:possible-duplicate",
    );
    expect(alignment.reviewPlan[0]?.relationships).toEqual([
      {
        type: "relates_to",
        from: alignment.reviewPlan[0]?.id,
        to: "FACT-PROP-SESSION-TTL",
      },
    ]);
    expect(data.warnings.map((w) => w.kind)).toContain("possible_duplicate");
    expect(alignment.stamps.map((s) => s.pluginId)).toEqual([
      "kibi-plugin-builtin",
      "kibi-plugin-builtin",
    ]);
  });

  test("a named requirement keeps its id and the reused subject names the existing fact file", async () => {
    restores.push(isolateKibiEnv());
    const { context } = modelingContext();
    const result = await executeModelRequirement(
      {
        text: "Session lifetime must expire after 30 minutes of idle time.",
        source: ".kb/requirements/REQ-session-idle-expiry.md",
        requirementId: "REQ-session-idle-expiry",
      },
      context,
    );
    const data = result.structuredContent as unknown as ModelData & {
      writeSet: {
        req: { id: string; properties: { id: string } };
        subjectFact: { id: string; properties: { source: string } };
        relationships: Array<{ type: string; from: string; to: string }>;
      };
    };
    // The strict write set updates the named requirement; nothing mints a
    // REQ-AUTO id beside it.
    expect(data.writeSet.req.id).toBe("REQ-session-idle-expiry");
    expect(data.writeSet.req.properties.id).toBe("REQ-session-idle-expiry");
    expect(
      data.writeSet.relationships.map((relationship) => relationship.from),
    ).toEqual(["REQ-session-idle-expiry", "REQ-session-idle-expiry"]);
    const req = data.applyPlan.find((step) => step.type === "req");
    expect(req?.id).toBe("REQ-session-idle-expiry");
    expect(JSON.stringify(data.applyPlan)).not.toContain("REQ-AUTO-");
    // The reused subject fact points at its own file, not at the file of the
    // subject fact that was never created.
    expect(data.writeSet.subjectFact.id).toBe("FACT-SUBJ-SESSION-LIFETIME");
    expect(data.writeSet.subjectFact.properties.source).toBe(
      ".kb/facts/FACT-SUBJ-SESSION-LIFETIME.md",
    );
  });

  test("a proposed key that already exists is reused even outside the top candidates", async () => {
    restores.push(isolateKibiEnv());
    const crowded = [
      ...["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((name) => ({
        factId: `FACT-SUBJ-SESSION-${name.toUpperCase()}`,
        subjectKey: `session.${name}_timeout`,
        title: "Session timeout",
        reqDerived: false,
        requirements: [],
      })),
      {
        factId: "FACT-SUBJ-BILLING-LEDGER",
        subjectKey: "billing.ledger",
        title: "Billing ledger",
        reqDerived: false,
        requirements: [],
      },
    ];
    const prolog: PrologPort = {
      query: async (goal): Promise<PrologQueryResult> =>
        goal.includes("subject_vocabulary_json")
          ? { success: true, bindings: { Json: JSON.stringify(crowded) } }
          : { success: true, bindings: { Json: "[]" } },
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    };
    const outcome = await alignRequirementVocabulary(
      {
        workspaceRoot: process.cwd(),
        signal: new AbortController().signal,
        clock: () => new Date(0),
        prolog,
      },
      {
        claimKey: "CLAIM-0000000000000001",
        statement: "Session timeout must be 30 minutes.",
        proposedSubjectKey: "billing.ledger",
      },
    );
    expect(outcome?.subject).toMatchObject({
      decision: "reuse_existing",
      subjectKey: "billing.ledger",
      existingFactId: "FACT-SUBJ-BILLING-LEDGER",
    });
  });

  test("an explicit new subject is kept and declared, with shape review", async () => {
    restores.push(isolateKibiEnv());
    const { context } = modelingContext();
    const result = await executeModelRequirement(
      {
        text: "Invoices must be retained for 7 years.",
        source: ".kb/requirements/REQ-demo.md",
        subjectKey: "invoice",
        propertyKey: "retention_years",
        operator: "eq",
        value: 7,
      },
      context,
    );
    const data = result.structuredContent as unknown as ModelData;
    expect(data.vocabularyAlignment.subject.decision).toBe("declare_new");
    const subjectStep = data.applyPlan.find(
      (step) =>
        step.type === "fact" &&
        (step as unknown as { properties: { fact_kind: string } }).properties
          .fact_kind === "subject",
    ) as unknown as { properties: { tags: string[] } };
    expect(subjectStep.properties.tags).toContain("vocabulary:new-subject");
    expect(data.warnings.map((w) => w.kind)).toContain(
      "subject_key_shape_review",
    );
  });

  test("Jev in replace mode can pick the subject; failure falls back to builtin", async () => {
    restores.push(isolateKibiEnv());
    const { client, calls } = fakeJevClient((key) =>
      key.startsWith("subject:")
        ? { choice: "session.lifetime" }
        : { noul: 0.1 },
    );
    const registry = registryWith("replace", client);
    const { context } = modelingContext({
      ensurePlugins: async () => registry,
    });
    const result = await executeModelRequirement(
      {
        text: "Idle login sessions must time out after half an hour.",
        source: ".kb/requirements/REQ-demo.md",
      },
      context,
    );
    const data = result.structuredContent as unknown as ModelData;
    expect(data.vocabularyAlignment.subject.subjectKey).toBe(
      "session.lifetime",
    );
    expect(data.vocabularyAlignment.stamps[0]?.pluginId).toBe(
      "kibi-plugin-jev",
    );
    expect(data.vocabularyAlignment.redundancyCandidates).toEqual([]);
    expect(calls.length).toBeGreaterThan(0);

    const failing = registryWith("replace", {
      systemOne: async () => {
        throw new Error("timeout");
      },
    });
    const fallback = await executeModelRequirement(
      {
        text: "Idle login sessions must time out after half an hour.",
        source: ".kb/requirements/REQ-demo.md",
      },
      modelingContext({ ensurePlugins: async () => failing }).context,
    );
    const fallbackData = fallback.structuredContent as unknown as ModelData;
    expect(fallbackData.vocabularyAlignment.fallbackUsed).toBe(true);
    expect(fallbackData.vocabularyAlignment.stamps[0]).toEqual(
      expect.objectContaining({
        pluginId: "kibi-plugin-builtin",
        fallbackUsed: true,
      }),
    );
  });
});

// executable_for TEST-kibi-vocabulary-alignment-capability
describe("kb_check stays deterministic and offline", () => {
  test("checking the new rules never resolves plugins or calls a provider", async () => {
    restores.push(isolateKibiEnv());
    const providerCall = mock(() => {
      throw new Error("kb_check must not call a vocabulary provider");
    });
    const ensurePlugins = mock(async () => {
      providerCall();
      return registryWith("replace", { systemOne: providerCall as never });
    });
    spies.push(
      spyOn(impact, "collectFullKbQualityDiagnostics").mockResolvedValue([]),
    );
    spies.push(
      spyOn(discovery, "executeStatus").mockRejectedValue(
        new Error("Failed to resolve active branch: detached"),
      ),
    );
    const witness = {
      kind: "redundancy",
      requirements: ["REQ-a", "REQ-b"],
      signature: "property(s,p,eq,int,1,'','',require)",
    };
    const prolog: PrologPort = {
      query: async (goal): Promise<PrologQueryResult> =>
        goal.includes("check_selected_json")
          ? {
              success: true,
              bindings: {
                JsonString: JSON.stringify({
                  domain_redundancy: [
                    {
                      rule: "domain-redundancy",
                      entityId: "REQ-a/REQ-b",
                      description: "duplicate",
                      suggestion: "merge",
                      source: "",
                      evidence: { witnesses: [witness] },
                    },
                  ],
                }),
              },
            }
          : { success: true, bindings: {} },
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    };
    const result = await executeCheck(
      {
        rules: [
          "domain-redundancy",
          "domain-implication",
          "subject-key-identity",
          "subject-key-shape",
          "ontology-quality",
          "entity-id-style",
        ],
      },
      {
        workspaceRoot: process.cwd(),
        signal: new AbortController().signal,
        clock: () => new Date(0),
        prolog,
        ensurePlugins,
      },
      { collectFullQualityDiagnosticsForExplicitRules: true },
    );
    expect(ensurePlugins).not.toHaveBeenCalled();
    expect(providerCall).not.toHaveBeenCalled();
    const payload = result.structuredContent as unknown as {
      violations: unknown[];
      qualityDiagnostics: Array<{
        id: string;
        blocking: boolean;
        severity: string;
        evidence?: { witnesses: unknown[] };
      }>;
    };
    // Advisory: reported as a non-blocking quality diagnostic, never a violation.
    expect(payload.violations).toEqual([]);
    expect(payload.qualityDiagnostics[0]).toEqual(
      expect.objectContaining({
        id: "rule.domain-redundancy",
        blocking: false,
        severity: "warning",
        evidence: { witnesses: [witness] },
      }),
    );
  });
});
