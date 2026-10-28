---
title: Telemetry acceptance versions and lookup operations
status: open
priority: must
firmness: firm
semantic_text: The telemetry acceptance version shall be kibi.telemetry-acceptance.v1. The telemetry remediation version shall be kibi.telemetry-remediation.v1. A lookup before an edit shall be kb_query or kb_search.
semantic_clauses:
  - The telemetry acceptance version shall be kibi.telemetry-acceptance.v1.
  - The telemetry remediation version shall be kibi.telemetry-remediation.v1.
  - A lookup before an edit shall be kb_query or kb_search.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:52:12.127Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0d395328ca3ab8795187b9135c02924e6896cac3bf888193b24aff74506fab66
semantic_inventory:
  - claim_key: CLAIM-461C66C6CB3D0930
    claim_text: The telemetry acceptance version shall be kibi.telemetry-acceptance.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 70
  - claim_key: CLAIM-DF6C9E64C0F42182
    claim_text: The telemetry remediation version shall be kibi.telemetry-remediation.v1
    role: normative
    status: modeled
    span:
      start: 72
      end: 144
  - claim_key: CLAIM-F1C97CDB0D53ED42
    claim_text: A lookup before an edit shall be kb_query or kb_search
    role: normative
    status: modeled
    span:
      start: 146
      end: 200
logic_claims:
  - CLAIM-461C66C6CB3D0930
  - CLAIM-DF6C9E64C0F42182
  - CLAIM-F1C97CDB0D53ED42
id: REQ-kibi-telemetry-versions
type: req
---
The telemetry acceptance version shall be kibi.telemetry-acceptance.v1. The telemetry remediation version shall be kibi.telemetry-remediation.v1. A lookup before an edit shall be kb_query or kb_search.

## Context

REQ-kibi-telemetry-acceptance-gate scores agent sessions from telemetry. Its report and the remediation evidence carry versions, and only a closed list of operations counts as looking up the KB before an edit. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"