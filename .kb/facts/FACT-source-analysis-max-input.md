---
title: The maximum source analysis input shall be 5242880 code units
status: active
fact_kind: property_value
subject_key: kibi.plugin.source_analysis
claim_key: CLAIM-82659EB982EDC5B2
claim_text: The maximum source analysis input shall be 5242880 code units
text_ref: REQ-capability-plugin-source-analysis-input-limit
property_key: max_input_code_units
operator: eq
value_type: int
value_int: 5242880
origin:
  kind: agent
  recorded_at: '2026-10-28T10:52:08.988Z'
id: FACT-source-analysis-max-input
type: fact
---
SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS in kibi-plugin-sdk is the input bound REQ-capability-plugin-protocol-v1 sets for source analysis v2: 5 MiB of UTF-16 code units. It is stated here as a number so it is proved against the constant.