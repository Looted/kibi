---
title: A read on a legacy store creates an empty hashed store and answers from it
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: legacy_attachment_engine_operations_refused
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-16T20:44:00.132Z'
id: FACT-NEG-kibi-legacy-attachment-engine-refusal-EMPTY-HASHED-STORE
type: fact
---
The failure side: an engine-backed command started on a legacy attachment would create an empty hashed store beside the legacy one, answer from that empty store, and leave the branch with two stores that kibi migrate, kibi sync and kibi query then refuse as ambiguous.