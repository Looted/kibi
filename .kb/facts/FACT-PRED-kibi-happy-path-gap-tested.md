---
title: A requirement that grounds a claim needs a rejection scenario assuming an opposing fact before it is tested
status: active
fact_kind: predicate
predicate_name: proof_gate_policy
predicate_args:
  - tested_status
  - requirement_grounding_a_claim
  - needs_rejection_scenario_assuming_an_opposing_fact
polarity: assert
canonical_key: proof_gate_policy(tested_status,requirement_grounding_a_claim,needs_rejection_scenario_assuming_an_opposing_fact)
claim_key: CLAIM-92D74D1B02B98278
claim_text: A current requirement that grounds a claim must not reach tested until a scenario it specifies expects rejection or error and assumes a fact that opposes one of its claims
text_ref: .kb/requirements/REQ-kibi-happy-path-gap.md
origin:
  kind: agent
  recorded_at: '2026-10-29T22:30:00.000Z'
id: FACT-PRED-kibi-happy-path-gap-tested
type: fact
---
A requirement that grounds a claim needs a rejection scenario assuming an opposing fact before it is tested. This predicate grounds the claim of REQ-kibi-happy-path-gap quoted in claim_text, so the requirement's semantic inventory counts it as modeled.