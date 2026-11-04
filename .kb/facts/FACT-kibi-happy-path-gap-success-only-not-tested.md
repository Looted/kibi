---
title: A requirement whose specified scenarios all expect success does not reach tested
status: active
fact_kind: property_value
subject_key: kibi.proof_gate.failure_side
property_key: success_only_scenarios_reach_tested
operator: eq
value_type: bool
value_bool: false
claim_key: CLAIM-92D74D1B02B98278
claim_text: A current requirement that grounds a claim must not reach tested until a scenario it specifies expects rejection or error and assumes a fact that opposes one of its claims
text_ref: REQ-kibi-happy-path-gap
tags:
  - strict-modeling
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-04T16:55:00.000Z'
id: FACT-kibi-happy-path-gap-success-only-not-tested
type: fact
---
A requirement whose specified scenarios all expect success does not reach tested. The proof gate holds the requirement below tested whatever its tests report, so the scenario that closes the gap and the requirement agree on this value.
