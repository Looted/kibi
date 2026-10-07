# Inference Rules

Kibi includes deterministic derived predicates for internal analysis and automation. These predicates are not exposed as a raw public inference surface.

## Core Predicates (`packages/core/src/kb.pl`)

- `transitively_implements(Symbol, Req)`
- `transitively_depends(Req1, Req2)`
- `impacted_by_change(Entity, Changed)`
- `affected_symbols(Req, Symbols)`
- `coverage_gap(Req, Reason)`
- `untested_symbols(Symbols)`
- `stale(Entity, MaxAgeDays)`
- `orphaned(Symbol)`
- `conflicting(Adr1, Adr2)`
- `deprecated_still_used(Adr, Symbols)`
- `current_adr(Id)`
- `superseded_by(OldId, NewId)`
- `adr_chain(AnyId, Chain)`
- `contradicting_reqs(ReqA, ReqB, Reason)`
- `predicate_schema(FactId, Namespace, Name, Arity, ArgumentNames, ArgumentTypes)`
- `predicate_fact(FactId, Namespace, Name, Args, Polarity)`
- `logic_rule_from_props(Props, Rule)`
- `logic_rule_safety(Props, Errors)`
- `logic_derive(Goal, Proof)` (bounded, data-driven closure)
- `logic_rule_conflict(RuleA, RuleB, Status)`

## Symbol coverage semantics

**Scenario-aware coverage**: When a requirement has `specified_by(Req,Scenario)`, direct `verified_by(Req,Test)` or `validates(Test,Req)` does NOT satisfy symbol-coverage. The canonical path requires `verified_by(Scenario,Test)` or `validates(Test,Scenario)`.

## Requirement contradiction semantics

`contradicting_reqs/3` uses strict requirement semantics only for current requirements and **strict domain facts**.

- `current_req/1` excludes deprecated and superseded requirements.
- A contradiction requires both requirements to:
  - `constrains` the same `fact_kind=subject` fact (matched by `subject_key`) in the **strict lane**
  - `requires_property` a `fact_kind=property_value` fact for that same subject in the **strict lane**
- **Non-blocking lane:** `observation` and `meta` facts are explicitly excluded from contradiction inference. They serve as non-blocking notes for bugs, workarounds, and historical context.
- Conflict classes currently covered:
  - exact-value conflicts like `eq pending` vs `eq granted`
  - numeric conflicts decided exactly: two comparisons conflict when no real value satisfies both. Strict bounds count, so `gt 0` vs `eq 0` and `lte 0` vs `gt 0` conflict while `gte 0` vs `eq 0` does not (`packages/core/src/intervals.pl`). When both sides are `value_type: int` the comparison is over the integers: `gt 0` vs `lt 1` conflicts (no integer lies between them), fractional bounds tighten to the nearest integer, and an `eq` with a fractional value admits no integer. A mixed `int`/`number` pair is compared over the reals, and a `number` keeps real semantics after unit canonicalization even when its value is integral (`number gt 0` vs `number lt 1` do not conflict)
  - polarity conflicts like `require` vs `forbid` on the same normalized tuple
- Scope and validity windows only conflict when they intersect.
- **Readiness Levels:** Requirements must pass strict readiness checks (e.g., valid `subject_key`, matching `property_key`, valid operator) before participating in contradiction checks.
- Contradiction detection covers exact-value, boolean/enum, numeric range, and polarity conflicts. Prose-only requirements without strict fact modeling are not checked for contradictions.
- **Semantic advisor receipts:** MCP preflight and write responses may warn that prose looks machine-checkable but unmodeled, and may include draft strict-property, predicate, ambiguity-observation, or ontology-gap suggestions. These suggestions are advisory. They do not add contradiction semantics unless the requirement is linked to strict facts or predicate facts.
- **Automation:** The modeling pipeline is fully automated and does not require human approval for high-confidence (>= 0.7) claims.

### Rule (logic IR) conflicts

Typed `kibi.logic.v1` rules with opposing modalities (oblige or permit vs forbid) are compared three-valued:

