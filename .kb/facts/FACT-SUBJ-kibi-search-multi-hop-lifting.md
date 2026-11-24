---
title: Search answer and search hint multi-hop requirement lifting and broad rationale ADR reranking
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - cli
  - search
  - hints
fact_kind: subject
subject_key: kibi.search.multi_hop_lifting
origin:
  kind: agent
  recorded_at: '2026-11-23T10:47:06.300Z'
id: FACT-SUBJ-kibi-search-multi-hop-lifting
type: fact
---
Two-hop requirement lifting (`TEST -> SCEN -> REQ` and `FACT <- assumes <- SCEN <- specified_by <- REQ`), supersession resolution, closed-requirement hint eligibility, and broad rationale ADR tie-break sorting in `packages/cli/src/requirement-lifting.ts`, `packages/cli/src/search-hints.ts`, `packages/cli/src/search-answer.ts`, and `packages/cli/src/intent-search.ts`.