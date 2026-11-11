---
title: A requirement whose scenarios all expect success is put forward as tested
status: active
fact_kind: property_value
subject_key: kibi.proof_gate.failure_side
property_key: success_only_scenarios_reach_tested
operator: eq
value_type: bool
value_bool: true
tags:
  - negative-path
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-04T17:05:00.000Z'
id: FACT-NEG-kibi-happy-path-gap-success-only-tested
type: fact
---
A requirement whose scenarios all expect success is put forward as tested. The rejection scenario assumes this value so the requirement's own constraint refuses it.
