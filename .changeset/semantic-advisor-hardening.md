---
"kibi-mcp": patch
---

Semantic advisor suggestions now avoid two broad false positives that came from product workflow prose. Generic user-facing “must use” requirements no longer route to coding-standard predicates, and generic “must pass before” workflow prerequisites no longer route to release-gate predicates unless the prose includes code/build/release cues.

- Add negative coverage for product usage and checkout prerequisite prose in `kb_suggest_predicates` and `kb_semantic_advisor`.
- Tighten `coding_standard_rule` and `release_gate_rule` exact scoring/detection to require domain-specific cues.
