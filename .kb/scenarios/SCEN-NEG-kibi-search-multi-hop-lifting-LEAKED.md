---
title: Two-hop test or clause fact leak or lifted current ADR in search hints is caught
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-23T10:47:12.823Z'
id: SCEN-NEG-kibi-search-multi-hop-lifting-LEAKED
type: scenario
---
Negative-path scenario for GitHub issue #829 (item 7, search ranking and duplicate hints): catches regressions where `TEST-*` or scenario-assumed `FACT-*` entities leak into `kb_search` advisory hints alongside their owning requirements or where current ADRs are collapsed into requirements.