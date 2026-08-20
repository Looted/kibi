---
id: FACT-INFERENCE-DETERMINISTIC
title: Deterministic Inference Execution
status: active
created_at: 2026-02-20T14:40:00.000Z
updated_at: 2026-04-24T08:22:00.000Z
source: documentation/facts/FACT-INFERENCE-DETERMINISTIC.md
tags:
  - inference
  - determinism
fact_kind: property_value
subject_key: kibi.inference.surface
property_key: inference_is_deterministic
operator: eq
value_type: bool
value_bool: true
polarity: require
claim_key: CLAIM-E63C682E6A6BEE59
claim_text: Kibi must keep deterministic inference capabilities available for product and automation use, but they are not exposed as a raw public inference surface
type: fact
---

Inference outputs are deterministic for the same graph state and query inputs.
