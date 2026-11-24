---
title: A requirement write names the missing proof setup
status: active
expects: success
priority: must
tags:
  - kb_upsert
  - next-actions
  - proof
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:41.118Z'
id: SCEN-kb-upsert-capture-proof-setup-named
type: scenario
---
Given a workspace without .kb/proof/integrations.json, when a firm requirement without a test is written, then nextActions includes the kibi proof inspect step before kibi prove, and approvalsNeeded lists the new integration file.
