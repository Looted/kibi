---
claim_key: CLAIM-CAAB347A3ED249A6
claim_text: When KIBI_DIAGNOSTIC_MODE is enabled in an opted-in Kibi workspace, kibi-antigravity hooks must append Antigravity host usage records to .kb/usage.log through kibi-agent-core and flush them before exiting
fact_kind: property_value
operator: eq
origin:
  kind: agent
  recorded_at: '2026-11-22T05:13:31.192Z'
property_key: diagnostic_mode_writes_usage_log
status: active
subject_key: antigravity.kibi_plugin
text_ref: REQ-antigravity-hook-usage-telemetry
title: kibi-antigravity writes usage telemetry to .kb/usage.log when KIBI_DIAGNOSTIC_MODE is enabled
value_bool: true
value_type: bool
id: FACT-antigravity-diagnostic-telemetry-optin
type: fact
---
