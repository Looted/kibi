---
title: An authored source that resolves to nothing is a blocking violation
status: active
tags:
  - lane:ontology
  - lifecycle
  - source
  - checks
claim_key: CLAIM-A7F1B7772049A2DE
claim_text: kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation
text_ref: .kb/requirements/REQ-kibi-kb-lifecycle-integrity.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.kb.lifecycle
  - unresolvable_authored_source
  - blocking_source_path_dangling_violation
polarity: assert
canonical_key: logical_requirement_rule(kibi.kb.lifecycle,unresolvable_authored_source,blocking_source_path_dangling_violation)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T05:38:16.725Z'
id: FACT-PRED-kb-lifecycle-source-resolves
type: fact
---
