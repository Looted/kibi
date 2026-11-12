import type { PredicateSchemaCandidate } from "./predicate-types.js";

// The subject classes below already span whitespace, so they absorb a
// leading "only"/"the" and any extra spacing before the next word.
const VISUAL_LAYOUT =
  /^.+?\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+.+?\.?$/i;
const ENFORCEMENT_LOCATION =
  /^.+?\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+.+?\.?$/i;
const RECONCILIATION =
  /^on\s+.+?,\s*.+?\s+(?:must|shall|should)\s+reconcile\s+.+?\s+and\s+clear\s+stale\s+.+?\.?$/i;
const THROTTLE_POLICY =
  /^.+?\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+.+?\.?$/i;
const TEMPORAL_ORDER =
  /^(?:the\s+)?.+?\s+initializes\s+after\s+(?:the\s+)?.+?\s+is\s+ready\.?$/i;
const STATE_TRANSITION =
  /^when\s+.+?,\s*[a-z][a-z\s_-]*\stransitions?\s+from\s+[a-z][a-z0-9_-]*\s+to\s+[a-z][a-z0-9_-]*\.?$/i;
const COMMIT_WORD = /\b(?:auto-save|autosave|commit|persist)\b/i;
const SAVE_WORD = /\b(?:save|saves)\b/i;
const WITHOUT_SAVE = /\bwithout\s+save\b/i;
const SAVED_BEFORE = /\bsaved\s+before\b/i;
const PERMISSION =
  /^[a-z][a-z\s_-]*\s(?:may|can|(?:is|are)\s+(?:not\s+)?(?:allowed|permitted|forbidden|entitled|able)\s+to|(?:must|shall|should)\s+(?:not\s+)?be\s+able\s+to|ha(?:s|ve)\s+(?:no\s+)?permission\s+to|must\s+not|cannot|can't)\s+.+?\.?$/i;

/** Every sentence pattern that alone decides its schema's score. */
const DECIDING_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ["visual_layout_rule", VISUAL_LAYOUT],
  ["enforcement_location_rule", ENFORCEMENT_LOCATION],
  ["reconciliation_rule", RECONCILIATION],
  ["throttle_policy_rule", THROTTLE_POLICY],
  ["state_transition", STATE_TRANSITION],
  ["permission_rule", PERMISSION],
]);

export function scoreExactPredicates3(
  schema: PredicateSchemaCandidate,
  text: string,
): number | null {
  const name = schema.predicate_name;
  const deciding = DECIDING_PATTERNS.get(name);
  if (deciding !== undefined) return deciding.test(text) ? 0.98 : 0;
  if (name === "temporal_order") {
    return TEMPORAL_ORDER.test(text) ? 0.98 : null;
  }
  if (name === "conditional_behavior") return 0.98;
  if (name === "commit_action") {
    if (COMMIT_WORD.test(text)) return 0.98;
    return SAVE_WORD.test(text) &&
      !WITHOUT_SAVE.test(text) &&
      !SAVED_BEFORE.test(text)
      ? 0.98
      : 0;
  }
  return null;
}
