---
title: An agent links the code it wrote while recording the requirement
status: active
expects: success
tags:
  - mutation
  - traceability
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T07:13:28.496Z'
id: SCEN-kb-upsert-implemented-by
type: scenario
---
Given src/checkout.ts declares computeTotal, when the agent writes REQ-checkout-rounding with kb_upsert and an implementedBy entry naming src/checkout.ts and computeTotal, then the requirement is stored and computeTotal's symbol gets an implements link to it in the same write, without a second kb_upsert for the symbol.