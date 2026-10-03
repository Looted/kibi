---
"kibi-core": minor
"kibi-cli": minor
---

Kibi's contradiction and feasibility verdicts no longer overclaim. Two rules over a predicate that can hold several values (several readings per sensor) are now `unresolved` instead of `disjoint`, a rule body with a comparison Kibi cannot read never yields a `contradiction`, and integer properties are compared as integers, so `> 0` conflicts with `< 1`. An exception requirement only exempts a scenario once a human approved it, and a success scenario Kibi cannot check is flagged as unknown instead of silently passing.

- New optional `predicate_schema` field `key_arguments` (argument names that determine the rest). Rule comparison identifies two atoms of a predicate only through it; without it, opposing rules stay `unresolved`. Comparisons of a variable with itself are decided exactly, and `int`/`integer` rule variables range over the integers.
- `values_conflict/5` is domain-aware: `int` pairs use integer bounds; mixed `int`/`number` pairs stay real.
- New optional requirement fields `approved_by` and `approval_ref`. `scenario-feasibility` only accepts an exception with a non-empty `approved_by`; otherwise the violation says the exception exists but is not approved.
- Success scenarios get an explicit outcome (`infeasible`, `feasible`, `feasible_by_exception`, `unknown`). Unknown feasibility is reported by the new advisory rule `scenario-feasibility-unknown` and as the `unknown_scenario_feasibility` proof advisory, without changing proof status.
- Opposing rule pairs are compared once per requirement pair; REQ-A→FACT-Z vs REQ-Z→FACT-A was previously never compared.
- New `what_if_analysis/2` compares the current and staged KB (contradictions and infeasible scenarios) and returns `introduced`, `removed` and `unchanged` witnesses. `kb_compile_intent` blocks on any introduced conflict or infeasibility and returns the full witnesses plus the split; `kb_apply_plan` validates every step and refuses a plan that introduces either before the first write.
