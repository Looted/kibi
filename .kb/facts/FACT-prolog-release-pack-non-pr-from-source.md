---
title: Non Pull Request Restores Cached Archive = false
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
property_key: non_pull_request_restores_cached_archive
operator: eq
value_type: bool
value_bool: false
canonical_key: kibi.prolog.release_pack_archive_cache:non_pull_request_restores_cached_archive:eq:false
claim_key: CLAIM-7EE07E05E0A42486
claim_text: Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive
claim_span_start: 328
claim_span_end: 459
origin:
  kind: agent
  recorded_at: '2026-11-24T15:06:57.020Z'
id: FACT-prolog-release-pack-non-pr-from-source
type: fact
---
Publish, a dry-run push and a manual dry-run must build every archive from source in that run and must not restore a cached archive.
