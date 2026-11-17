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
A change that pushes a gold answer out of the top three fails the kb_search gold-set gate right after the KB sync, before the long kibi prove --all step starts, and the gates run alone on the runner so their latency thresholds measure search, not proof load.