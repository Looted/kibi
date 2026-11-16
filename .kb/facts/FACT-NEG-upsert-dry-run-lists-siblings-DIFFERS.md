---
title: The dry run lists different siblings than the write
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:45.736Z'
subject_key: kibi.upsert.sibling_requirements
property_key: dry_run_sibling_lists_differing
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-upsert-dry-run-lists-siblings-DIFFERS
type: fact
---
A dry run of a value change lists no siblings, or writes the value, so the agent only learns about the other requirements after the change landed.