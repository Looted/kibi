---
title: The search answer takes a requirement's reason from its records in a fixed order
status: active
priority: must
expects: success
tags:
  - search
  - answer
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:59.201Z'
id: SCEN-search-answer-reason-source-order
type: scenario
---
A requirement with a rationale field and a Why section reports the field; one with Why and Why this changed sections reports the Why section; one whose Why section says no reason was stated reports Why this changed; one with only a linked ADR reports the ADR's decision.