import { createHash } from "node:crypto";
import {
  type LogicRuleIR,
  logicSemanticKey,
  utf8Span,
  validateLogicIr,
} from "../../logic/ir.js";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../semantic-advisor/clauses.js";
import { semanticSourceHash } from "../semantic-advisor/shared.js";

export interface LogicApplyPlanInput {
  readonly text: string;
  readonly logic: LogicRuleIR;
  readonly source: string;
  readonly requirementId?: string;
  readonly existingLogicClaims?: readonly string[];
  readonly claimKey?: string;
  readonly claimText?: string;
}

export interface LogicApplyPlanResult {
  readonly normalized: LogicRuleIR;
  readonly ruleHash: string;
  readonly semanticKey: string;
  readonly claimKey: string;
  readonly claimText: string;
  readonly renderedProlog: string;
  readonly applyPlan: Array<Record<string, unknown>>;
}

function shortId(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

export function logicRuleFactId(semanticKey: string): string {
  return `FACT-RULE-${shortId(semanticKey)}`;
}

export function buildLogicApplyPlan(
  input: LogicApplyPlanInput,
): LogicApplyPlanResult {
  const validation = validateLogicIr(input.logic);
  if (
    !validation.valid ||
    !validation.normalized ||
    !validation.ruleHash ||
    !validation.semanticKey ||
    !validation.renderedProlog
  ) {
    throw new Error(
      `Logic IR validation failed: ${validation.errors.join("; ")}`,
    );
  }
  const sourceText = input.claimText?.trim() || input.text.trim();
  const claimText = normalizeSemanticClause(sourceText);
  const claimKey = input.claimKey || semanticClaimKey(claimText);
  const semanticKey = logicSemanticKey(validation.normalized);
  const schemaId =
    validation.normalized.ruleSchemaId ?? "FACT-RULE-SCHEMA-LOGIC-V1";
  const ruleId = logicRuleFactId(semanticKey);
  const claimStart = input.text.indexOf(claimText);
  const span = utf8Span(
    input.text,
    claimStart >= 0 ? claimStart : 0,
    claimStart >= 0 ? claimStart + claimText.length : claimText.length,
  );
  const logicClaims = Array.from(
    new Set([...(input.existingLogicClaims ?? []), claimKey]),
  );
  const schemaPlan = input.logic.ruleSchemaId
    ? []
    : [
        {
          type: "fact",
          id: schemaId,
          properties: {
            title: "kibi.logic.v1 rule schema",
            status: "active",
            source: input.source,
            fact_kind: "rule_schema",
            rule_name: "kibi.logic.v1",
            argument_names: ["rule_ir"],
            argument_types: ["logic_ir"],
            aliases: ["conditional rule", "constraint", "policy rule"],
            examples: [validation.renderedProlog],
          },
          relationships: [],
        },
      ];
  return {
    normalized: validation.normalized,
    ruleHash: validation.ruleHash,
    semanticKey,
    claimKey,
    claimText,
    renderedProlog: validation.renderedProlog,
    applyPlan: [
      ...schemaPlan,
      {
        type: "fact",
        id: ruleId,
        properties: {
          title: `${validation.normalized.kind} rule ${semanticKey}`,
          status: "active",
          source: input.source,
          fact_kind: "rule",
          rule_ir: validation.normalized,
          rule_hash: validation.ruleHash,
          semantic_key: semanticKey,
          rule_schema_id: schemaId,
          rule_name: validation.normalized.ruleSchemaId ?? "kibi.logic.v1",
          canonical_key: semanticKey,
          claim_key: claimKey,
          claim_text: claimText,
          claim_span_start: span.start,
          claim_span_end: span.end,
          tags: ["lane:logic", "logic-ir-v1"],
        },
        relationships: [],
      },
      {
        type: "req",
        id: input.requirementId ?? `REQ-LOGIC-${shortId(claimText)}`,
        properties: {
          title: claimText.split(/[.!?]/, 1)[0] || "Typed logical requirement",
          status: "open",
          source: input.source,
          semantic_text: input.text.trim(),
          logic_claims: logicClaims,
          semantic_clauses: [claimText],
          semantic_inventory_version: "kibi.semantic-inventory.v1",
          semantic_source_field: "semantic_text",
          semantic_source_hash: semanticSourceHash(input.text.trim()),
          semantic_inventory: [
            {
              claim_key: claimKey,
              claim_text: claimText,
              role: /\b(?:must|shall|should|required|requires?)\b/i.test(
                claimText,
              )
                ? "normative"
                : "descriptive",
              status: "modeled",
              span,
              semantic_key: semanticKey,
            },
          ],
        },
        relationships: [
          {
            type: "requires_rule",
            from: input.requirementId ?? `REQ-LOGIC-${shortId(claimText)}`,
            to: ruleId,
          },
        ],
      },
    ],
  };
}
