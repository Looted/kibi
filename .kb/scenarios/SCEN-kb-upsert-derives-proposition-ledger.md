---
title: An agent writes a requirement with its links and only the claims it classifies, and Kibi records the rest of the ledger
status: active
priority: must
expects: success
tags:
  - mutation
  - modeling
origin:
  kind: agent
  recorded_at: '2026-11-15T20:20:28.272Z'
id: SCEN-kb-upsert-derives-proposition-ledger
type: scenario
---
Given a requirement whose prose states two claims, when an agent sends one kb_upsert with the prose, a grounding link for the first claim's fact and a semantic_inventory entry giving the second claim's status and subjects, and none of the ledger's contract fields, then the write succeeds in one call: the first claim is recorded modeled, the second keeps the agent's status and subjects, any claim nobody classified is recorded missing, the result lists each recorded claim, and the committed reply carries the advisor's verdict without its per-clause analysis.