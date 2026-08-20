---
id: REQ-kibi-operation-interface-parity
title: Kibi public operation surface keeps MCP and CLI in parity
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-15T08:05:00.000Z
source: documentation/requirements/REQ-kibi-operation-interface-parity.md
priority: must
owner: platform-team
tags:
  - mcp
  - cli
  - parity
  - policy
links:
  - type: relates_to
    target: ADR-022
  - type: specified_by
    target: SCEN-kibi-operation-interface-parity
  - type: verified_by
    target: TEST-kibi-operation-interface-parity
type: req
semantic_text: The public operation surface stays aligned across MCP and the trusted project-local CLI. Both peers expose the same versioned operation catalog and structured contracts; hosts select the visible approved surface by capability rather than by a fixed preference.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 104f82a5238ea2828e02ec3ad36edd4b87886b6c6e273e440e3fd091b6ced73e
semantic_inventory:
  - claim_key: CLAIM-6FBA0C2BF567A004
    claim_text: The public operation surface stays aligned across MCP and the trusted project-local CLI
    role: descriptive
    status: missing
    span:
      start: 0
      end: 87
  - claim_key: CLAIM-ED10AD9BEABEC297
    claim_text: Both peers expose the same versioned operation catalog and structured contracts
    role: descriptive
    status: missing
    span:
      start: 89
      end: 168
  - claim_key: CLAIM-9755267B4BCFF56F
    claim_text: hosts select the visible approved surface by capability rather than by a fixed preference
    role: descriptive
    status: missing
    span:
      start: 170
      end: 259
logic_claims:
  - CLAIM-6FBA0C2BF567A004
  - CLAIM-ED10AD9BEABEC297
  - CLAIM-9755267B4BCFF56F
semantic_clauses:
  - The public operation surface stays aligned across MCP and the trusted project-local CLI
  - Both peers expose the same versioned operation catalog and structured contracts
  - hosts select the visible approved surface by capability rather than by a fixed preference
---
The public operation surface stays aligned across MCP and the trusted project-local CLI. Both peers expose the same versioned operation catalog and structured contracts; hosts select the visible approved surface by capability rather than by a fixed preference.
