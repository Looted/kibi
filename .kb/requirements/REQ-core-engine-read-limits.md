---
title: Opt-in engine read limits stop runaway reads without partial answers
status: open
priority: should
tags:
  - engine
  - prolog
  - limits
  - query
  - concurrency
semantic_text: Engine read limits must apply only when KIBI_ENGINE_READ_TIME_LIMIT_MS or KIBI_ENGINE_READ_INFERENCE_LIMIT is set. Each bounded read-only engine request must stop at its configured time or inference limit. A read that hits its limit must fail with QUERY_LIMIT_EXCEEDED and the exceeded limit kind and value on the CLI and MCP envelopes instead of returning a partial answer. A stopped read must free the engine queue for the next client. The read time limit must be capped below the hard engine query timeout. Writes, module loads, and sync compilation must never be bounded by the engine read limits.
semantic_clauses:
  - Engine read limits must apply only when KIBI_ENGINE_READ_TIME_LIMIT_MS or KIBI_ENGINE_READ_INFERENCE_LIMIT is set.
  - Each bounded read-only engine request must stop at its configured time or inference limit.
  - A read that hits its limit must fail with QUERY_LIMIT_EXCEEDED and the exceeded limit kind and value on the CLI and MCP envelopes instead of returning a partial answer.
  - A stopped read must free the engine queue for the next client.
  - The read time limit must be capped below the hard engine query timeout.
  - Writes, module loads, and sync compilation must never be bounded by the engine read limits.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7cf9a01aef1d228344150dca4308ffd3518e4419b0fdc4484d87ac9d895daa8f
semantic_inventory:
  - claim_key: CLAIM-ACFF98FA7F129299
    claim_text: Engine read limits must apply only when KIBI_ENGINE_READ_TIME_LIMIT_MS or KIBI_ENGINE_READ_INFERENCE_LIMIT is set
    role: normative
    span:
      start: 0
      end: 113
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-FDA403C77E8B1F38
    claim_text: Each bounded read-only engine request must stop at its configured time or inference limit
    role: normative
    span:
      start: 115
      end: 204
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F281E365BEDA2D05
    claim_text: A read that hits its limit must fail with QUERY_LIMIT_EXCEEDED and the exceeded limit kind and value on the CLI and MCP envelopes instead of returning a partial answer
    role: normative
    span:
      start: 206
      end: 373
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-41ACADA5ED951161
    claim_text: A stopped read must free the engine queue for the next client
    role: normative
    span:
      start: 375
      end: 436
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-C3ED3CB1F036DD86
    claim_text: The read time limit must be capped below the hard engine query timeout
    role: normative
    span:
      start: 438
      end: 508
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E198F8E45755DEFA
    claim_text: Writes, module loads, and sync compilation must never be bounded by the engine read limits
    role: normative
    span:
      start: 510
      end: 600
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-ACFF98FA7F129299
  - CLAIM-FDA403C77E8B1F38
  - CLAIM-F281E365BEDA2D05
  - CLAIM-41ACADA5ED951161
  - CLAIM-C3ED3CB1F036DD86
  - CLAIM-E198F8E45755DEFA
origin:
  kind: agent
  recorded_at: '2026-10-04T02:19:03.302Z'
id: REQ-core-engine-read-limits
type: req
---
Engine read limits must apply only when KIBI_ENGINE_READ_TIME_LIMIT_MS or KIBI_ENGINE_READ_INFERENCE_LIMIT is set. Each bounded read-only engine request must stop at its configured time or inference limit. A read that hits its limit must fail with QUERY_LIMIT_EXCEEDED and the exceeded limit kind and value on the CLI and MCP envelopes instead of returning a partial answer. A stopped read must free the engine queue for the next client. The read time limit must be capped below the hard engine query timeout. Writes, module loads, and sync compilation must never be bounded by the engine read limits.

## Rationale

Kibi can now stop a runaway read before it blocks other agents that share the per-workspace engine (changeset `detached-reads-fast-sync-read-limits`). The limits are opt-in and unset by default, bound only read-only requests through `call_with_time_limit/2` and `call_with_inference_limit/3`, and a read that hits one fails with `QUERY_LIMIT_EXCEEDED`, never with a partial answer; writes, module loads and sync compilation are never bounded.
