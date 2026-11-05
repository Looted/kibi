---
title: Applying a migration needs the approved plan hash and explicit action IDs
status: open
semantic_text: kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs. Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions. Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback.
semantic_clauses:
  - kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs.
  - Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions.
  - Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 394e952489e8cbc323489576882d7c64a9936b622a43370adf0004fd89555d7c
semantic_inventory:
  - claim_key: CLAIM-40F4E828F37792DE
    claim_text: kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs
    role: normative
    status: modeled
    span:
      start: 0
      end: 119
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-CA304D0A5C107DC2
    claim_text: Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions
    role: normative
    status: modeled
    span:
      start: 121
      end: 279
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-976C8836CB246AEE
    claim_text: Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback
    role: normative
    status: modeled
    span:
      start: 281
      end: 419
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-40F4E828F37792DE
  - CLAIM-CA304D0A5C107DC2
  - CLAIM-976C8836CB246AEE
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T07:08:59.316Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - cli
  - migration
  - agents
  - safety
  - review:context-missing
id: REQ-kibi-migration-apply-gate
type: req
---
kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs. Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions. Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback.

## Context

Only the automatic actions a person approved run, and only against the plan they saw.



## Why this changed

Split from REQ-agent-guided-migration-orchestration, which held two behaviors: the read-only, hash-bound migration plan, and the gate that applies an approved plan. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
