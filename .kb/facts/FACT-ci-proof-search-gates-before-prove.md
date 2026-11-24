---
title: The proof workflow runs the kb_search gold-set gates before the full proof run
status: active
fact_kind: property_value
subject_key: kibi.ci.proof_workflow
property_key: runs_search_gold_gates_before_full_proof
operator: eq
value_type: bool
value_bool: true
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:03.489Z'
claim_key: CLAIM-BD18FA9908BAF624
claim_text: The proof workflow runs the kb_search gold-set gates before the full proof run, with no proof step running beside them
id: FACT-ci-proof-search-gates-before-prove
type: fact
---
True when both kb_search gold-set gates run on their own job after that job's KB sync, with no prove step on the runner, and a failure cancels the proof run so it is reported without waiting for kibi prove --all.