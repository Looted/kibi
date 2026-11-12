---
title: Bootstrap claim restatement
status: active
origin:
  kind: agent
  ref: Onboarding test finding on bootstrap claim deduplication (2026-10-14)
  recorded_at: '2026-10-14T08:55:25.734Z'
fact_kind: subject
subject_key: bootstrap.claim_restatement
id: FACT-bootstrap-claim-restatement-subject
type: fact
---

How the bootstrap planner decides that a declared intent claim says the same thing as a current requirement: an exact restatement counts as already in the KB under that requirement's id, and a close one is flagged by word similarity. It is not the conflict review of claims that disagree with a requirement.
