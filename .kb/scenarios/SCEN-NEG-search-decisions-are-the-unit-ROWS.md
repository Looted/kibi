---
title: An unfiltered search that returns a scenario as a row of its own is refused
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:24:31.264Z'
id: SCEN-NEG-search-decisions-are-the-unit-ROWS
type: scenario
---
Given a question whose words a scenario holds more strongly than the requirement it specifies, when kb_search without a type filter returns the scenario as a row of its own instead of crediting its requirement, then it is refused.