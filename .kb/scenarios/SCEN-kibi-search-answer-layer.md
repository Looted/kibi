---
title: A question to kb_search returns the governing requirements, what must stay true and what verifies it
status: active
priority: must
tags:
  - search
  - intent-search
  - answer-layer
  - discovery
id: SCEN-kibi-search-answer-layer
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# A question to kb_search returns the governing requirements, what must stay true and what verifies it

Given a KB with a current requirement, a superseded predecessor, linked facts, an ADR, scenarios, tests and an observation note
When an agent asks kb_search a question without choosing a ranking mode
Then intent-v1 ranking is used and superseded, deprecated and rejected entities are demoted.
And data.answer (kibi.search-answer.v1) names the current governing requirements, their linked facts, rationale ADRs, verifying scenarios and tests, non-governing superseded entries with supersededBy, and observation notes, within its byte ceiling.
And the answer states that absence of a match is not evidence.
