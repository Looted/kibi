---
title: The proof workflow fails when kb_search answers on Kibi's own KB regress below the committed thresholds
status: active
priority: should
tags:
  - evaluation
  - search
  - gold-set
  - ci
origin:
  kind: agent
  recorded_at: '2026-10-04T02:40:07.830Z'
id: SCEN-kibi-search-gold-set-gate
type: scenario
---
# The proof workflow fails when kb_search answers on Kibi's own KB regress below the committed thresholds

Given the versioned repository search gold set and `repo-search-thresholds.json`
When the `proof` workflow runs `scripts/change-to-proof-eval.ts --repo-kb` after the proof baseline
Then the runner restarts the engine, warms it with a question outside the gold set and asks every gold question once through the built CLI
And it prints recall@3, the superseded-result rate, abstention precision and recall and warm p50/p95 latency with every missed question, superseded result and false abstention.

Given any of those metrics misses its committed threshold, or the CLI cannot answer a question
When the gate finishes
Then the workflow step fails.
