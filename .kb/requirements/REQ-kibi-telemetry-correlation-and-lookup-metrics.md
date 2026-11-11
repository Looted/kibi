---
title: Telemetry metrics credit validation, advisor use, recovery, retries and lookup only when the events correlate in order
status: open
semantic_text: Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert. Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write. Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports. Three consecutive failed upserts for one mutation target must fail the retry-discipline metric. The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file. The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file.
semantic_clauses:
  - Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert.
  - Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write.
  - Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports.
  - Three consecutive failed upserts for one mutation target must fail the retry-discipline metric.
  - The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file.
  - The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6570434458cf6efab0d2af12fdaed2cfa1f611229b17b89cf7edc2459fc366f0
semantic_inventory:
  - claim_key: CLAIM-A632F920AC680BA9
    claim_text: Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-81D951F7E8ADFDDB
    claim_text: Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write
    role: normative
    status: modeled
    span:
      start: 124
      end: 262
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-46FCE7D8D88A8AC5
    claim_text: Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports
    role: normative
    status: modeled
    span:
      start: 264
      end: 392
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-96B079D7FE47A40C
    claim_text: Three consecutive failed upserts for one mutation target must fail the retry-discipline metric
    role: normative
    status: modeled
    span:
      start: 394
      end: 488
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-DB97AA4726C06D6A
    claim_text: The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file
    role: normative
    status: modeled
    span:
      start: 490
      end: 656
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-2826A6AB85ACB393
    claim_text: The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file
    role: normative
    status: modeled
    span:
      start: 658
      end: 780
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-A632F920AC680BA9
  - CLAIM-81D951F7E8ADFDDB
  - CLAIM-46FCE7D8D88A8AC5
  - CLAIM-96B079D7FE47A40C
  - CLAIM-DB97AA4726C06D6A
  - CLAIM-2826A6AB85ACB393
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:08:11.502Z'
priority: must
required_evidence: tested
tags:
  - requirements
  - telemetry
  - acceptance
  - workflow
  - hooks
id: REQ-kibi-telemetry-correlation-and-lookup-metrics
type: req
---
Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert. Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write. Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports. Three consecutive failed upserts for one mutation target must fail the retry-discipline metric. The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file. The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file.

## Context

Each metric matches a step to the exact write, requirement or session it belongs to within a bounded time, so an unrelated or late event never earns credit.

Usage telemetry is how Kibi checks that agents really follow the workflow it asks for, so its verdict must never pass on thin or stale evidence and its metrics must only credit steps that actually happened in order.

## Why this changed

Split from REQ-kibi-telemetry-acceptance-gate-v2, which held three behaviors: the report window and its verdict, how each workflow metric correlates events, and the kb_check diagnostics and audit fields built on the same records. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