- `contradiction`: neither rule has an exception, and either the two rules are identical (up to variable names) or one rule's conditions always imply the other's; in both cases the shared condition must provably hold for some instance. A condition is only proven satisfiable when every comparison in it was translated exactly, the declared functional dependencies are consistent, it contains no negation, disjunction, count or temporal relation, and its constraints admit a value. Identical rules whose condition cannot hold (`X > 0` and `X < 0`, `X < X`, or two different values of a keyed predicate) are `disjoint`; identical rules whose condition the fragment cannot read (such as `X < Y` between two different variables) stay `unresolved`.
- `disjoint`: the actions differ, the scopes or validity windows do not intersect, the conditions provably cannot hold together, or one rule's exception is implied by the other rule's conditions.
- `unresolved`: the rules may overlap but the fragment cannot decide it.

Comparisons of a variable with itself are decided exactly (`X < X` never holds, `X =< X` always does). Rule variables declared `int` or `integer` range over the integers, so `N > 0` and `N < 1` cannot both hold for them. A variable shared by both rules (through the action or a keyed predicate) counts as an integer for a `disjoint` verdict only when every declaration of it is `int` or `integer`; `N: int, N > 0` against `N: number, N < 1` is not `disjoint`, since 0.5 satisfies the `number` reading. A `contradiction` verdict needs a witness that satisfies every declaration, so there the variable is an integer as soon as one declaration says so.

**Same-fact assumption.** Condition atoms of the two rules are read as the same fact only when their predicate declares a functional dependency: a `predicate_schema` fact with `key_arguments` names the arguments that determine the rest. Two atoms of that predicate whose key arguments are identical must agree on every other argument. With `key_arguments: [sensor]` on `reading(sensor, value)`, `permit act(C) :- reading(C, X), X > 0` and `forbid act(C) :- reading(C, Y), Y =< 0` are `disjoint`. Without the declaration a predicate is multivalued (a sensor may have several readings), so the same pair is `unresolved`, never `disjoint`.

The advisory `rule-key-arguments-missing` check lists opposing rule pairs that are `unresolved` only for this reason. For each condition predicate (namespace, name, arity) without `key_arguments`, it tries every candidate key set (each non-empty proper subset of the argument positions, for predicates of arity 2 to 6) on its own, and reports the predicate with the key sets that would decide the pair; when no single declaration does, it also tries declaring all of them keyed on every argument but the last. A pair that stays undecided whatever is declared (for example because of `X < Y`) is not reported. The finding is a prompt, not a proof: declare the keys only when the predicate really is single-valued per key.

### Unmodeled clauses are not "no conflict"

The proof ladder's contradiction stage reports `status: unresolved` with `outcome: analysis_incomplete` (reason `unresolved_propositions`) when a requirement has semantic-inventory propositions that are not modeled, even if no conflict was found among the modeled ones. Absence of a conflict only means something once every clause is grounded.

## Scenario feasibility

A scenario may declare `expects: success | rejection | error` and link the values its outcome depends on with `assumes` (scenario → `property_value` fact). Every assumed value and every value a current requirement requires on the same `subject_key` and `property_key` (through a `requires_property` fact or a typed rule, see the rule lane below) becomes a constraint on that property: values are unit-canonicalized (`6000 ms` compares with `5 s`), and a `forbid` fact contributes the negated operator. Constraints are grouped per property and per scope (an unscoped fact belongs to every scope). The canonical `scenario-feasibility` check reports a success scenario when, in some group:

- one assumption and one requirement fact admit no common value (a pairwise witness), or
- the assumptions admit a value on their own and no pair conflicts, but the assumptions together with the governing requirement constraints admit none (a joint witness). For example, with `q =< 5` required, the assumptions `q >= 5` and `q != 5` each fit, but together they leave no value. The witness is irreducible: it names the requirements, the assumption facts and the requirement facts of a minimal conflicting set.

Numeric constraints are decided exactly with `packages/core/src/intervals.pl`, over the integers only when every constraint in the set is `value_type: int`; other value types support `eq` and `neq`. A string is never coerced to a number, so a `property_value` fact that stores a plain decimal as `value_type: string` where the comparison is numeric (an ordering operator, or an `int`/`number` fact on the same subject and property) drops out of these checks; the advisory `numeric-string-value` check lists such facts with the typed replacement. The scenario-level outcome, the `scenario-feasibility` violations, the proof ladder and the plan what-if analysis all read the same witnesses, so joint infeasibility blocks exactly like a pairwise conflict.

