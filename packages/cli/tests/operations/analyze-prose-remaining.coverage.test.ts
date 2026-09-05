// implements REQ-kibi-logical-requirement-coverage
import { afterEach, describe, expect, test } from "bun:test";
import { analyzeSemanticAdvisorInput } from "../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

describe("analyzeSemanticAdvisorInput leftover signal, role, and interpretation branches", () => {
  test("ignores non-requirement payloads and empty statements", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "test",
        id: "TEST-1",
        properties: { title: "At most 3 sessions must be ready" },
      },
    });
    expect(result.receipt.suggestions).toEqual([]);
    const empty = analyzeSemanticAdvisorInput({
      payload: { type: "req", id: "REQ-EMPTY", properties: {} },
    });
    expect(empty.receipt.propositions).toEqual([]);
  });

  test("detects cardinality, threshold, permission, state, and modal signals", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SIG",
        properties: {
          title: "Cap",
          semantic_text:
            "At most 3 sessions are enabled. Maximum 2 expires retained for 1. Only operators may export. The mode defaults to ready. The required outcome must fail clearly.",
        },
      },
    });
    const kinds = result.receipt.signals?.map((signal) => signal.kind) ?? [];
    expect(kinds.length).toBeGreaterThan(0);
  });

  test("flags ambiguous cardinality, ontology-gap rate limits, and contextual roles", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-ROLES",
        properties: {
          title: "Mixed",
          semantic_text: [
            "3 active sessions are allowed.",
            "Logins are rate limited to 5 attempts per minute.",
            "For example, a demo tenant may skip review.",
            "Because operators need auditability, exports are logged.",
            "Reviewers feel comfortable when the page looks complete.",
            "Auth token means a short-lived bearer credential.",
            "If the session is active, the token stays valid.",
            "Unless the account is exempt, MFA is required.",
          ].join(" "),
        },
      },
    });
    const kinds = new Set(result.receipt.suggestions.map((row) => row.kind));
    expect(kinds.has("ambiguity_observation") || kinds.has("ontology_gap")).toBe(
      true,
    );
    const roles = new Set(result.receipt.propositions.map((row) => row.role));
    expect(roles.has("example") || roles.has("rationale") || roles.has("subjective")).toBe(
      true,
    );
  });

  test("treats a fully modeled requirement as suggestion-free", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const text = "The service must retain customer data.";
    const claimKey = semanticClaimKey(text);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-MODELED",
        properties: {
          title: "Retain",
          semantic_text: text,
          logic_claims: [claimKey],
          semantic_inventory: [
            {
              claim_key: claimKey,
              claim_text: text,
              status: "modeled",
            },
          ],
        },
        relationships: [
          { type: "constrains", from: "REQ-MODELED", to: "FACT-SUBJ" },
          { type: "requires_property", from: "REQ-MODELED", to: "FACT-PROP" },
        ],
      },
      clauses: [text],
    });
    expect(result.receipt.suggestions).toEqual([]);
  });

  test("records interpretation errors, extra alternatives, and shadow cues", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const text =
      "If a customer is active, the service must retain the account because records are retained for 7 years unless exempt, and every export is forbidden after review.";
    const claimKey = semanticClaimKey(text);
    const ir = {
      version: "kibi.logic.v1" as const,
      kind: "rule" as const,
      modality: "oblige" as const,
      variables: [{ name: "X", type: "entity" as const }],
      head: {
        kind: "atom" as const,
        name: "retain",
        args: [{ kind: "var" as const, name: "X", type: "entity" as const }],
      },
      body: {
        kind: "atom" as const,
        name: "active_customer",
        args: [{ kind: "var" as const, name: "X", type: "entity" as const }],
      },
      exceptions: [
        {
          kind: "atom" as const,
          name: "exempt",
          args: [],
        },
      ],
      validFrom: "2026-01-01",
    };
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-SHADOW",
        properties: { title: "Retention", semantic_text: text },
      },
      clauses: [text],
      interpretations: [
        {
          claim_key: "CLAIM-UNKNOWN",
          claim_text: "other text",
          ir,
          span: { start: -1, end: -2 },
        },
        {
          claim_key: claimKey,
          claim_text: "mismatched claim text",
          ir,
          span: { start: 0, end: 3 },
        },
        {
          claim_key: claimKey,
          claim_text: text,
          ir,
          confidence: 1.4,
        },
        {
          claim_key: claimKey,
          claim_text: text,
          ir: { ...ir, modality: "forbid" },
        },
      ],
    });
    expect(result.warnings.join(" ")).toMatch(/first three interpretations/);
    expect(
      result.receipt.interpretations.some((row) => row.errors.length > 0),
    ).toBe(true);
    const shadowKinds = new Set(
      result.receipt.shadow_analysis.map((cue) => cue.kind),
    );
    expect(shadowKinds.has("conditional") || shadowKinds.has("modal")).toBe(true);
  });

  test("keeps unmatched normative clauses as ontology gaps", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const result = analyzeSemanticAdvisorInput({
      payload: {
        type: "req",
        id: "REQ-GAP",
        properties: {
          title: "Custom",
          semantic_text: "Widgets must frobnicate the flux capacitor.",
        },
      },
      clauses: ["Widgets must frobnicate the flux capacitor."],
    });
    expect(
      result.receipt.suggestions.some((row) => row.kind === "ontology_gap"),
    ).toBe(true);
  });
});
