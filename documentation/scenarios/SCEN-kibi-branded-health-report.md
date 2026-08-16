---
title: Understand strict requirement health through Kibi's proof rail
status: active
tags:
  - cli
  - report
  - badge
  - brand
  - proof
links:
  - type: verified_by
    target: TEST-kibi-branded-health-report
id: SCEN-kibi-branded-health-report
type: scenario
---
Given a synced Kibi project whose current requirements stop at different proof gates
When an operator generates the HTML requirement-health report
Then the canonical Kibi logo and wordmark identify the report and badge
And the headline shows the strict percentage with its proven numerator and current denominator
And the proof rail assigns every drop to the earliest unmet semantic, scenario, implementation, E2E, or evidence gate
And the detailed ledger remains usable on desktop, mobile, and print without network assets or color-only status.
