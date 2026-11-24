---
title: Discovery stale-read freshness confirmation across kb_query and kb_search
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - cli
  - discovery
  - freshness
fact_kind: subject
subject_key: kibi.discovery.stale_read_freshness
origin:
  kind: agent
  recorded_at: '2026-11-23T10:46:45.764Z'
id: FACT-SUBJ-kibi-discovery-stale-read-freshness
type: fact
---
Discovery freshness confirmation and `branch_store_stale` warning propagation across `packages/core/src/status.pl`, `packages/cli/src/utils/content-freshness.ts`, `packages/cli/src/public/operations/discovery-executors.ts`, and `packages/cli/src/public/operations/result-budget.ts`.