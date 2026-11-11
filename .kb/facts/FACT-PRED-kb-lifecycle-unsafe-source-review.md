---
title: Source values migration cannot edit safely stay review actions
status: active
tags:
  - lane:ontology
  - lifecycle
  - migration
  - review
claim_key: CLAIM-28CBCC4E659AB322
claim_text: 'kibi migrate must leave source values it cannot edit safely as review actions'
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.kb.lifecycle
  - unsafe_source_edit
  - review_action
polarity: assert
canonical_key: logical_requirement_rule(kibi.kb.lifecycle,unsafe_source_edit,review_action)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-11-04T18:45:00.000Z'
id: FACT-PRED-kb-lifecycle-unsafe-source-review
type: fact
text_ref: .kb/requirements/REQ-kibi-authored-sources-resolve.md
---
An authored source value that kibi migrate cannot rewrite or remove safely is left as a review action for a person.
