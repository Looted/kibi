---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_check` no longer reports `strict-req-fact-pairing` on a requirement that constrains a subject fact and grounds its claim through a predicate fact about that subject. Until now the rule only accepted a `requires_property` partner, so every requirement that followed a `kb_model` `replace_grounding` plan was told to add the property back, which would have broken `proposition-complete`. The `strict-readiness` migration diagnostic now reports one readiness level per requirement instead of every lower level as well.

Technical summary: `strict_req_fact_pairing_issue/3` and the `has_subject` readiness level accept a `requires_predicate` link to a ground `fact_kind: predicate` fact whose first argument equals the constrained `subject_key` (`strict_req_predicate_grounds_subject/2`, the position built-in and project-local schemas use for the governed subject); a predicate about another subject is still reported. Such a requirement counts as `contradiction_ready`. `strict_readiness_issue/3` computes a requirement's level once and compares it, fixing the unbound-level match that also returned `prose-only` and `traceable` for every requirement. Suggestions and messages name both pairing options.
