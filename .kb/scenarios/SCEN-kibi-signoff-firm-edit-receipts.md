---
title: The person reviewing a change sees each firm-edit review as the agent's judgment
status: active
expects: success
tags:
  - firmness
  - signoff
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T07:00:11.845Z'
id: SCEN-kibi-signoff-firm-edit-receipts
type: scenario
---
Given a change that adds firm-edit receipts, when kibi signoff renders its summary, then each receipt is listed under its requirement with the symbol, verdict and note, labelled as judged by the agent and not approved by the person.