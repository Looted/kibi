---
title: A search regression fails the proof run within minutes
status: active
expects: success
tags:
  - ci
  - proof
  - search
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:16.427Z'
id: SCEN-ci-proof-search-gates-before-prove
type: scenario
---
The kb_search gold-set gates run on their own job, right after that job syncs the KB, with no prove step on the runner. A failure cancels the rest of the proof run, so a search regression is reported without waiting for kibi prove --all to finish, and the latency thresholds measure search rather than load from a concurrent prove.