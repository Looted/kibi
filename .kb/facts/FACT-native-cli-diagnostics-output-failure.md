---
title: Output Failure Preserves Success = true
status: active
text_ref: scripts/swipl-spike.py
tags:
  - strict-modeling
  - confidence:1.00
  - confidence-band:high
  - provenance:scripts-swipl-spike-py
  - lane:strict
  - fact:property_value
fact_kind: property_value
subject_key: kibi.testing.native_cli_diagnostics
property_key: output_failure_preserves_success
canonical_key: scripts-swipl-spike-py:kibi.testing.native_cli_diagnostics:output_failure_preserves_success:eq:true
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-86A9DCA7DEE3EE2A
claim_text: An unavailable native CLI diagnostic output must preserve a successful monitored command result and stdout and stderr
id: FACT-native-cli-diagnostics-output-failure
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
