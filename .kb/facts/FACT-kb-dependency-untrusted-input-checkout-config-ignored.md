---
title: A Kibi process that serves a KB dependency must not load the plugins or the env files that the dependency's checkout declares
status: active
text_ref: REQ-kb-dependency-untrusted-input
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kb-dependency-untrusted-input
fact_kind: property_value
subject_key: kibi.kb_dependency
property_key: checkout_plugins_and_env_files_loaded
operator: eq
value_type: bool
value_bool: false
claim_key: CLAIM-824AC2A11EDF73F7
claim_text: A Kibi process that serves a KB dependency must not load the plugins or the env files that the dependency's checkout declares
origin:
  kind: agent
  recorded_at: '2026-11-12T14:39:54.533Z'
id: FACT-kb-dependency-untrusted-input-checkout-config-ignored
type: fact
---
