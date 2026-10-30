---
title: Platform package payloads hold no symbolic links
status: active
fact_kind: property_value
subject_key: kibi.prolog.bundled_release
property_key: symbolic_links_in_platform_payloads
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.prolog.bundled_release:symbolic_links_in_platform_payloads:eq:0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
text_ref: scripts/populate-swipl-platform-packages.mjs
claim_key: CLAIM-7D4BAD0538477DBF
claim_text: Release packaging must ship each platform package payload as regular files with no symbolic links
claim_span_start: 169
claim_span_end: 266
id: FACT-prolog-bundled-release-ships-regular-files-only
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
