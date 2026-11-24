---
firmness: default
origin:
  approved_by: maintainer
  kind: agent
  recorded_at: '2026-11-23T06:15:17Z'
  ref: 'Maintainer decision, 2026-11-23, approving the Antigravity plugin requirements signoff: "All approved."'
priority: must
status: open
tags:
  - antigravity
  - hooks
  - telemetry
title: kibi-antigravity logs opt-in diagnostic hook usage telemetry to .kb/usage.log
rationale: Opt-in diagnostic hook telemetry gives parity with the other host adapters while keeping normal hook execution free of telemetry writes when KIBI_DIAGNOSTIC_MODE is disabled.
semantic_text: When KIBI_DIAGNOSTIC_MODE is enabled in an opted-in Kibi workspace, kibi-antigravity hooks must append Antigravity host usage records to .kb/usage.log through kibi-agent-core and flush them before exiting. When KIBI_DIAGNOSTIC_MODE is disabled, kibi-antigravity hooks must write no usage telemetry.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3074cfec7bc1751394918c2278be77f07b9dc976962b3bfa2494447788b21216
semantic_inventory:
  - claim_key: CLAIM-CAAB347A3ED249A6
    claim_text: When KIBI_DIAGNOSTIC_MODE is enabled in an opted-in Kibi workspace, kibi-antigravity hooks must append Antigravity host usage records to .kb/usage.log through kibi-agent-core and flush them before exiting
    role: condition
    status: modeled
    span:
      start: 0
      end: 204
    subjects:
      - antigravity.kibi_plugin
  - claim_key: CLAIM-0F735F866C2494AB
    claim_text: When KIBI_DIAGNOSTIC_MODE is disabled, kibi-antigravity hooks must write no usage telemetry
    role: condition
    status: modeled
    span:
      start: 206
      end: 297
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-CAAB347A3ED249A6
  - CLAIM-0F735F866C2494AB
id: REQ-antigravity-hook-usage-telemetry
type: req
required_evidence: tested
---
When KIBI_DIAGNOSTIC_MODE is enabled in an opted-in Kibi workspace, kibi-antigravity hooks must append Antigravity host usage records to .kb/usage.log through kibi-agent-core and flush them before exiting. When KIBI_DIAGNOSTIC_MODE is disabled, kibi-antigravity hooks must write no usage telemetry.

## Context

Opt-in diagnostic hook telemetry gives parity with the other host adapters while keeping normal hook execution free of telemetry writes when KIBI_DIAGNOSTIC_MODE is disabled.
