---
title: Search answers lift two-hop tests and scenario-assumed facts and keep current ADRs unlifted
status: active
priority: should
expects: success
tags:
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:28:01.188Z'
id: SCEN-search-answers-lift-two
type: scenario
---
Given a typed search whose matches are a test that verifies a scenario and a fact a scenario assumes, when kb_search builds its answer, then the answer names the requirements those scenarios specify, follows supersession chains to the current requirement, keeps a current ADR as rationale rather than lifting it, and on an unfiltered broad rationale question the intent ranking puts current ADRs first among equals.