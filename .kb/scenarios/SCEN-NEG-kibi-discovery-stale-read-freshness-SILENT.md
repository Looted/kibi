---
title: Silent stale kb_query or kb_search read after source or relationship drift is caught
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-23T10:46:52.253Z'
id: SCEN-NEG-kibi-discovery-stale-read-freshness-SILENT
type: scenario
---
Negative-path scenario for GitHub issue #829 (item 2, stale-read warning surface): catches regressions where `kb_query` or `kb_search` silently reads a drifted branch store or drops the `branch_store_stale` warning note during `result-budget` truncation.