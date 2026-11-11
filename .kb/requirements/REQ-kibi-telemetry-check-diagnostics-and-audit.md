---
title: kb_check surfaces telemetry as ranked advisory diagnostics and usage records keep their audit fields
status: open
semantic_text: An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists. Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit.
semantic_clauses:
  - An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists.
  - Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a9e42c0a1fedccba57461c17f022eface05c24afab3f18b097b96ad702b7bccf
semantic_inventory:
  - claim_key: CLAIM-0AC18929C46FFB0D
    claim_text: An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists
    role: normative
    status: modeled
    span:
      start: 0
      end: 105
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-776EBD9C6088ED12
    claim_text: Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit
    role: normative
    status: modeled
    span:
      start: 107
      end: 285
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
logic_claims:
  - CLAIM-0AC18929C46FFB0D
  - CLAIM-776EBD9C6088ED12
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:08:41.842Z'
priority: must
required_evidence: tested
tags:
  - requirements
  - telemetry
  - acceptance
  - diagnostics
id: REQ-kibi-telemetry-check-diagnostics-and-audit
type: req
---
An unfiltered kb_check must add ranked non-blocking telemetry quality diagnostics when a usage log exists. Diagnostic usage records must preserve stable mutation fingerprints, semantic source hashes, proof-gap counts, receipt-gap counts, and coverage-scope completeness for later audit.

## Context

Telemetry findings help a maintainer see workflow drift in the normal check without ever blocking it, and the records keep enough detail to audit a finding later.

Usage telemetry is how Kibi checks that agents really follow the workflow it asks for, so its verdict must never pass on thin or stale evidence and its metrics must only credit steps that actually happened in order.

## Why this changed

Split from REQ-kibi-telemetry-acceptance-gate-v2, which held three behaviors: the report window and its verdict, how each workflow metric correlates events, and the kb_check diagnostics and audit fields built on the same records. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
