---
id: REQ-core-audit-logging
title: Audit logging for all KB mutations
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-009
priority: must
tags:
  - core
  - prolog
  - audit
links:
  - type: supersedes
    target: REQ-009
  - type: specified_by
    target: SCEN-001
semantic_text: 'Audit logging: All entity and relationship mutations in the KB are recorded in a persistent audit log (audit.log) in the branch directory. Each audit log entry includes a timestamp, the operation type, and the affected entity data.'
semantic_clauses:
  - All entity and relationship mutations in the KB are recorded in a persistent audit log (audit.log) in the branch directory
  - Each audit log entry includes a timestamp, the operation type, and the affected entity data
semantic_inventory:
  - claim_key: CLAIM-3F9DB0AE7FC227B0
    claim_text: All entity and relationship mutations in the KB are recorded in a persistent audit log (audit.log) in the branch directory
    role: descriptive
    status: modeled
    span:
      start: 15
      end: 137
    payload_hash: f49115b7d0b978df9dccbd0abcc38fe7609b36ba7b44545a2317afc630d9375f
    reason: Grounded by FACT-core-audit-logging-C227B0 via requires_predicate.
  - claim_key: CLAIM-33C75F0D3C7CEFB9
    claim_text: Each audit log entry includes a timestamp, the operation type, and the affected entity data
    role: descriptive
    status: modeled
    span:
      start: 139
      end: 230
    payload_hash: f49115b7d0b978df9dccbd0abcc38fe7609b36ba7b44545a2317afc630d9375f
    reason: Grounded by FACT-core-audit-logging-7CEFB9 via requires_predicate.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aedbf6c479b461c3447355f110955dbd5f0b6675e7ed71a33beb93a8db07b5a6
logic_claims:
  - CLAIM-3F9DB0AE7FC227B0
  - CLAIM-33C75F0D3C7CEFB9
type: req
---

All entity and relationship mutations in the KB are recorded in a persistent audit log (`audit.log`) in the branch directory.
Each entry includes a timestamp, the operation type, and the affected entity data, providing a traceable history of changes.
