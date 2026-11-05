import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";

const BASE = {
  id: "F",
  predicate_name: "zz_pred",
  title: "t",
  description: "d",
  argument_names: [],
  argument_types: [],
  keywords: [],
  examples: [],
  tags: [],
  usage_hints: { use_when: [], do_not_use_when: [] },
};

export function schemaWith(
  overrides: Record<string, unknown>,
): PredicateSchemaCandidate {
  return { ...BASE, ...overrides } as unknown as PredicateSchemaCandidate;
}

export const STOPWORD_LIST = [
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "if",
  "in",
  "is",
  "it",
  "may",
  "must",
  "of",
  "on",
  "or",
  "should",
  "shall",
  "the",
  "their",
  "then",
  "this",
  "to",
  "when",
  "where",
  "with",
];

export const BROAD_LIST = [
  "change",
  "changes",
  "component",
  "data",
  "published",
  "project",
  "state",
  "system",
  "value",
];

type Scenario = readonly [string, Record<string, unknown>, string];

const FIXED: Scenario[] = [
  ["one keyword hit", { keywords: ["alpha"] }, "alpha"],
  [
    "keywords halve past six",
    {
      keywords: ["alpha", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"],
    },
    "alpha",
  ],
  [
    "two hits among four keywords",
    { keywords: ["alpha", "beta", "b3", "b4"] },
    "alpha beta",
  ],
  [
    "seven keywords still divide by three",
    { keywords: ["alpha", "b1", "b2", "b3", "b4", "b5", "b6"] },
    "alpha",
  ],
  ["stem-only keyword match", { keywords: ["policy"] }, "policies apply"],
  ["descriptor overlap at a quarter", { description: "aa bb cc dd" }, "aa"],
  [
    "descriptor overlap below a quarter",
    { description: "aa bb cc dd ee" },
    "aa",
  ],
  ["descriptor of stop words only", { description: "the and" }, "the and"],
  [
    "usage match at a quarter",
    { usage_hints: { use_when: ["aa bb cc dd"], do_not_use_when: [] } },
    "aa",
  ],
  [
    "usage match below a quarter",
    { usage_hints: { use_when: ["aa bb cc dd ee"], do_not_use_when: [] } },
    "aa",
  ],
  [
    "usage and negative evidence",
    {
      keywords: ["alpha"],
      usage_hints: { use_when: ["alpha beta"], do_not_use_when: ["alpha"] },
    },
    "alpha beta",
  ],
  [
    "negative evidence alone",
    { usage_hints: { use_when: [], do_not_use_when: ["alpha"] } },
    "alpha",
  ],
  [
    "broad terms penalized",
    { keywords: ["alpha"] },
    "alpha data system value state change",
  ],
  [
    "broad terms capped",
    { keywords: ["alpha"] },
    "alpha data system value state change changes component published project data system",
  ],
  [
    "broad keyword not penalized",
    { keywords: ["alpha", "data"] },
    "alpha data",
  ],
  [
    "aliases and templates widen descriptors",
    { aliases: ["gamma delta"], paraphrase_templates: ["epsilon"] },
    "gamma delta epsilon",
  ],
  [
    "template alone is a descriptor",
    { paraphrase_templates: ["epsilon"] },
    "epsilon",
  ],
  ["title is a descriptor", { title: "omega" }, "omega"],
  [
    "predicate name is a descriptor",
    { predicate_name: "zz_omega" },
    "omega zz",
  ],
  ["examples are descriptors", { examples: ["zeta(eta)"] }, "zeta eta"],
  [
    "specificity capped",
    {
      aliases: ["a1 a2 a3 a4 a5 a6 a7 a8 a9 b1 b2 b3 b4 b5 b6 b7 b8 b9"],
      keywords: ["alpha"],
    },
    "alpha",
  ],
  [
    "templates add specificity",
    { paraphrase_templates: ["p1 p2 p3"], keywords: ["alpha"] },
    "alpha",
  ],
  [
    "broad alias tokens add no specificity",
    { aliases: ["data system value the"], keywords: ["alpha"] },
    "alpha",
  ],
  [
    "launcher bridge penalty",
    { predicate_name: "plugin_launcher_contract", keywords: ["alpha"] },
    "alpha",
  ],
  [
    "launcher bridge penalty without evidence",
    { predicate_name: "plugin_launcher_contract" },
    "nothing",
  ],
  [
    "exact pattern",
    { predicate_name: "temporal_order" },
    "The renderer initializes after the store is ready.",
  ],
  [
    "exact pattern for the launcher",
    { predicate_name: "plugin_launcher_contract", aliases: ["x"] },
    "nothing",
  ],
  [
    "exact miss with evidence",
    { predicate_name: "visual_layout_rule", keywords: ["alpha"] },
    "alpha",
  ],
  [
    "exact miss without evidence",
    { predicate_name: "visual_layout_rule" },
    "alpha",
  ],
  ["first scorer decides", { predicate_name: "conditional_behavior" }, "alpha"],
  ["no evidence", {}, "nothing here"],
  ["modal keyword", { keywords: ["can"] }, "users can read"],
  ["modal may keyword", { keywords: ["may"] }, "users may read"],
  ["stop-word keyword", { keywords: ["the"] }, "the user"],
  ["broad-only keyword", { keywords: ["data"] }, "the data"],
  [
    "broad keyword with a domain token",
    { keywords: ["data export"] },
    "the data export",
  ],
  [
    "catalog usage hints",
    { predicate_name: "dependency_resolution_policy", usage_hints: undefined },
    "permitted dependency scope and acquisition download policy",
  ],
  [
    "no usage hints anywhere",
    { usage_hints: undefined, keywords: ["alpha"] },
    "alpha",
  ],
  ["uppercase keyword stems", { keywords: ["POLICY"] }, "policies apply"],
  ["ies stem above five letters", { keywords: ["abcy"] }, "abcies"],
  ["ies stem at five letters", { keywords: ["bry"] }, "bries"],
  ["ies at five letters strips s", { keywords: ["brie"] }, "bries"],
  ["ing stem above four letters", { keywords: ["ab"] }, "abing"],
  ["ing stem at four letters", { keywords: ["b"] }, "bing"],
  ["ed stem above four letters", { keywords: ["abc"] }, "abced"],
  ["ed stem at four letters", { keywords: ["br"] }, "bred"],
  ["s stem above four letters", { keywords: ["abcd"] }, "abcds"],
  ["s stem at four letters", { keywords: ["bcd"] }, "bcds"],
  ["ies needs the suffix", { keywords: ["abcdey"] }, "abcdex"],
  ["ing needs the suffix", { keywords: ["abc"] }, "abcde"],
];

export const SCENARIOS: readonly Scenario[] = [
  ...FIXED,
  ...STOPWORD_LIST.map(
    (word): Scenario => [
      `stop word ${word}`,
      { keywords: [word] },
      `${word} qq`,
    ],
  ),
  ...BROAD_LIST.map(
    (word): Scenario => [
      `broad keyword ${word}`,
      { keywords: [word] },
      `qq ${word}`,
    ],
  ),
  ...BROAD_LIST.map(
    (word): Scenario => [
      `broad text ${word}`,
      { keywords: ["alpha"] },
      `alpha ${word}`,
    ],
  ),
];
