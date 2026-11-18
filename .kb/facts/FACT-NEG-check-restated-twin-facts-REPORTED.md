---
title: Restated twin facts are reported as one claim minted twice
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T10:52:42.491Z'
subject_key: kibi.check.duplicate_value_facts
property_key: restated_twins_reported_as_duplicates
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-check-restated-twin-facts-REPORTED
type: fact
---
Two requirements linked by restates each ground their own fact with the same value on one tuple, and kibi check reports subject-key-identity, asking to merge facts that cannot share a claim key.