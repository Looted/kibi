---
title: The default telemetry acceptance policy limits
status: open
priority: must
firmness: firm
semantic_text: The telemetry acceptance report shall read at most 200 usage events. The maximum telemetry evidence age shall be 604800 seconds. The maximum validation preflight age shall be 3600 seconds. The maximum semantic-advisor age shall be 86400 seconds. The repeated mutation failure threshold shall be 3 failed upserts.
semantic_clauses:
  - The telemetry acceptance report shall read at most 200 usage events.
  - The maximum telemetry evidence age shall be 604800 seconds.
  - The maximum validation preflight age shall be 3600 seconds.
  - The maximum semantic-advisor age shall be 86400 seconds.
  - The repeated mutation failure threshold shall be 3 failed upserts.
tags:
  - telemetry
  - acceptance
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T09:43:13.611Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: dacf252b2b9a07a59013e88d1a29bcca9a5994c857e8f2e01f61acc2d3d8fc22
semantic_inventory:
  - claim_key: CLAIM-1E510239A7351EB3
    claim_text: The telemetry acceptance report shall read at most 200 usage events
    role: normative
    status: modeled
    span:
      start: 0
      end: 67
  - claim_key: CLAIM-0731977316FB677B
    claim_text: The maximum telemetry evidence age shall be 604800 seconds
    role: normative
    status: modeled
    span:
      start: 69
      end: 127
  - claim_key: CLAIM-DCD38AF69BA97336
    claim_text: The maximum validation preflight age shall be 3600 seconds
    role: normative
    status: modeled
    span:
      start: 129
      end: 187
  - claim_key: CLAIM-F3DAB90B091449BF
    claim_text: The maximum semantic-advisor age shall be 86400 seconds
    role: normative
    status: modeled
    span:
      start: 189
      end: 244
  - claim_key: CLAIM-7359B46424CC0BF4
    claim_text: The repeated mutation failure threshold shall be 3 failed upserts
    role: normative
    status: modeled
    span:
      start: 246
      end: 311
logic_claims:
  - CLAIM-1E510239A7351EB3
  - CLAIM-0731977316FB677B
  - CLAIM-DCD38AF69BA97336
  - CLAIM-F3DAB90B091449BF
  - CLAIM-7359B46424CC0BF4
id: REQ-kibi-telemetry-acceptance-thresholds
type: req
---
The telemetry acceptance report shall read at most 200 usage events. The maximum telemetry evidence age shall be 604800 seconds. The maximum validation preflight age shall be 3600 seconds. The maximum semantic-advisor age shall be 86400 seconds. The repeated mutation failure threshold shall be 3 failed upserts.

## Context

These are the limits DEFAULT_TELEMETRY_ACCEPTANCE_POLICY in packages/cli/src/public/telemetry-acceptance.ts sets for the telemetry acceptance report described by REQ-kibi-telemetry-acceptance-gate-v2 (the latest 200 events, evidence no more than seven days old, a preflight within one hour, an advisor call within 24 hours, three failed upserts). Each limit is stated here as a number so it is proved against the policy field itself; how the report uses each limit stays in REQ-kibi-telemetry-acceptance-gate-v2.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"