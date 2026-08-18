---
title: Raw inference exposure policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: raw_inference_exposure
predicate_namespace: kibi.domain
predicate_arity: 3
argument_names:
  - surface
  - public_mode
  - internal_mode
argument_types:
  - surface
  - exposure_mode
  - exposure_mode
argument_descriptions:
  - Inference surface.
  - Raw public exposure mode.
  - Internal deterministic availability mode.
examples:
  - raw_inference_exposure(kibi_inference,disabled,enabled)
id: FACT-SCHEMA-RAW-INFERENCE-EXPOSURE
type: fact
---
