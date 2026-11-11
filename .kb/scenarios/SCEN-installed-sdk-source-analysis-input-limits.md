---
title: Installed SDK rejects invalid oversized source-analysis observations
status: active
tags:
  - plugins
  - source-analysis
  - resource-limits
  - consumer
text_ref: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts
id: SCEN-installed-sdk-source-analysis-input-limits
type: scenario
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
Integration testing found that oversized observations failed in a way the SDK couldn't report. This shows the installed SDK rejecting them cleanly. Source: PR 282 "SDK-compatible oversized failures".
