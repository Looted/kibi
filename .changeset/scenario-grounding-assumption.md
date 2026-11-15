---
"kibi-core": patch
---

A success scenario that assumes the rule or predicate fact grounding the requirement it specifies is no longer reported by `scenario-feasibility-unknown`. That assumption is exactly what `must-positive-scenario` asks for, so a must requirement grounded in a rule or predicate could not satisfy both rules before.

Scenario feasibility gives such an assumption a new `grounding` status: a `requires_rule`, `requires_predicate` or `requires_property` target of a current requirement the success scenario specifies. Like `action`, it counts as matched and is neither an infeasibility witness nor a reason the scenario is not applicable. Scenarios that expect rejection or error are judged as before.
