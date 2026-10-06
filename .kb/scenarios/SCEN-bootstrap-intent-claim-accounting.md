---
title: Bootstrap keeps every declared intent claim and plans no conflicting writes
status: active
tags:
  - bootstrap
  - intent-claims
  - knowledge-sources
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: fix bootstrap truncation after a test project onboarding rerun'
  recorded_at: '2026-10-06T11:35:50.406Z'
id: SCEN-bootstrap-intent-claim-accounting
type: scenario
---
Given declared intent claims from several knowledge sources and more discovered candidates than maxCandidates
When the agent previews kb_plan_bootstrap
Then every declared claim is planned and only discovered candidates are reported over_limit
And a candidate that rewrites a planned entity with different content is suppressed as duplicate_entity
And a requirement grounding on planned facts with mismatched claim_keys is suppressed as invalid_write before apply
And each knowledge source reports declared, planned, existing and not planned claims
And a plan whose authoritative source plans none of its claims stays needs_context
