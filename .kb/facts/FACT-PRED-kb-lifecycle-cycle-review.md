---
title: Supersession cycles stay review actions
status: active
tags:
  - lane:ontology
  - lifecycle
  - migration
  - review
claim_key: CLAIM-808222E9A0848A36
claim_text: kibi migrate must leave supersession cycles as review actions
text_ref: .kb/requirements/REQ-kibi-superseded-requirements-closed.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.kb.lifecycle
  - supersession_cycle
  - review_action
polarity: assert
canonical_key: logical_requirement_rule(kibi.kb.lifecycle,supersession_cycle,review_action)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-11-04T18:45:00.000Z'
id: FACT-PRED-kb-lifecycle-cycle-review
type: fact
---
A supersession cycle has no single safe repair, so kibi migrate leaves it as a review action for a person.
