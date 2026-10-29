---
"kibi-cli": patch
"kibi-core": patch
---

`kibi check` spends far less time after the engine has answered on a large knowledge base, and the engine reads each requirement's proof once per check. On a KB four times the size of this repository's own (about 1,700 requirements, 7,500 facts and 35,000 relationships) a check takes about 95 seconds instead of 205; on this repository's KB about 35 seconds instead of 42. Results are unchanged.

- The migration plan orders its actions by following each action's dependents instead of scanning every action for every action emitted.
- The broad-requirement and coverage-depth quality diagnostics read a relationship index built once instead of scanning every manifest result per requirement.
- The engine keeps each requirement's proof and each scenario's feasibility analysis per KB generation, so the evidence-floor rule, the coverage evidence and the scenario rules share them instead of recomputing them; rule bodies, claim inventories and receipt JSON are decoded once per text.
- A check judges receipts at one instant and one workspace snapshot for all of its rules.
