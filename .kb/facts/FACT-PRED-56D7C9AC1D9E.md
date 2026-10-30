---
id: FACT-PRED-56D7C9AC1D9E
title: Telemetry acceptance passes only on fresh complete evidence
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: .kb/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - acceptance
fact_kind: property_value
subject_key: kibi.telemetry.acceptance
property_key: passing_report_evidence_age_days
operator: lte
value_type: int
value_int: 7
claim_key: CLAIM-AB901A8086704B89
claim_text: The report must pass only when its evidence is no more than seven days old and every applicable metric passes
claim_span_start: 99
claim_span_end: 208
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of conservative acceptance success.
