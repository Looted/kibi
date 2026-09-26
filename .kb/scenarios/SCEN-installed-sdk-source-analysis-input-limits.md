---
title: Installed SDK rejects invalid oversized source-analysis observations
status: active
text_ref: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts
tags:
  - plugins
  - source-analysis
  - resource-limits
  - consumer
id: SCEN-installed-sdk-source-analysis-input-limits
type: scenario
---
# Installed SDK source-analysis input limits

A relocated consumer imports the public SDK package without access to workspace sources. At the UTF-16 input limit, a valid complete observation is accepted. Above that limit, the validator accepts only a failed observation containing no symbols, uncovered ranges, or ranged diagnostics. ASCII and astral characters establish that the bound counts UTF-16 code units.
