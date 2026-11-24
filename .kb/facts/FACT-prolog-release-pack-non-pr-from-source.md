---
title: Non-pull-request runs build these platform archives from source
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - prolog
  - release
fact_kind: property_value
subject_key: kibi.prolog.release_pack_archive_cache
property_key: non_pull_request_from_source_targets
operator: eq
value_type: set
value_set:
  - darwin-arm64
  - darwin-x64
  - linux-arm64-gnu
  - linux-x64-gnu
  - win32-x64
claim_key: CLAIM-7EE07E05E0A42486
claim_text: Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive
claim_span_start: 328
claim_span_end: 459
text_ref: .github/workflows/swipl-build.yml
origin:
  kind: agent
  recorded_at: '2026-11-24T15:48:07.592Z'
id: FACT-prolog-release-pack-non-pr-from-source
type: fact
---
Publish, a develop push, and a manual dry run build all five launch-target archives from source.
