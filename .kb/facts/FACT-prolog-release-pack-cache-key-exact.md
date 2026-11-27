---
title: Cache Key Is An Exact Hash Of The Build Inputs = true
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
property_key: cache_key_is_exact_hash_of_build_inputs
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.prolog.release_pack_archive_cache:cache_key_is_exact_hash_of_build_inputs:eq:true
claim_key: CLAIM-8BC0884795FDBEF7
claim_text: The cache key must be the target plus a hash of the version pins, build scripts, source patches and the build workflow, and it must have no fallback key
claim_span_start: 174
claim_span_end: 326
origin:
  kind: agent
  recorded_at: '2026-11-24T15:06:56.069Z'
id: FACT-prolog-release-pack-cache-key-exact
type: fact
---
The cache key must be the target plus a hash of the version pins, build scripts, source patches and the build workflow, and it must have no fallback key.
