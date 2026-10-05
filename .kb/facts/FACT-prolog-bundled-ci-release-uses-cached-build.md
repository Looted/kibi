---
title: Release Workflows Use Cached Build = false
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
text_ref: .github/workflows/publish.yml
fact_kind: property_value
subject_key: kibi.prolog.bundled_ci
property_key: release_workflows_use_cached_build
operator: eq
value_type: bool
value_bool: false
claim_key: CLAIM-129A0E013A27F87F
claim_text: Release workflows must never use the cached-build flag
claim_span_start: 349
claim_span_end: 403
id: FACT-prolog-bundled-ci-release-uses-cached-build
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
