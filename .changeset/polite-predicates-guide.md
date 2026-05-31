---
"kibi-mcp": minor
---

Agents now have a guided way to turn prose requirements into ontology predicates instead of falling back to unstructured notes. The new predicate suggestion flow recommends reusable predicate shapes, returns a ready-to-apply `requires_predicate` plan when one fits, and produces an explicit ontology-gap observation when Kibi needs a new schema. This makes the ontology lane easier for agents to follow and harder to bypass accidentally.

- Add `kb_suggest_predicates` with a broad built-in predicate catalog for state transitions, guards, persistence actions, accessibility, retention, resource constraints, feature gates, and events.
- Return ranked predicate candidates plus deterministic `structuredContent.applyPlan` payloads for `fact_kind: predicate` or `review:ontology-gap` fallback facts, with `relationshipPlan` guidance for safe `requires_predicate` attachment.
- Update MCP/runtime guidance so agents spell out requirement prose, request predicate suggestions, and only use prose observations when no candidate fits.
