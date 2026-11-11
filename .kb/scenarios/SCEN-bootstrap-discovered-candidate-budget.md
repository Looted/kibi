---
title: Bootstrap plans declared claims and a full discovered budget with a per-reason suppression summary
status: active
tags:
  - bootstrap
  - intent-claims
  - candidate-budget
expects: success
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-06: separate bootstrap budget for discovered candidates after a test project rerun Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-06T15:22:15.134Z'
id: SCEN-bootstrap-discovered-candidate-budget
type: scenario
---

## Context
Declared claims used up the shared candidate budget. In a test project with 50 to 85 claims, all 290 discovered candidates ended up over the limit, which left several hundred suppression rows to review. Source: PR 347.
