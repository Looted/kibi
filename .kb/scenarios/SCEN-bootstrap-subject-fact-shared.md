---
title: Two sources naming one subject share one subject fact
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - naming
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:34.363Z'
id: SCEN-bootstrap-subject-fact-shared
type: scenario
---
Given two authoritative knowledge sources with `component: exporter` and the intent claims "Exporting a report must keep the active filters." and "Exporting a report must show the saved file.", one from each source, when the agent plans the bootstrap, the plan holds one subject fact keyed `exporter.exporting_a_report` tagged with both sources' provenance, both requirements link to it through `constrains`, and the diagnostics hold one `subject-key-shared:` line naming the key and both sources. Planning again gives the same plan hash, and after the approved plan is applied `kb_check` reports no `subject-key-identity`.

An onboarding evaluation found a bootstrap plan that minted a second subject fact for a shared subject key.