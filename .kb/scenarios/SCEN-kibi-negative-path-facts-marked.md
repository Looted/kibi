---
title: An agent asking kb_search sees a forbidden situation marked and ranked below the requirement it guards
status: active
priority: should
expects: success
tags:
  - search
  - answer-layer
  - search-hints
origin:
  kind: agent
  recorded_at: '2026-11-11T17:20:35.380Z'
id: SCEN-kibi-negative-path-facts-marked
type: scenario
---
Given REQ-plan-read-only is specified by a scenario that expects rejection and assumes FACT-NEG-plan-writes ("Building a migration plan changes a tracked file"), when an agent asks kb_search "building a migration plan changes a tracked file", the requirement ranks first and the fact follows it, its row carrying negativePath {polarity: forbidden, guards: [REQ-plan-read-only]}; the kibi search table titles it "Forbidden: Building a migration plan changes a tracked file". When a search-hints provider returns the fact for a weak answer, the hint is REQ-plan-read-only via the fact. The same kb_search operation serves every agent host and the plain CLI.