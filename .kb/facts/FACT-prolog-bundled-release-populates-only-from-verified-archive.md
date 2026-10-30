---
title: No platform package is populated from an unverified archive
status: active
fact_kind: property_value
subject_key: kibi.prolog.bundled_release
property_key: platform_packages_from_unverified_archive
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.prolog.bundled_release:platform_packages_from_unverified_archive:eq:0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
text_ref: scripts/populate-swipl-platform-packages.mjs
claim_key: CLAIM-239A01CC6F49DCFD
claim_text: Release packaging must populate each kibi-swipl platform package only from a SWI-Prolog archive whose SHA-256 sidecar, pinned provenance, and binary SHA-256 all verify
claim_span_start: 0
claim_span_end: 167
id: FACT-prolog-bundled-release-populates-only-from-verified-archive
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