**Rule lane.** A current requirement's typed `requires_rule` rule contributes constraints in the same form as a property fact when its body reads subject properties (an atom `namespace:name(Entity, Value)` reads `subject_key: namespace`, `property_key: name`) and it restricts the scenario's action. A `forbid` (or `deny`) rule with one condition on the one property it reads contributes the negated condition: a rule that forbids `checkout(C)` when `cart:total(C, T)` holds unless `T > 0` ("checkout may happen only when the cart total is positive", or "checkout must not happen unless the cart total is positive") requires `cart.total gt 0`, exactly like a `requires_property` fact would. A `permit` or `oblige` rule of kind `constraint` contributes each of its conditions as stated. A rule restricts the scenario only when the scenario performs its head action: it is `specified_by` the requirement (or by an exception to it), or it assumes a predicate fact with the head's namespace and name. A restricting rule that is not one constraint per property (a `forbid` with several conditions, or a body the property reading cannot translate) is decided on its own: it blocks when the assumptions entail every condition, is irrelevant when they refute one, and is otherwise `undecided_rule`. Approved exceptions and scopes apply to rule constraints exactly as they do to property constraints.

**Validity windows.** Each requirement constraint is in force over the validity window of the fact that grounds it (`valid_from`/`valid_to` on the `property_value` fact; for a rule, `validFrom`/`validTo` in its IR, else the rule fact's own window). The scenario's time is the intersection of its assumed facts' windows, and is unspecified when none sets one. An unbounded constraint always applies. A bounded constraint does not apply when its window is disjoint from the scenario's, applies when it covers the scenario's whole window, and is undetermined otherwise, including at an unspecified scenario time. A scenario that would conflict only with undetermined constraints gets `unknown` (`undetermined_validity`) rather than a verdict.

A requirement stops governing a scenario when a current exception requirement `exempts` it, is `specified_by` the scenario, and carries a non-empty `approved_by` (the human who approved it). An exception without `approved_by` does not exempt: the violation stays and says an exception exists but is not approved. The base requirement is not edited and stays current. An exception that lists `exempts_claims` waives only the constraints grounded by facts carrying one of those claim keys, so waiving one clause of a requirement does not waive its other clauses; the violation names the exception when it does not cover the conflicting clause. The canonical `exception-claim-keys` check requires an exception with `exempts_claims` to exempt a requirement, and every listed key to be a claim of a requirement it exempts (in its `logic_claims`, its semantic inventory or a grounding fact).

Every requirement that specifies an infeasible scenario has its scenario stage set to `blocked` and gets the `infeasible_scenario` proof gap, so it cannot be proven through that scenario.

Each success scenario gets one analysis outcome: `infeasible` (blocking, above), `feasible_by_exception` (the assumptions conflict only with constraints an approved exception waives), `not_applicable` (no current requirement governs any assumption, because the requirements that constrain the assumed properties are scoped elsewhere, `disjoint_scope`, or not in force at the scenario's time, `outside_validity`), `feasible` (every assumption was compared with every governing constraint on its property and the conjunction of all of them admits a value), or `unknown`. `unknown` means the check could not decide, reported in this order: the scenario assumes nothing (`no_assumptions`); its assumptions contradict each other whatever the requirements say (`contradictory_assumptions`); an assumed `subject_key`/`property_key` is not constrained by any current requirement that governs this scenario (`unmatched_assumption`; a scenario assuming `basket.amount` is not judged against a rule on `cart.total`); an assumption's type, unit or operator cannot be compared with the other constraints on its property, such as a string against an int or seconds against bytes (`incomparable_assumption`); the governing requirements admit no common value on that property, so the scenario cannot be judged until that requirement conflict is resolved (`conflicting_requirements`); a governing rule reads an assumed property but the assumptions neither satisfy nor refute its conditions (`undecided_rule`); or the scenario would conflict only with constraints whose validity window may or may not cover its time (`undetermined_validity`). Unknown feasibility is never reported as passed: `kb_check` lists it under the advisory `scenario-feasibility-unknown` rule (a non-blocking quality diagnostic), and the proof ladder records it in `proofStages.scenarios.unknownFeasibility` and as the `unknown_scenario_feasibility` proof advisory without changing proof status.

`kb_compile_intent` and `kb_apply_plan` stage a plan in a rolled-back transaction and compare its contradiction and infeasibility witnesses with the current KB (`introduced`, `removed`, `unchanged`). Any introduced contradiction or infeasible scenario blocks the plan, whichever requirements it names; `kb_apply_plan` refuses it before the first write.

## Predicate ontology semantics

The ontology lane encodes project-local domain predicates:

- `fact_kind=predicate_schema` defines an allowed predicate signature and its argument names/types. Optional `key_arguments` declares that those arguments determine the remaining ones (a functional dependency used by rule comparison).
- `fact_kind=predicate` stores one ground predicate claim with `predicate_args` and optional `polarity` (`assert` or `deny`).
- Requirements link to ground predicate facts with `requires_predicate`.
- `predicate_schema/6` and `predicate_fact/5` are read-only helpers for querying stored ontology data.

Stored `rule` facts use the versioned `kibi.logic.v1` JSON IR. The interpreter decodes only allowlisted terms and evaluates finite closure under resource bounds; it never calls `consult/1`, `assertz/1`, or source-string evaluation. Negation-as-failure requires an explicit closed-world atom and stratified dependencies. Opposing modalities are checked extensionally over known facts and conservatively symbolically: `contradiction`, `disjoint`, or `unresolved` are distinct outcomes, and incomplete analysis is never treated as consistency. Proof consumers should preserve the rule IDs, claim spans, normalized formula, substitutions, and contributing fact chain.

The proposition ledger is the completeness boundary: `semantic-completeness` rejects silently missing assertive spans, while `ambiguous`, `ontology_gap`, and `nonlogical` entries remain visible without pretending to prove a rule. Because `domain-contradictions` compares grounded facts only, `related-requirement-unmodeled` blocks a current requirement that still carries `missing` propositions while it `relates_to` a current requirement modeled with strict property or ground predicate facts: the link says the two overlap, so the unmodeled claims must be modeled against the same subject or predicates, or the older requirement superseded, before the check can mean anything for that pair.

These predicates remain useful for product features, automation, and future internal services. Public MCP agents should use the curated public surface instead:

- `kb_search`
- `kb_query`
- `kb_status`
- `kb_find_gaps`
- `kb_coverage`
- `kb_graph`
- `kb_upsert`
- `kb_delete`
- `kb_check`

## Advisory strict-fact validation

- `strict-fact-shape`
  - checks only facts that already declare `fact_kind`
  - ignores legacy prose facts without `fact_kind`
  - runs by default as a non-blocking quality diagnostic; it does not fail canonical health
  - can be selected explicitly with `--rules` for a focused audit without changing enforcement class

- `domain-contradictions`
  - checks for logical conflicts between requirements based on shared strict facts
  - **strict-lane only:** does not promise contradiction detection over all facts; only those explicitly modeled as `subject` + `property_value` participation rules
  - is **enabled by default** for immediate value on normalized data

### Bug and Workaround Documentation (Non-Blocking Lane)

Bug records, incident notes, and workaround documentation should use `observation` or `meta` facts rather than strict fact modeling. Since `observation` and `meta` facts are excluded from contradiction inference, they are appropriate for non-blocking evidence.

**Rule:** Use `observation` or `meta` fact_kind for bug/workaround notes. Do NOT create a `flag` entity for bugs unless there is an actual runtime/config gate.

## Ignored Files and Inference

Files and directories that match the repository ignore policy are excluded from Kibi's inference pipeline. Ignored files are not read for candidate synthesis and will not be inferred into KB entities by `kb_plan_bootstrap` or other discovery-oriented tools. See the MCP repository ignore policy in `docs/mcp-reference.md` for the full list of honored ignore sources and hard-denied directories.

This behavior prevents editor state, tooling caches, and build outputs from polluting the knowledge base with transient or irrelevant artifacts. Global Git excludes (user-level `core.excludesFile`) are not read. Kibi does not automatically remove entities that were created from files that are ignored now. Run `kibi migrate` when a stored layout or schema still needs the current shape; see [Troubleshooting](troubleshooting.md#upgrading-and-branch-recovery).
