---
title: kibi.symbols.coordinates clause 1
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.symbols.coordinates
property_key: coordinates_not_authored
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_generated_coordinate_persistence.coordinates_not_authored.eq.true
claim_key: CLAIM-2E1D66B90856D0BC
claim_text: Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state
id: FACT-PROP-REQ-GENERATED-COORDINATE-PERSISTENCE-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
