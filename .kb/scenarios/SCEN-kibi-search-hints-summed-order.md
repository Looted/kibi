---
title: A requirement two hits agree on is shown before the requirements of one stronger shared hit
status: active
tags:
  - search
  - plugins
origin:
  kind: agent
  recorded_at: '2026-11-24T11:15:05.768Z'
id: SCEN-kibi-search-hints-summed-order
type: scenario
---
Given a provider that returns a scenario hit scored 0.9 linked to two requirements, an unlinked test hit scored 0.8, a scenario hit scored 0.5 linked to a third requirement and that third requirement itself scored 0.45, when kb_search builds the hints for a weak answer, then the third requirement is shown first with the score 0.5 and its scenario under via, the two requirements of the 0.9 hit follow in id order, and the test comes last.
