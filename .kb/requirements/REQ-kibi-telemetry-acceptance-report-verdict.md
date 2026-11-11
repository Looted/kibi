---
title: The usage acceptance report passes only on fresh complete evidence and gates the CLI exit code
status: open
semantic_text: Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report. The report must pass only when its evidence is no more than seven days old and every applicable metric passes. Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient. The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures. An absent opt-in usage log must not fabricate telemetry evidence. kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report.
semantic_clauses:
  - Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report.
  - The report must pass only when its evidence is no more than seven days old and every applicable metric passes.
  - Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient.
  - The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures.
  - An absent opt-in usage log must not fabricate telemetry evidence.
  - kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5a88b33dad1bd8a0b20a02d35b3cc09cacc487f85fd04fa7424ae8ca59c77495
semantic_inventory:
  - claim_key: CLAIM-2E5B714C69B22D1D
    claim_text: Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-AB901A8086704B89
    claim_text: The report must pass only when its evidence is no more than seven days old and every applicable metric passes
    role: normative
    status: modeled
    span:
      start: 99
      end: 208
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-09AD7C82E721C27F
    claim_text: Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient
    role: normative
    status: modeled
    span:
      start: 210
      end: 296
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-531270A744471224
    claim_text: The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures
    role: normative
    status: modeled
    span:
      start: 298
      end: 589
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A750757F5BC9A560
    claim_text: An absent opt-in usage log must not fabricate telemetry evidence
    role: normative
    status: modeled
    span:
      start: 591
      end: 655
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-8BF5CD6FD8431A80
    claim_text: kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report
    role: exception
    status: modeled
    span:
      start: 657
      end: 782
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
logic_claims:
  - CLAIM-2E5B714C69B22D1D
  - CLAIM-AB901A8086704B89
  - CLAIM-09AD7C82E721C27F
  - CLAIM-531270A744471224
  - CLAIM-A750757F5BC9A560
  - CLAIM-8BF5CD6FD8431A80
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:07:41.690Z'
priority: must
required_evidence: tested
tags:
  - requirements
  - telemetry
  - acceptance
  - workflow
id: REQ-kibi-telemetry-acceptance-report-verdict
type: req
---
Kibi must evaluate the latest 200 usage events as a versioned kibi.telemetry-acceptance.v1 report. The report must pass only when its evidence is no more than seven days old and every applicable metric passes. Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient. The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, lookup before the first edit of requirement-linked code, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures. An absent opt-in usage log must not fabricate telemetry evidence. kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report.

## Context

The verdict reads the latest events in a fixed window, so old, partial or missing evidence can only ever be insufficient, never a pass.

Usage telemetry is how Kibi checks that agents really follow the workflow it asks for, so its verdict must never pass on thin or stale evidence and its metrics must only credit steps that actually happened in order.

## Why this changed

Split from REQ-kibi-telemetry-acceptance-gate-v2, which held three behaviors: the report window and its verdict, how each workflow metric correlates events, and the kb_check diagnostics and audit fields built on the same records. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
