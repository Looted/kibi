---
title: Migration rewrites mappable sources and removes self-referencing or dead ones
status: active
tags:
  - lane:ontology
  - lifecycle
  - source
  - migration
claim_key: CLAIM-E9C0918B16CC724C
claim_text: kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing
text_ref: .kb/requirements/REQ-kibi-kb-lifecycle-integrity.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.kb.lifecycle
  - mappable_self_or_dead_authored_source
  - automatic_source_rewrite_or_removal
polarity: assert
canonical_key: logical_requirement_rule(kibi.kb.lifecycle,mappable_self_or_dead_authored_source,automatic_source_rewrite_or_removal)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T05:38:21.481Z'
id: FACT-PRED-kb-lifecycle-migrate-sources
type: fact
---
