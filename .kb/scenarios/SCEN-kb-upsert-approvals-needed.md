---
title: A requirement write lists what only the person can settle
status: active
expects: success
priority: must
tags:
  - kb_upsert
  - decision-capture
  - approvals
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:49.968Z'
id: SCEN-kb-upsert-approvals-needed
type: scenario
---
Given a firm requirement below a tested floor with a firm related requirement and no proof integration, when it is written, then approvalsNeeded lists the signoff first, the firm pair, the integration file and the failure-side waiver marked as an alternative.
