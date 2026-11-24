---
title: Pull Request Hit Restores And Miss Builds = true
status: active
text_ref: .github/workflows/swipl-build.yml
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - prolog
  - release
fact_kind: property_value
subject_key: kibi.prolog.release_pack_archive_cache
property_key: pull_request_hit_restores_and_miss_builds
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.prolog.release_pack_archive_cache:pull_request_hit_restores_and_miss_builds:eq:true
claim_key: CLAIM-9CCDD88768EF27C4
claim_text: A pull-request run of the release dry-run must restore a per-target SWI-Prolog archive when its cache key matches and must build that target from source when the key misses
claim_span_start: 0
claim_span_end: 172
origin:
  kind: agent
  recorded_at: '2026-11-24T15:06:55.059Z'
id: FACT-prolog-release-pack-pr-cache-hit-or-source
type: fact
---
A pull-request run of the release dry-run must restore a per-target SWI-Prolog archive when its cache key matches and must build that target from source when the key misses.
