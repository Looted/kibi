---
title: kb_upsert refuses a relationship to a missing entity as a rejection
status: open
priority: must
firmness: firm
required_evidence: tested
tags:
  - mutation
  - relationships
  - telemetry
  - mcp
  - cli
semantic_text: When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target, and that it must be created first or written in the same kb_apply_plan.
rationale: Expected refusals counted as Kibi faults hide real faults in telemetry, and a generic failure gave agents no way to fix the payload.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target, and that it must be created first or written in the same kb_apply_plan."'
  recorded_at: '2026-11-16T13:34:06.341Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1df5d4cc8138aba2211e2f2fc8038a8a5726baf99afa9f7b803ce2aac96f8c47
semantic_inventory:
  - claim_key: CLAIM-EDBBCF892763C13C
    claim_text: When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target
    role: condition
    status: modeled
    span:
      start: 0
      end: 230
  - claim_key: CLAIM-5DAC8E197E8C7CF7
    claim_text: that it must be created first or written in the same kb_apply_plan
    role: normative
    status: modeled
    span:
      start: 236
      end: 302
logic_claims:
  - CLAIM-EDBBCF892763C13C
  - CLAIM-5DAC8E197E8C7CF7
id: REQ-kb-upsert-missing-endpoint-rejection
type: req
---
When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target, and that it must be created first or written in the same kb_apply_plan.

## Context

Benchmark telemetry after the 2026.11.4 release showed kb_upsert calls that linked to an entity the agent had not stored yet (usually a requirement whose write had been refused moments earlier) counted as Kibi faults. The store's missing-endpoint refusal reached the caller as a generic operation failure, so telemetry reported an expected refusal as an error, and the message did not say how to fix the payload. Resending the same payload fails the same way, so the refusal names the endpoint and the two ways forward.

## Source

Maintainer-approved statement (2026-11-16): "When a kb_upsert or kb_validate_upsert names a relationship endpoint that does not exist in the KB, Kibi refuses the write as a rejection, not an operation failure, naming the missing entity, whether it is the source or the target, and that it must be created first or written in the same kb_apply_plan."