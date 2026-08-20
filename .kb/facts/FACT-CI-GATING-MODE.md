---
id: FACT-CI-GATING-MODE
title: CI Gating Mode
status: active
created_at: 2026-04-24T00:00:00.000Z
updated_at: 2026-04-24T00:00:00.000Z
source: documentation/facts/FACT-CI-GATING-MODE.md
tags:
  - ci
  - enforcement
fact_kind: property_value
subject_key: kibi.ci.gating
property_key: pipeline_gate_mode
operator: eq
value_type: string
value_string: required_check
polarity: require
claim_key: CLAIM-C743F550C2313379
claim_text: CI also runs `kibi check` as a real gate
type: fact
---

CI pipeline runs kibi check as a required gate; failures block merge.
