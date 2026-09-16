---
id: REQ-agent-guided-migration-orchestration
title: Agent-guided migration orchestration
status: open
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: packages/cli/src/public/operations/migration-plan.ts
priority: must
tags:
  - cli
  - migration
  - agents
  - safety
semantic_text: Kibi MUST expose one kibi.migration-plan.v2 contract from status check and coverage outputs\n\nEvery migration plan MUST bind a canonical SHA-256 planHash to the active branch KB snapshot workspace snapshot configuration hash and evaluated domains\n\nChecks and status MUST remain read-only while kb_apply_plan and kibi migrate --apply-safe MUST require the exact approved plan hash and explicit automatic action IDs\n\nSemantic judgment contradictions E2E execution package changes receipt history and limitation acceptance MUST remain review operator or execution actions\n\nSchema and storage migrations MUST be ordered idempotent audited and recoverable with preserved backups before the next status readback
semantic_clauses:
  - Kibi MUST expose one kibi.migration-plan.v2 contract from status check and coverage outputs\n\nEvery migration plan MUST bind a canonical SHA-256 planHash to the active branch KB snapshot workspace snapshot configuration hash and evaluated domains\n\nChecks and status MUST remain read-only while kb_apply_plan and kibi migrate --apply-safe MUST require the exact approved plan hash and explicit automatic action IDs\n\nSemantic judgment contradictions E2E execution package changes receipt history and limitation acceptance MUST remain review operator or execution actions\n\nSchema and storage migrations MUST be ordered idempotent audited and recoverable with preserved backups before the next status readback
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d7dc74b7fa1675065afe71cbf3fd13fc4ceacae65fefa468ccdd2b835f8b8bb3
logic_claims:
  - CLAIM-F216C603723B0E2B
semantic_inventory:
  - claim_key: CLAIM-F216C603723B0E2B
    claim_text: Kibi MUST expose one kibi.migration-plan.v2 contract from status check and coverage outputs\n\nEvery migration plan MUST bind a canonical SHA-256 planHash to the active branch KB snapshot workspace snapshot configuration hash and evaluated domains\n\nChecks and status MUST remain read-only while kb_apply_plan and kibi migrate --apply-safe MUST require the exact approved plan hash and explicit automatic action IDs\n\nSemantic judgment contradictions E2E execution package changes receipt history and limitation acceptance MUST remain review operator or execution actions\n\nSchema and storage migrations MUST be ordered idempotent audited and recoverable with preserved backups before the next status readback
    role: normative
    status: modeled
    span:
      start: 0
      end: 712
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
---

Kibi exposes a single typed migration plan so agents can inspect deterministic
repair work and distinguish it from semantic, operator, and execution work.
Status and checks are read-only; only explicitly approved automatic actions may
be applied, and every application is followed by a fresh readback.
