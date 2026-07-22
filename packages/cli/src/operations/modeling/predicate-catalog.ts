import type { PredicateSchemaCandidate, PredicateUsageHints } from "./predicate-types.js";
import { PREDICATE_CATALOG_1 } from "./predicate-catalog-1.js";
import { PREDICATE_CATALOG_2 } from "./predicate-catalog-2.js";
import { PREDICATE_CATALOG_3 } from "./predicate-catalog-3.js";
import { PREDICATE_CATALOG_4 } from "./predicate-catalog-4.js";
import { PREDICATE_USAGE_HINTS_1 } from "./predicate-usage-hints-1.js";
import { PREDICATE_USAGE_HINTS_2 } from "./predicate-usage-hints-2.js";
import { PREDICATE_USAGE_HINTS_3 } from "./predicate-usage-hints-3.js";

// implements REQ-mcp-suggest-predicates
export const DEFAULT_USAGE_HINTS: PredicateUsageHints = {
  use_when: [
    "Use when the prose matches this predicate signature and all required arguments can be named explicitly.",
  ],
  do_not_use_when: [
    "Do not use when a stricter scalar property, a more specific predicate, or an ontology-gap observation better preserves the claim.",
  ],
};

// implements REQ-mcp-suggest-predicates
export const USAGE_HINTS_BY_PREDICATE: Record<string, PredicateUsageHints> = {
  ...PREDICATE_USAGE_HINTS_1,
  ...PREDICATE_USAGE_HINTS_2,
  ...PREDICATE_USAGE_HINTS_3,
};

// implements REQ-mcp-suggest-predicates
export const BUILT_IN_PREDICATE_SCHEMAS: PredicateSchemaCandidate[] = [
  ...PREDICATE_CATALOG_1,
  ...PREDICATE_CATALOG_2,
  ...PREDICATE_CATALOG_3,
  ...PREDICATE_CATALOG_4,
];
