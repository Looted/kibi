---
id: REQ-cli-staged-impact-enforcement
title: CLI staged check enforces Kibi impact evidence for behavior edits
status: open
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/src/traceability/staged-diagnostics.ts
priority: must
tags:
  - cli
  - check
  - traceability
links:
  - type: specified_by
    target: SCEN-cli-staged-impact-enforcement
  - type: verified_by
    target: TEST-cli-staged-impact-enforcement
semantic_text: The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh.
logic_claims:
  - CLAIM-91A5F8025E089BCC
semantic_clauses:
  - The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f7370ae0ddcda1eb8f126ec719a36a117b997a432b40b8664dc684909c53501b
semantic_inventory:
  - claim_key: CLAIM-91A5F8025E089BCC
    claim_text: The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh
    role: exception
    status: modeled
    span:
      start: 0
      end: 153
type: req
---

The staged check must block behavior-changing source edits unless the staged change set includes Kibi impact evidence or a fresh symbols manifest refresh.
