---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_check` now pairs a requirement's subject fact with a predicate that is about that subject wherever the predicate keeps it. Until now `strict-req-fact-pairing` only accepted a predicate whose first argument was the subject key, so a permission rule (`permission_rule(actor, action, resource, decision)`) or any schema with its subject elsewhere was reported even after following a `kb_model` replacement plan exactly. A predicate fact can now say which subject it is about with its own `subject_key`.

Technical summary: `strict_req_predicate_grounds_subject/2` reads the subject of a `requires_predicate` fact through `predicate_fact_subject_key/5`: the fact's `subject_key` when present, else the argument its project-local `predicate_schema` names `subject` (any position), else the first argument when neither is declared. The `strict-readiness` `contradiction_ready` level uses the same rule, and the pairing suggestions name both options.
