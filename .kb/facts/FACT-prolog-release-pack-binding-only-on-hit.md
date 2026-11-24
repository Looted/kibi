---
title: Pull Request Drops Run Binding Only On Cache Hit = true
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
property_key: pull_request_drops_run_binding_only_on_cache_hit
operator: eq
value_type: bool
value_bool: true
canonical_key: kibi.prolog.release_pack_archive_cache:pull_request_drops_run_binding_only_on_cache_hit:eq:true
claim_key: CLAIM-7813F93A42785030
claim_text: A pull-request dry run must drop the commit and run binding only when the restored archive's cache status says hit
claim_span_start: 461
claim_span_end: 575
origin:
  kind: agent
  recorded_at: '2026-11-24T15:06:57.935Z'
id: FACT-prolog-release-pack-binding-only-on-hit
type: fact
---
A pull-request dry run must drop the commit and run binding only when the restored archive's cache status says hit.
