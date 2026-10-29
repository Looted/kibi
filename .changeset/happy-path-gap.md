---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

A requirement is no longer `tested` when its scenarios only cover the happy path. A current requirement that grounds a claim (a `requires_property`, `requires_predicate` or `requires_rule` fact) now needs at least one linked scenario that expects `rejection` or `error` and assumes a value or situation the requirement forbids. Without one it gets the blocking `happy_path_only` proof gap, so a firm requirement falls below its `tested` evidence floor and `kibi check` fails `evidence-floor`. Claims that a fresh certificate proves at code scope are exempt, because the certificate already decides both sides.

- kibi-core adds the `negativePath` proof stage (`negativeScenarios`, `claims`, `certifiedClaims` and `suggestedNegatives`, an opposing fact per open claim) and the canonical `scenario-outcome-mismatch` check rule, which reports a scenario that expects rejection or error while current requirements permit everything it assumes.
- kibi-cli and kibi-mcp add the `negative_scenarios` repair-plan phase, and `kibi proof explain` prints the requirement's failure side.

**Migration.** No files change shape, but requirements that were `tested` through success scenarios alone now report `happy_path_only`. For each one, run `kibi coverage --by req` (or `kb_coverage`) and follow the repair plan: create the fact from `suggestedNegatives` (or one that matches your test), a scenario with `expects: rejection` (or `error`) that `assumes` it, link it from the requirement with `specified_by`, and verify it with an end-to-end test that exercises the refusal. Then re-run `kibi prove` for that test.
