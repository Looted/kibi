---
title: A store with duplicate triples attached without a reported repair
status: active
fact_kind: property_value
subject_key: kibi.engine.journal
property_key: attached_duplicate_triples_unrepaired_or_unreported
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-11-17T09:07:55.000Z'
tags:
  - negative-path
id: FACT-NEG-core-snapshot-duplicate-repair-UNREPORTED
type: fact
---
An engine that attaches a store holding a triple twice and keeps both copies, or removes them without recording the repair, leaves answers given from the store wrong or hides that they were.