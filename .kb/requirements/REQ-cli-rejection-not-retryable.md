---
title: The CLI JSON error envelope marks refusals not retryable
status: open
priority: must
firmness: firm
required_evidence: tested
tags:
  - cli
  - errors
  - telemetry
semantic_text: The CLI JSON error envelope must report retryable false when Kibi refuses the call's input or the workspace state, including every KB rejection. Retryable true is reserved for failures that the same call, repeated unchanged, may get past, such as a timed-out workspace lock or an unexplained operation failure.
rationale: Agents read retryable true as an invitation to resend the same call, and a refusal fails the same way every time until the agent fixes the input.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "The CLI JSON error envelope must report retryable false when Kibi refuses the call''s input or the workspace state, including every KB rejection. Retryable true is reserved for failures that the same call, repeated unchanged, may get past, such as a timed-out workspace lock or an unexplained operation failure."'
  recorded_at: '2026-11-16T14:40:15.492Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: def748cf8c661c50b8a9c3ba47e300f3f3cc93aa42811db0859aaa0d1d41fcc3
semantic_inventory:
  - claim_key: CLAIM-FAC6A1BBCF1FCE25
    claim_text: The CLI JSON error envelope must report retryable false when Kibi refuses the call's input or the workspace state, including every KB rejection
    role: normative
    status: modeled
    span:
      start: 0
      end: 143
  - claim_key: CLAIM-F137343333BCA65E
    claim_text: Retryable true is reserved for failures that the same call, repeated unchanged, may get past, such as a timed-out workspace lock or an unexplained operation failure
    role: example
    status: nonlogical
    span:
      start: 145
      end: 309
logic_claims:
  - CLAIM-FAC6A1BBCF1FCE25
id: REQ-cli-rejection-not-retryable
type: req
---
The CLI JSON error envelope must report retryable false when Kibi refuses the call's input or the workspace state, including every KB rejection. Retryable true is reserved for failures that the same call, repeated unchanged, may get past, such as a timed-out workspace lock or an unexplained operation failure.

## Context

While turning a missing relationship endpoint into a rejection, the CLI JSON route was found to wrap every thrown error as OPERATION_FAILED with retryable true, so every KB rejection (validation refusals, contradictions, firm-decision locks, missing endpoints) told the agent to retry an unchanged call that can only fail again. OperationError also defaulted to retryable true, so refusals such as SOURCE_PATH_INVALID, SOURCE_FORMAT_UNSUPPORTED and PROTOCOL_VALIDATION_FAILED did the same. The maintainer asked for rejections to be non-retryable and for only genuinely transient failures to stay retryable.

## Source

Maintainer-approved statement (2026-11-16): "The CLI JSON error envelope must report retryable false when Kibi refuses the call's input or the workspace state, including every KB rejection. Retryable true is reserved for failures that the same call, repeated unchanged, may get past, such as a timed-out workspace lock or an unexplained operation failure."