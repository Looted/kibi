---
id: REQ-agent-guided-migration-orchestration
title: Agent-guided migration orchestration
status: open
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: packages/cli/src/public/operations/migration-plan.ts
priority: must
tags:
  - cli
  - migration
  - agents
  - safety
semantic_text: |-
  Kibi MUST expose one kibi.migration-plan.v2 contract from status check and coverage outputs

  Every migration plan MUST bind a canonical SHA-256 planHash to the active branch KB snapshot workspace snapshot configuration hash and evaluated domains

  Checks and status MUST remain read-only while kb_apply_plan and kibi migrate --apply-safe MUST require the exact approved plan hash and explicit automatic action IDs

  Semantic judgment contradictions E2E execution package changes receipt history and limitation acceptance MUST remain review operator or execution actions

  Schema and storage migrations MUST be ordered idempotent audited and recoverable with preserved backups before the next status readback
semantic_clauses:
  - Kibi MUST expose one kibi.migration-plan.v2 contract from status check and coverage outputs
  - Every migration plan MUST bind a canonical SHA-256 planHash to the active branch KB snapshot workspace snapshot configuration hash and evaluated domains
  - Checks and status MUST remain read-only while kb_apply_plan and kibi migrate --apply-safe MUST require the exact approved plan hash and explicit automatic action IDs
  - Semantic judgment contradictions E2E execution package changes receipt history and limitation acceptance MUST remain review operator or execution actions
  - Schema and storage migrations MUST be ordered idempotent audited and recoverable with preserved backups before the next status readback
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6698cb276d21713e8894f8ff805e31a8d42161520d28819ec667c923e904b7ad
logic_claims:
  - CLAIM-5EF59564E05A8C05
  - CLAIM-9ECA827AD2AF2BEE
  - CLAIM-DDE966DD631FAC53
  - CLAIM-3EF02740A21BCBAE
  - CLAIM-AD03788F5B2C23FD
semantic_inventory:
  - claim_key: CLAIM-5EF59564E05A8C05
    claim_text: Kibi MUST expose one kibi.migration-plan.v2 contract from status check and coverage outputs
    role: normative
    status: ontology_gap
    span: {start: 0, end: 91}
  - claim_key: CLAIM-9ECA827AD2AF2BEE
    claim_text: Every migration plan MUST bind a canonical SHA-256 planHash to the active branch KB snapshot workspace snapshot configuration hash and evaluated domains
    role: normative
    status: ontology_gap
    span: {start: 93, end: 245}
  - claim_key: CLAIM-DDE966DD631FAC53
    claim_text: Checks and status MUST remain read-only while kb_apply_plan and kibi migrate --apply-safe MUST require the exact approved plan hash and explicit automatic action IDs
    role: normative
    status: ontology_gap
    span: {start: 247, end: 412}
  - claim_key: CLAIM-3EF02740A21BCBAE
    claim_text: Semantic judgment contradictions E2E execution package changes receipt history and limitation acceptance MUST remain review operator or execution actions
    role: normative
    status: ontology_gap
    span: {start: 414, end: 567}
  - claim_key: CLAIM-AD03788F5B2C23FD
    claim_text: Schema and storage migrations MUST be ordered idempotent audited and recoverable with preserved backups before the next status readback
    role: normative
    status: ontology_gap
    span: {start: 569, end: 704}
links:
  - type: relates_to
    target: REQ-core-journaled-engine-persistence
  - type: relates_to
    target: REQ-011
  - type: specified_by
    target: SCEN-agent-guided-migration-orchestration
  - type: verified_by
    target: TEST-agent-guided-migration-orchestration
---

Kibi exposes a single typed migration plan so agents can inspect deterministic
repair work and distinguish it from semantic, operator, and execution work.
Status and checks are read-only; only explicitly approved automatic actions may
be applied, and every application is followed by a fresh readback.
