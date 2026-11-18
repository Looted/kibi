---
title: A summary search response carries every graph path and fact call
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T15:42:10.907Z'
id: SCEN-NEG-search-compact-evidence-VERBOSE
type: scenario
---
A kb_search call without fields full returns each result's graph paths and each fact's kb_query call, spending the agent's context on structure before it has read the statement or the reason.

This is the failure side the change must not produce; the tests of TEST-search-answer-first-layer check it.