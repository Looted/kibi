---
title: Kibi check surfaces must keep objectively invalid graph/schema/strict-fact state
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.checks.quality_diagnostics
property_key: invalid_states_in_violations_lane
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_audit_quality_diagnostics_v1.invalid_states_in_violations_lane.eq.true
claim_key: CLAIM-527EA2A164A47E49
claim_text: Kibi check surfaces must keep objectively invalid graph/schema/strict-fact states in the hard `violations[]` lane while surfacing heuristic modeling-quality signals in non-blocking `qualityDiagnostics[]`
id: FACT-PROP-REQ-AUDIT-QUALITY-DIAGNOSTICS-V1-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
