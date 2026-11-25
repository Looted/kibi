---
"kibi-cli": patch
"kibi-core": patch
---

Every check rule now names its layer in the rule registry: `knowledge` (requirements, code links, capture and contradiction checks) or `verification` (the six rules that ask for scenarios, tests and proof: `evidence-floor`, `symbol-coverage`, `must-priority-coverage`, `must-positive-scenario`, `proof-contract-claims` and `proof-contract-symbols`). The TypeScript registry exposes it as `layer`, and the Prolog registry as `rule_layer/2`.

`agent-requirement-unapproved-implemented` now reads the knowledge base alone instead of evaluating every requirement's proof, so `kibi check --rules agent-requirement-unapproved-implemented` no longer runs the proof ladder. Its findings are unchanged.
