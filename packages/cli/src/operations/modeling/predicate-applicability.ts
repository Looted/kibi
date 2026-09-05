import {
  type RankedPredicateSchema,
  usageHintsForSchema,
} from "./predicate-ranker.js";
import type { PredicateSchemaCandidate } from "./predicate-types.js";

export const MIN_APPLICABILITY_SCORE = 0.62;
export const STRONG_APPLICABILITY_SCORE = 0.8;
export const WEAK_CANDIDATE_MARGIN = 0.06;

type IntentRule = {
  readonly allOf?: readonly (readonly RegExp[])[];
  readonly anyOf?: readonly RegExp[];
  readonly prohibited?: readonly RegExp[];
};

const NORMATIVE_OR_VALIDITY_PATTERN =
  /\b(?:must|shall|should|required|requires?|may\s+only|only\s+.+?\s+(?:may|can)|must\s+not|shall\s+not|cannot|can't|allowed|denied|forbidden|prohibited|invalid|unresolved|reject(?:s|ed|ion)?|fail(?:s|ed|ure)?\s+(?:clearly|explicitly|with)|defaults?\s+to|states?\s+are|owned\s+by|initializes?\s+after|before|unless|when|if|(?:exception|exempt)\s+(?:to|from|when|if|unless))\b/i;

function expressesNormativeOrValidityIntent(text: string): boolean {
  return /^\s*no\b/i.test(text) || NORMATIVE_OR_VALIDITY_PATTERN.test(text);
}

const INTENT_RULES: Readonly<Record<string, IntentRule>> = {
  state: {
    allOf: [
      [/\bstate\b|\bmode\b/i],
      [/\benter|\bidle\b|\bactive\b|\bdraft\b|\bedit\b/i],
    ],
    prohibited: [/states?\s+are|one\s+of|transitions?\s+from/i],
  },
  retention_policy: {
    allOf: [
      [/retain|retention/i],
      [/exist|duration|days?|months?|years?|weeks?|hours?/i],
    ],
    prohibited: [/rate\s+limit|session\s+expir|latency|timeout/i],
  },
  offline_behavior_rule: {
    allOf: [[/offline/i], [/non[- ]blocking|resilien|synchron|gameplay/i]],
  },
  dependency_resolution_policy: {
    allOf: [
      [/dependenc|package|module|plugin|mcp/i],
      [/resolv|locat|load|execut|acquir/i],
      [
        /consumer[- ]local|project[- ]local|plugin[- ]local|consumer[- ]scoped|workspace\s+(?:scope|semantics)|global(?:\s+fallback|\s+installation|\s+runtime)?|without\s+(?:downloading|installing)|no\s+(?:download|global\s+fallback)|must\s+not\s+(?:download|install)|acquisition\s+(?:policy|restriction)/i,
      ],
    ],
    prohibited: [
      /ordered|first\s+then|deterministic\s+order|resolution\s+order|child\s+process|invalid|ambiguous|missing|actionable|failure/i,
    ],
  },
  ordered_resolution_strategy: {
    allOf: [
      [/resolv|lookup|candidate|source|dependency/i],
      [/ordered|first|then|priority|candidates?|workspace|cwd/i],
    ],
    prohibited: [/invalid|ambiguous|placeholder|child\s+process|spawn/i],
  },
  resolution_failure_policy: {
    allOf: [
      [/invalid|ambiguous|placeholder|root|usable|reject|fail|error/i],
      [/resolv|input|condition|clear|outcome|fail/i],
    ],
    prohibited: [/child\s+process|spawn|stdio|package-manager.*exception/i],
  },
  process_delegation_contract: {
    allOf: [
      [
        /child\s+process|spawn|executable|cwd|working\s+directory|environment|env|stdio|terminat|exit/i,
      ],
      [/launcher|delegate|delegat|process|command|spawn/i],
    ],
    prohibited: [
      /dependency\s+resolution|invalid\s+placeholder|ambiguous\s+root/i,
    ],
  },
  failure_behavior: {
    allOf: [
      [
        /failure|fail|missing(?:\s+\S+){0,4}\s+dependenc|missing\s+(?:project[- ]local\s+)?(?:kibi[- ]mcp|package|module)|dependenc\w*\s+(?:is\s+)?missing|unavailable|exception|error\s+(?:behavior|outcome|handling|occurs)|errors\s+(?:or|and)\s+(?:timeouts?|failures?)/i,
      ],
      [/report|outcome|actionable|clear|return|surface|throw|leave|recover/i],
    ],
    prohibited: [
      /invalid\s+placeholder|ambiguous\s+root|ordered\s+source|child\s+process/i,
    ],
  },
  abstraction_boundary_rule: {
    allOf: [
      [
        /renderer[- ]neutral|vendor[- ]neutral|implementation[- ]neutral|swappable|abstraction/i,
      ],
      [/persist|contract|api\b|data|scene|replace|storage/i],
    ],
    prohibited: [/permission|delete|export/i],
  },
  exception_rule: {
    // Package-manager wording can provide context for an exception, but it
    // is not itself an exception claim. Require an explicit exception
    // relationship so descriptive documentation cannot select this rule.
    anyOf: [
      /\bunless\b/i,
      /\bexcept\s+(?:when|if|for|that)\b/i,
      /\b(?:is|are|remains?|constitutes?)\s+(?:the\s+)?(?:only\s+)?exception\s+to\b/i,
      /\b(?:is|are|remains?)\s+exempt\s+(?:from|unless|when|if)\b/i,
    ],
    prohibited: [/child\s+process|stdio|ordered\s+source/i],
  },
  permission_rule: {
    allOf: [
      [/only|may|can|allowed|denied|forbidden|must\s+not|cannot/i],
      [/delete|export|access|read|write|update|remove|manage|permission/i],
    ],
  },
  resource_constraint: {
    allOf: [
      [
        /latency|timeout|throughput|quota|memory|cpu|size|resource|response\s+time|upload|download|payload|attachment|file|complete[sd]?\s+in\b|duration|frame\s+rate|\bfps\b/i,
      ],
      [
        /at\s+most|at\s+least|not\s+exceed|maximum|minimum|under|below|above|within|limit|bounded|enforced|<[=>]?\s*\d|\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|s|seconds?|mb|gb|fps|%)?\b/i,
      ],
    ],
    prohibited: [
      /only|allowed|denied|forbidden|permission|authorize|must\s+not\s+(?:delete|export|access|write|update|remove|manage)/i,
    ],
  },
  migration_boundary_rule: {
    allOf: [
      [/legacy|migration|fabricdata/i],
      [
        /canonical|migration\s+input|compatibility|only\s+(?:be\s+)?(?:read|used)|read\s+only/i,
      ],
    ],
    prohibited: [/converted\s+once|no\s+data\s+loss|one[- ]time\s+conversion/i],
  },
  uniqueness_constraint: {
    allOf: [[/at\s+most\s+one|unique|uniqueness/i], [/\bper\b|scope|within/i]],
    prohibited: [/rate\s+limit|per\s+(?:second|minute|hour|day|window)/i],
  },
  state_membership: {
    allOf: [
      [/states?\s+are|terminal\s+states?|allowed\s+states?|one\s+of/i],
      [/\bstate|ready|anonymous|terminal|allowed|enumerated/i],
    ],
    prohibited: [/transitions?\s+from/i],
  },
  conditional_behavior: {
    allOf: [
      [/^\s*(?:if|when)\b|\b(?:if|when)\b/i],
      [/\bmust\b|\bshall\b|\bshould\b|\bbecomes?\b|\bthen\b/i],
    ],
    anyOf: [
      /^when\s+.+?,\s*(?:the\s+)?.+?\s+(?:must|shall|should)\s+/i,
      /^if\s+.+?,\s*(?:it|they|the\s+.+?)\s+(?:becomes?|must|shall|should)\b/i,
    ],
  },
  rate_limit: {
    allOf: [
      [/rate|frequency|repeated|requests?|actions?|operations?/i],
      [
        /per\s+(?:second|minute|hour|day|window)|every\s+\w+|time\s+window|window/i,
      ],
    ],
    prohibited: [/upload|download|payload|attachment|file\s+size/i],
  },
  data_residency_rule: {
    allOf: [
      [/stored|processed|kept/i],
      [/region|jurisdiction|country|zone|area/i],
    ],
    prohibited: [/redis|cache|memory|bucket|database\s+instance/i],
  },
  coding_standard_rule: {
    allOf: [
      [/use|avoid/i],
      [/api|apis|code|framework|hook|pattern|signal|schema|type|computed/i],
    ],
    prohibited: [/user|admin|access|permission|mfa|customer/i],
  },
  release_gate_rule: {
    allOf: [
      [/release|deploy|testflight|app\s+store|distribution|build/i],
      [/pass|gate|before|configuration/i],
    ],
    prohibited: [/checkout|payment|fraud|workflow|capture/i],
  },
  security_configuration_rule: {
    allOf: [
      [/security|database|deployment|function|rpc|search_path|trigger/i],
      [/explicit|configuration|setting/i],
    ],
    prohibited: [/display\s+label|ui|profile\s+field/i],
  },
  absence_requirement: {
    anyOf: [/\bno\b|absent|removed|not\s+exist|must\s+not\s+exist/i],
  },
  fail_closed_authorization_rule: {
    allOf: [
      [
        /fail[- ]closed|deny|denied|reject|never\s+fall\s+back|without\s+(?:creating|falling)/i,
      ],
      [
        /invalid|missing|unauthorized|unauthenticated|error|timeout|expired|fallback|role|credential/i,
      ],
    ],
    prohibited: [
      /defaults?\s+to\s+(?:a\s+)?(?:student|user|role|identity)\b(?!\s+must)/i,
    ],
  },
  deployment_precondition_rule: {
    allOf: [
      [/deploy(?:ment|ed|ing)?|rollout|release/i],
      [
        /hold|block|abort|precondition|unsupported|before\s+(?:the\s+)?(?:release|deployment|rollout)/i,
      ],
    ],
    prohibited: [/checkout|payment|fraud|workflow|capture/i],
  },
  data_migration_rule: {
    allOf: [
      [/conver(?:t|s(?:ion|ions))|migrat/i],
      [/once|one[- ]time|no\s+data\s+loss|canonical|before/i],
    ],
    prohibited: [
      /may\s+only\s+be\s+read|migration\s+input|never\s+fall\s+back|reads?\s+only/i,
    ],
  },
  diagnostic_visibility_rule: {
    allOf: [
      [
        /log(?:ged|ging)?|silent|not\s+shown|never\s+shown|internal\s+detail|raw/i,
      ],
      [/user|ui\b|friendly|actionable|shown|display|message|debugging/i],
    ],
    prohibited: [/audit\s+log|consent/i],
  },
  mutation_authority_rule: {
    allOf: [
      [/read[- ]only|server[- ]side|row[- ]level|\brls\b|trigger/i],
      [/client|view|surface|api|table|service|notification|ui\b/i],
    ],
    prohibited: [/delete|export|remove|permission/i],
  },
  request_deduplication_rule: {
    allOf: [
      [/deduplicat|coalesc|in[- ]flight/i],
      [/request|quer(?:y|ies)|fetch|call|parallel|redundant/i],
    ],
    prohibited: [/rate\s+limit|batch/i],
  },
  async_boundary_rule: {
    allOf: [
      [
        /synchron(?:ous|ously)|not\s+await|defer|background|in\s+flight|non[- ]blocking/i,
      ],
      [/callback|handler|refresh|operation|work|action|ui\b/i],
    ],
    prohibited: [/timeout|rate\s+limit/i],
  },
  canonical_identifier_rule: {
    allOf: [[/canonical/i], [/identifier|\bid\b|videoid|key|resolve/i]],
    prohibited: [/renderer[- ]neutral|legacy/i],
  },
  responsive_breakpoint_rule: {
    allOf: [
      [/breakpoint|landscape|portrait|viewport|responsive/i],
      [/mobile|desktop|tablet|width|height|px\b/i],
    ],
    prohibited: [/server|database/i],
  },
  operational_pause_rule: {
    allOf: [
      [/pause|halt|suspend|kill\s*switch|freeze/i],
      [/block|new|preserve|existing|resumable|continue/i],
    ],
    prohibited: [/deletion|soft\s+delete/i],
  },
};

