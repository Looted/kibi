---
title: Populates Only From Verified Archive = true
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
text_ref: scripts/populate-swipl-platform-packages.mjs
fact_kind: property_value
subject_key: kibi.prolog.bundled_release
property_key: populates_only_from_verified_archive
operator: eq
value_type: bool
value_bool: true
canonical_key: scripts-populate-swipl-platform-packages-mjs:kibi.prolog.bundled_release:populates_only_from_verified_archive:eq:true
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
