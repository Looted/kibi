---
title: Publish drops the run binding
status: active
tags:
  - negative-path
  - fact:property_value
fact_kind: property_value
subject_key: kibi.prolog.release_pack_archive_cache
property_key: publish_drops_run_binding
operator: eq
value_type: bool
value_bool: true
text_ref: .github/workflows/publish.yml
origin:
  kind: agent
  recorded_at: '2026-11-24T15:41:35.853Z'
id: FACT-NEG-prolog-release-pack-publish-drops-binding
type: fact
---
The failure case for publish: the run binding is dropped, which the requirement forbids.
