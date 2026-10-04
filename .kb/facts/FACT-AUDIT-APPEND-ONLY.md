---
id: FACT-AUDIT-APPEND-ONLY
title: Append-Only Audit History
status: active
created_at: 2026-02-20T14:40:00.000Z
updated_at: 2026-04-24T00:00:00.000Z
tags:
  - audit
  - history
fact_kind: property_value
subject_key: kibi.write.governance
property_key: audit_history_mode
operator: eq
value_type: string
value_string: append_only
polarity: require
claim_key: CLAIM-7F7508DA91B940B9
claim_text: The RDF store is append-only; history is preserved via `rdf_persistency`
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Audit history is append-only to preserve write provenance.
