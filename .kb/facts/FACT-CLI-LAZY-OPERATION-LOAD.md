---
id: FACT-CLI-LAZY-OPERATION-LOAD
title: CLI implementations load lazily with catalog parity
status: active
created_at: 2026-08-12T00:00:00.000Z
updated_at: 2026-08-12T00:00:00.000Z
source: packages/cli/src/cli-operation-loader.ts
tags:
  - lane:ontology
  - cli
  - startup
  - parity
fact_kind: property_value
subject_key: kibi.cli.startup
property_key: registration_metadata_entries_differing_from_operation_catalog
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-86A9CDC403DEED58
claim_text: CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
claim_span_start: 654
claim_span_end: 821
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
case_waiver: 'The parity test asserts equality of the real registration and catalog tables and fails on any drift; no runtime path can refuse it.'
case_waiver_approved_by: Piotr Franczyk
---

Ground representation of CLI lazy loading and authoritative metadata parity.
