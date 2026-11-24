---
title: A non-launch target is treated as built from source
status: active
tags:
  - negative-path
  - fact:property_value
fact_kind: property_value
subject_key: kibi.prolog.release_pack_archive_cache
property_key: non_pull_request_from_source_targets
operator: includes
value_type: set
value_set:
  - not-a-launch-target
text_ref: .github/workflows/swipl-build.yml
origin:
  kind: agent
  recorded_at: '2026-11-24T15:49:01.941Z'
id: FACT-NEG-prolog-release-pack-foreign-target
type: fact
---
Failure case: a target outside the five launch targets is included in the from-source set.
