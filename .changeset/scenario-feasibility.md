---
"kibi-core": minor
"kibi-cli": minor
---

Scenarios can now say what outcome they expect and what they assume, and Kibi checks that against your requirements. A scenario that expects success while assuming a value a current requirement forbids (for example a zero-quota call when calls need remaining quota) is reported by `kb_check` and blocks proof of the requirements it specifies. An intended exception is recorded as an approved exception requirement instead of weakening or editing the rule.

- New scenario property `expects` (`success`, `rejection`, `error`), new relationships `assumes` (scenario → `property_value` fact) and `exempts` (exception req → base req).
- New canonical `kb_check` rule `scenario-feasibility` with witnesses naming the scenario, requirement and both facts. An exception applies when a current requirement `exempts` the base requirement and is `specified_by` the scenario.
- The proof ladder's scenario stage reports `infeasibleScenarios`, sets status `blocked`, and adds the `infeasible_scenario` gap; coverage repair plans map it to the scenario phase.
- Scenarios without `assumes`, or that expect rejection or error, are not checked; no violation is not proof of feasibility.
