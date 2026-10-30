---
title: kb_search demotes a superseded requirement below its replacement and keeps it out of the governing set
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:13.188Z'
id: SCEN-NEG-kibi-search-answer-layer-v2-SUPERSEDED-MATCH
type: scenario
---
Given a current call quota requirement and the superseded requirement it replaced, both matching the question client call quota, when kibi search runs with no ranking mode, then intent-v1 ranks the superseded requirement below the current one with a demoted reason, and the answer layer lists it only under notGoverning with the requirement that superseded it.

This is the failure side of the default search ranking: replaced semantics must not be presented as the rule that governs today. packages/cli/tests/consumer/search-answer-layer.test.ts "answers with the governing requirement, its facts, scenario and test, and lists the superseded one separately" exercises it.
