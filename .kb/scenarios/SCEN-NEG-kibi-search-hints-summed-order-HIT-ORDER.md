---
title: The requirements of one shared hit are not listed ahead of a requirement with a higher summed score
status: active
expects: rejection
tags:
  - negative-path
  - search
  - plugins
origin:
  kind: agent
  recorded_at: '2026-11-24T11:16:47.076Z'
id: SCEN-NEG-kibi-search-hints-summed-order-HIT-ORDER
type: scenario
---
Given a provider that returns a scenario hit scored 0.9 linked to two requirements and, below it, a scenario hit scored 0.5 and its own requirement scored 0.45, when kb_search builds the hints for a weak answer, then the two requirements of the 0.9 hit must not be listed ahead of the requirement whose hits sum to 0.95.
