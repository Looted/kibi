---
id: REQ-agent-guided-migration-orchestration
title: Agent-guided migration orchestration
status: closed
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: packages/cli/src/public/operations/migration-plan.ts
priority: must
tags:
  - cli
  - migration
  - agents
  - safety
  - review:context-missing
semantic_text: Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs. A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains. Checks and status must remain read-only. kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs. Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions. Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback.
semantic_clauses:
  - Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs.
  - A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains.
  - Checks and status must remain read-only.
  - kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs.
  - Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions.
  - Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 50bdf41afc8730742073cea4fd2fdf3aaeb1209299857e0fc3a5ebe147776f8b
logic_claims:
  - CLAIM-7E4E388191530F9C
  - CLAIM-A3051C44CDE8EFB7
  - CLAIM-1EDEF6580A6786E1
  - CLAIM-40F4E828F37792DE
  - CLAIM-CA304D0A5C107DC2
  - CLAIM-976C8836CB246AEE
semantic_inventory:
  - claim_key: CLAIM-7E4E388191530F9C
    claim_text: Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs
    role: normative
    status: modeled
    span:
      start: 0
      end: 92
  - claim_key: CLAIM-A3051C44CDE8EFB7
    claim_text: A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains
    role: normative
    status: modeled
    span:
      start: 94
      end: 245
  - claim_key: CLAIM-1EDEF6580A6786E1
    claim_text: Checks and status must remain read-only
    role: normative
    status: modeled
    span:
      start: 247
      end: 286
  - claim_key: CLAIM-40F4E828F37792DE
    claim_text: kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs
    role: normative
    status: modeled
    span:
      start: 288
      end: 407
  - claim_key: CLAIM-CA304D0A5C107DC2
    claim_text: Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions
    role: normative
    status: modeled
    span:
      start: 409
      end: 567
  - claim_key: CLAIM-976C8836CB246AEE
    claim_text: Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback
    role: normative
    status: modeled
    span:
      start: 569
      end: 707
links:
  - type: relates_to
    target: REQ-core-journaled-engine-persistence
  - type: relates_to
    target: REQ-011
  - type: specified_by
    target: SCEN-agent-guided-migration-orchestration
  - type: verified_by
    target: TEST-agent-guided-migration-orchestration
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).). Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-03T12:03:44.000Z'
firmness: default
required_evidence: tested
rationale: "Agents need a migration plan they can show a person and then apply exactly, so applying is tied to the hash of the plan that was approved and cannot drift to a different KB or workspace state."
---
- Kibi must expose one kibi.migration-plan.v2 contract from status, check and coverage outputs.
- A migration plan must bind a canonical SHA-256 planHash to the active branch, KB snapshot, workspace snapshot, configuration hash and evaluated domains.
- Checks and status must remain read-only.
- kb_apply_plan and kibi migrate --apply-safe must require the exact approved plan hash and explicit automatic action IDs.
- Semantic judgment, contradictions, E2E execution, package changes, receipt history and limitation acceptance must remain review, operator or execution actions.
- Schema and storage migrations must be ordered, idempotent, audited and recoverable, with backups preserved before the next status readback.
