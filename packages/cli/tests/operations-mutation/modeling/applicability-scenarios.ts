import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";

export type Scenario = Readonly<{
  name: string;
  schema?: Record<string, unknown>;
  text: string;
  score?: number;
  components?: Record<string, number>;
  explicitSchema?: boolean;
}>;

export function rankedFor(scenario: Scenario) {
  return {
    schema: {
      id: "F",
      predicate_name: "zz_none",
      title: "",
      description: "",
      argument_names: [],
      argument_types: [],
      keywords: [],
      examples: [],
      tags: [],
      usage_hints: { use_when: [], do_not_use_when: [] },
      ...scenario.schema,
    } as unknown as PredicateSchemaCandidate,
    score: scenario.score ?? 0.5,
    components: {
      exact_pattern: 0,
      keyword_hits: 0,
      descriptor_overlap: 0,
      usage_match: 0,
      negative_evidence: 0,
      broad_token_penalty: 0,
      specificity_bonus: 0,
      total: scenario.score ?? 0.5,
      ...scenario.components,
    },
  };
}

const hints = (use_when: string[], do_not_use_when: string[] = []) => ({
  usage_hints: { use_when, do_not_use_when },
});

export const SCENARIOS: readonly Scenario[] = [
  { name: "no normative intent", text: "Plain words here." },
  { name: "a leading no is intent", text: "  No widgets." },
  { name: "no must stand alone", text: "Notes widgets." },
  { name: "baseline must", text: "Widgets must render." },
  { name: "high lexical score", text: "Widgets must render.", score: 1 },
  { name: "zero lexical score", text: "Widgets must render.", score: 0 },
  {
    name: "exact pattern at the threshold",
    text: "Widgets must render.",
    components: { exact_pattern: 0.9 },
  },
  {
    name: "exact pattern below the threshold",
    text: "Widgets must render.",
    components: { exact_pattern: 0.89 },
  },
  {
    name: "negative ranking evidence",
    text: "Widgets must render.",
    score: 1,
    components: { negative_evidence: 0.5 },
  },
  {
    name: "negative ranking evidence capped",
    text: "Widgets must render.",
    score: 1,
    components: { negative_evidence: 3, exact_pattern: 1 },
  },
  {
    name: "positive hint by two cues",
    schema: hints(["alpha bravo charlie"]),
    text: "Charlie must alpha.",
  },
  {
    name: "positive hint needs two cues",
    schema: hints(["alpha bravo charlie"]),
    text: "Charlie must go.",
  },
  {
    name: "positive hint by its only cue",
    schema: hints(["alpha xyz"]),
    text: "Alpha must go.",
  },
  {
    name: "positive hint by exact phrase",
    schema: hints(["use when x-ray scans"]),
    text: "X ray scans must go.",
  },
  {
    name: "positive hint for phrase",
    schema: hints(["use for x-ray scans"]),
    text: "X ray scans must go.",
  },
  {
    name: "hint of short words only",
    schema: hints(["a an the xyz"]),
    text: "A an the xyz must go.",
  },
  {
    name: "two positive hints",
    schema: hints(["alpha bravo", "charlie delta", "echo foxtrot"]),
    text: "Alpha bravo charlie delta must go.",
  },
  ...["when", "this", "that", "with", "from"].map(
    (word): Scenario => ({
      name: `hint stop word ${word}`,
      schema: hints([`${word} alpha`]),
      text: "Alpha must go.",
    }),
  ),
  {
    name: "negative hint by coverage",
    schema: hints([], ["do not use when billing invoices overdue"]),
    text: "Billing invoices must go.",
  },
  {
    name: "negative hint needs coverage",
    schema: hints([], ["do not use when billing invoices overdue"]),
    text: "Billing must go.",
  },
  {
    name: "negative hint coverage rounds up",
    schema: hints([], ["alpha bravo charlie delta echo"]),
    text: "Alpha bravo must go.",
  },
  {
    name: "negative hint coverage met",
    schema: hints([], ["alpha bravo charlie delta echo"]),
    text: "Alpha bravo charlie must go.",
  },
  {
    name: "negative hint by exact phrase",
    schema: hints([], ["do not use for x-ray scans"]),
    text: "X ray scans must go.",
  },
  {
    name: "negative hint phrase with when",
    schema: hints([], ["do not use when x-ray scans"]),
    text: "X ray scans must go.",
  },
  {
    name: "catalog hints apply",
    schema: {
      predicate_name: "dependency_resolution_policy",
      usage_hints: undefined,
    },
    text: "The launcher must resolve packages without downloading them.",
  },
  {
    name: "specificity from every descriptor",
    schema: {
      predicate_name: "zz_none_alpha",
      aliases: ["bravo"],
      paraphrase_templates: ["charlie"],
      keywords: ["delta", "abc"],
    },
    text: "Alpha bravo charlie delta must go.",
  },
  {
    name: "specificity over many descriptors",
    schema: {
      keywords: [
        "alpha",
        "bravo",
        "charlie",
        "delta",
        "echo",
        "golf",
        "hotel",
        "india",
      ],
    },
    text: "Alpha bravo must go.",
  },
  {
    name: "short cues are no specificity",
    schema: { keywords: ["abc", "xyz"] },
    text: "Abc xyz must go.",
  },
  {
    name: "allOf satisfied",
    schema: { predicate_name: "offline_behavior_rule" },
    text: "Sync must be resilient offline.",
  },
  {
    name: "allOf one group missing",
    schema: { predicate_name: "offline_behavior_rule" },
    text: "Sync must work offline.",
  },
  {
    name: "allOf every group missing",
    schema: { predicate_name: "offline_behavior_rule" },
    text: "Sync must work.",
  },
  {
    name: "anyOf satisfied",
    schema: { predicate_name: "exception_rule" },
    text: "Exports must be signed unless local.",
  },
  {
    name: "anyOf missing",
    schema: { predicate_name: "exception_rule" },
    text: "Exports must be signed.",
  },
  {
    name: "one prohibited cue",
    schema: { predicate_name: "rate_limit" },
    text: "Upload requests must be limited per minute.",
  },
  {
    name: "explicit schema named by the claim",
    schema: {
      predicate_name: "route_access",
      argument_names: ["role", "route_name"],
    },
    text: "The admin role must access the route by route name.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema missing an argument word",
    schema: {
      predicate_name: "route_access",
      argument_names: ["role", "route_name"],
    },
    text: "The admin role must access the route.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema missing the predicate",
    schema: { predicate_name: "route_access", argument_names: ["role"] },
    text: "The role must go.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema with short predicate words",
    schema: { predicate_name: "ab_cd", argument_names: ["xy"] },
    text: "Nothing must go.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema words need a word start",
    schema: { predicate_name: "route_access", argument_names: [] },
    text: "Reroute must go.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema above the floor",
    schema: { predicate_name: "route_access", argument_names: [] },
    text: "Route must go.",
    score: 1,
    components: { exact_pattern: 1 },
    explicitSchema: true,
  },
  {
    name: "explicit schema still rejected by a prohibited cue",
    schema: { predicate_name: "rate_limit", argument_names: [] },
    text: "Rate upload requests must be limited per minute.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "not explicit",
    schema: { predicate_name: "route_access", argument_names: [] },
    text: "Route must go.",
    score: 0,
    explicitSchema: false,
  },
  {
    name: "strong evidence is eligible",
    schema: {
      predicate_name: "offline_behavior_rule",
      keywords: ["offline", "sync", "resilient"],
    },
    text: "Sync must be resilient offline.",
    score: 0.9,
    components: { exact_pattern: 0.95 },
  },
  {
    name: "a schema without usage hints",
    schema: { usage_hints: undefined },
    text: "Widgets must render.",
  },
  {
    name: "a hint or keyword without words",
    schema: { keywords: ["!!!"], ...hints(["!!!"]) },
    text: "Stryker must render.",
  },
  {
    name: "short and stop words are no hint cues",
    schema: hints(["when", "this", "that", "with", "from", "use it"]),
    text: "When this happens, that must come from with use.",
  },
  {
    name: "a negative hint counts on its exact phrase",
    schema: hints([], ["Do not use when kafka."]),
    text: "Kafka must go.",
  },
  {
    name: "a negative hint phrase is not the whole cue set",
    schema: hints([], ["kafka do not use when go", "kafka use for go"]),
    text: "Kafka go must stay.",
  },
  {
    name: "a negative hint prefix allows repeated spaces",
    schema: hints([], ["do  not  use  when  kafka", "use  for  zookeeper"]),
    text: "Kafka must go. Zookeeper must go.",
  },
  {
    name: "a negative hint without a prefix",
    schema: hints([], ["use when kafka", "use for zookeeper", "usewhen kafka"]),
    text: "Zookeeper must go.",
  },
  {
    name: "a negative hint phrase joins words with one space",
    schema: hints([], ["kafka, go"]),
    text: "Kafka go must stay.",
  },
  {
    name: "explicit schema words match any case",
    schema: { predicate_name: "widget_render", argument_names: ["Owner"] },
    text: "WIDGET OWNER must render.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema needs only one predicate word",
    schema: { predicate_name: "widget_render", argument_names: [] },
    text: "The widget must go.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema argument without words",
    schema: { predicate_name: "widget_render", argument_names: ["!!!"] },
    text: "The widget must go.",
    score: 0,
    explicitSchema: true,
  },
  {
    name: "explicit schema names what the claim does not state",
    schema: {
      predicate_name: "route_access",
      argument_names: ["role", "route_name"],
    },
    text: "Users must wait.",
    score: 0,
    explicitSchema: true,
  },
];
