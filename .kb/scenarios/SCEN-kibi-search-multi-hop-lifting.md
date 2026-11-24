---
title: Search answers and search hints lift two-hop tests and scenario-assumed facts to governing requirements and keep current ADRs unlifted
status: active
priority: should
tags:
  - cli
  - search
  - hints
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-23T10:47:11.819Z'
id: SCEN-kibi-search-multi-hop-lifting
type: scenario
---
Verifies GitHub issue #829 (item 7, search ranking and duplicate hints): `requirement-lifting.ts` lifts two-hop `TEST -> SCEN -> REQ` and `FACT <- assumes <- SCEN <- specified_by <- REQ` paths and supersession chains to current or non-superseded `closed` requirements, keeps current ADRs unlifted in `search-hints.ts`, and applies a pure tie-break sort bonus to current ADRs on unfiltered broad rationale queries.