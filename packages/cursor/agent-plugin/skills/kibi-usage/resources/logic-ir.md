# Typed Logic IR and Proposition Coverage

Kibi stores human prose as readable requirement text, but verifiable meaning belongs in typed facts and `kibi.logic.v1` rule facts. The host agent may propose an interpretation; Kibi validates, canonicalizes, hashes, persists, and reasons over it. Never submit a Prolog source string, goal, module, or function symbol. Rendered Prolog is an inspection preview only.

## Two-pass extraction

1. Run `kb_semantic_advisor` over the complete text. Supply explicit `clauses` when sentence splitting could hide a condition, exception, definition, descriptive assertion, threshold, quantity, or temporal qualifier.
2. Audit the returned `propositions` against the original UTF-8 text. Every assertive span must be `modeled`, `ambiguous`, `ontology_gap`, or `missing`; rationale, examples, and subjective commentary are `nonlogical` and remain readable prose.
3. For each assertive proposition, submit up to three typed `interpretations` when alternatives are plausible. Kibi compares canonical semantic keys; materially different valid interpretations remain unresolved regardless of confidence.
4. Apply only a validated plan, then read back the requirement, rule schema, rule fact, and all relationship targets. Run `rule-safety`, `rule-verifiability`, `semantic-completeness`, `logic-coverage`, and `domain-contradictions` before the final unfiltered check.

When a project-local schema names several ordered arguments, those arguments are facets of one relation, not separate propositions. Preserve the advisor claim key for the complete relation and do not manufacture clauses for each argument. Supporting `predicate_schema` facts carry the declared signature only; the ground predicate fact carries the claim provenance. Apply the exact `kb_suggest_predicates`/`kb_model_requirement` plan, reducing a rejected schema payload through `kb_validate_upsert` rather than silently downgrading a fitting declared relation to an observation.

## Logic IR shape

The supported v1 forms are:

- `kind: atom` with a ground `head`;
- `kind: rule` with a range-restricted `head` and `body`;
- `kind: constraint` with a body and no head.

Terms are typed `const`, `var`, `number`, `duration`, or ISO `timestamp`. Variables are explicitly declared as `forall` (the default) or body-local `exists`; an existential variable may not occur in a rule head. Bodies use `all`, `any`, closed-world `not`, comparisons, bounded `count`, and bounded temporal expressions. Modalities are `assert`, `deny`, `oblige`, `permit`, and `forbid`.

Every head and body variable must be bound by a positive atom. Negation is allowed only on an atom with `closedWorld: true`, and only when its variables are also positively bound. Function symbols, raw goals, cuts, meta-calls, dynamic predicates, I/O, unbounded aggregation, unsafe variables, and unstratified negation are rejected before persistence.

Example (inspection data, not executable input):

```json
{
  "version": "kibi.logic.v1",
  "kind": "rule",
  "modality": "oblige",
  "variables": [{"name": "U", "type": "user", "quantifier": "forall"}],
  "head": {"kind": "atom", "name": "audit", "args": [{"kind": "var", "name": "U", "type": "user"}]},
  "body": {"kind": "atom", "name": "admin_action", "args": [{"kind": "var", "name": "U", "type": "user"}]}
}
```

Use `rule_schema` facts for stable predicate signatures and link a requirement to a `rule` fact with `requires_rule`. Keep `logic_claims` for backward-compatible ground claim manifests; `semantic_inventory` is the complete proposition ledger. A manifest is not proof until each key is linked to exactly one intended fact and the rule checks pass.

## Contradictions and uncertainty

Kibi compares opposing modalities over matching heads and overlapping authority, scope, and validity intervals. `assert`/`deny`, `oblige`/`forbid`, and overlapping `permit`/`forbid` pairs can be contradictory. Different conditions, unresolved interpretations, unsupported ontology terms, analysis limits, and incomplete closure produce `unresolved`, never a false consistency proof. Preserve superseding requirements rather than deleting historical claims.