function round(value: number): number {
  return Math.round(Math.max(0, Math.min(0.98, value)) * 100) / 100;
}

function countHintCues(
  text: string,
  values: readonly string[] | undefined,
  minimumCoverage = 0,
): number {
  if (!values) return 0;
  const lower = text.toLowerCase();
  return values.reduce((count, value) => {
    const cues = (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
      (cue) =>
        cue.length > 3 &&
        !["when", "this", "that", "with", "from", "use"].includes(cue),
    );
    if (cues.length === 0) return count;
    const matched = cues.filter((cue) => lower.includes(cue)).length;
    // A single generic word from a do_not_use_when sentence is not negative
    // evidence. Require an exact phrase or at least two meaningful cues.
    const phrase = value
      .toLowerCase()
      .replace(/^do\s+not\s+use\s+(?:when|for)\s+/, "")
      .replace(/^use\s+(?:when|for)\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const exactPhrase = phrase.length > 0 && lower.includes(phrase);
    const requiredMatches =
      minimumCoverage > 0
        ? Math.max(2, Math.ceil(cues.length * minimumCoverage))
        : Math.min(2, cues.length);
    return count + (exactPhrase || matched >= requiredMatches ? 1 : 0);
  }, 0);
}

function specificityEvidence(
  schema: PredicateSchemaCandidate,
  text: string,
): number {
  const values = [
    schema.predicate_name,
    ...(schema.aliases ?? []),
    ...(schema.paraphrase_templates ?? []),
    ...schema.keywords,
  ];
  const lower = text.toLowerCase();
  const hits = values.reduce((count, value) => {
    const cues = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return (
      count +
      (cues.some((cue) => cue.length > 3 && lower.includes(cue)) ? 1 : 0)
    );
  }, 0);
  return Math.min(1, hits / Math.max(3, values.length / 2));
}

export interface SemanticApplicability {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly applicabilityScore: number;
}

/**
 * Evaluate semantic fit after retrieval and before argument binding. The
 * function deliberately does not inspect argument values: complete-looking
 * terms cannot make a semantically unrelated schema eligible.
 */
export function evaluateSemanticApplicability(
  ranked: RankedPredicateSchema,
  text: string,
): SemanticApplicability {
  const schema = ranked.schema;
  const rule = INTENT_RULES[schema.predicate_name];
  const usageHints = usageHintsForSchema(schema);
  const positiveHints = countHintCues(text, usageHints?.use_when);
  const negativeHints = countHintCues(text, usageHints?.do_not_use_when, 0.6);
  const specific = specificityEvidence(schema, text);
  const reasons: string[] = [];
  if (!expressesNormativeOrValidityIntent(text)) {
    reasons.push("prose does not express normative or validity intent");
  }
  let positive = specific + positiveHints * 0.16;
  let negative =
    negativeHints * 0.2 + ranked.components.negative_evidence * 0.45;
  if (ranked.components.exact_pattern >= 0.9) {
    // Exact structural scorers are reviewed semantic patterns, not mere token
    // overlap. They may satisfy the baseline intent evidence unless an
    // explicit contradictory cue below rejects them.
    positive += 0.38;
  }

  if (rule?.allOf) {
    for (const group of rule.allOf) {
      if (group.some((pattern) => pattern.test(text))) positive += 0.22;
      else
        reasons.push(
          `required semantic cue absent for ${schema.predicate_name}`,
        );
    }
    // A declared intent rule that satisfies every cue group is meaningful
    // semantic evidence even when lexical retrieval was weak (for example,
    // "timeout must not exceed 30 seconds" versus a short schema keyword
    // list). Give that complete match a bounded applicability lift.
    if (
      rule.allOf.every((group) => group.some((pattern) => pattern.test(text)))
    )
      positive += 0.2;
  }
  if (rule?.anyOf && !rule.anyOf.some((pattern) => pattern.test(text))) {
    reasons.push(`intent cues do not describe ${schema.predicate_name}`);
  } else if (rule?.anyOf) {
    positive += 0.26;
  }
  const prohibited = [...(rule?.prohibited ?? [])].filter((pattern) =>
    pattern.test(text),
  );
  if (prohibited.length > 0) {
    negative += prohibited.length * 0.35;
    reasons.push(
      `prohibited or contradictory cue: ${prohibited
        .map((pattern) => pattern.source)
        .join(", ")}`,
    );
  }
  if (negativeHints > 0) {
    reasons.push(
      "usage guidance says this schema is not for the supplied intent",
    );
  }

  const score = round(
    ranked.score * 0.42 +
      Math.min(1, positive) * 0.58 -
      Math.min(1, negative) * 0.46,
  );
  if (score < MIN_APPLICABILITY_SCORE) {
    reasons.push(
      `applicability score ${score.toFixed(2)} is below conservative threshold ${MIN_APPLICABILITY_SCORE.toFixed(2)}`,
    );
  }
  return {
    eligible: reasons.length === 0 && score >= MIN_APPLICABILITY_SCORE,
    reasons: Array.from(new Set(reasons)),
    applicabilityScore: score,
  };
}
