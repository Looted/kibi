---
title: Installed prove-all selects contracts from large archived metadata
status: active
tags:
  - proof
  - consumer
  - projection
id: SCEN-e2e-proof-all-bounded-projection
type: scenario
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
In a KB with large archived test records, prove-all has to find the one contract it needs without loading everything. PR 282's regression used 500 large records, where a full query returned 11.4 MB over six pages.
