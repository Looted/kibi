---
title: A gold-set metric past its threshold fails the repository search gate and names the metric
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:29.661Z'
id: SCEN-NEG-kibi-search-gold-set-gate-METRIC-BELOW-THRESHOLD
type: scenario
---
Given a consumer KB that answers every gold question and a latency ceiling lowered below the warm latency it achieves, when the repository search gate runs, then it exits with status 1, prints kb_search gold-set gate failed, and lists the p50 and p95 latency failures while the answer quality metrics still pass.

This is the failure side of the gold-set gate: a measured regression must fail CI instead of passing with a warning. scripts/tests/repo-search-gold-gate.test.ts "a latency ceiling lowered below what the KB achieves fails the gate naming the metric" exercises it.
