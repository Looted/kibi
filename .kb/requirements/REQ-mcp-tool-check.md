---
id: REQ-mcp-tool-check
title: MCP kb_check tool
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/mcp/src/tools/check.ts
priority: must
owner: mcp-team
tags:
  - mcp
  - kibi
  - validation
links:
  - type: specified_by
    target: SCEN-mcp-tool-check-coverage
  - type: verified_by
    target: TEST-004
semantic_text: |-
  The `kb_check` MCP tool must:

  Execute Kibi validation rules against the current branch KB snapshot.
  Support filtering for specific rules (e.g., `must-priority-coverage`, `symbol-traceability`).
  Return a list of violations with clear descriptions and entity references.
  Support being called both before and after mutations to verify integrity.
logic_claims:
  - CLAIM-EC70D209FB360198
  - CLAIM-6A89B124517BBD4D
  - CLAIM-337C866279D9C286
  - CLAIM-EF09C880EE493EE7
semantic_clauses:
  - Execute Kibi validation rules against the current branch KB snapshot
  - Support filtering for specific rules (e.g., `must-priority-coverage`, `symbol-traceability`)
  - Return a list of violations with clear descriptions and entity references
  - Support being called both before and after mutations to verify integrity
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 42adad7bf57b5b8ad693561211fb363b1ddaa9625cd7fe11cd7f717e58e6cf02
semantic_inventory:
  - claim_key: CLAIM-EC70D209FB360198
    claim_text: Execute Kibi validation rules against the current branch KB snapshot
    role: descriptive
    status: modeled
    span:
      start: 31
      end: 99
  - claim_key: CLAIM-6A89B124517BBD4D
    claim_text: Support filtering for specific rules (e.g., `must-priority-coverage`, `symbol-traceability`)
    role: normative
    status: modeled
    span:
      start: 101
      end: 193
  - claim_key: CLAIM-337C866279D9C286
    claim_text: Return a list of violations with clear descriptions and entity references
    role: descriptive
    status: modeled
    span:
      start: 195
      end: 268
  - claim_key: CLAIM-EF09C880EE493EE7
    claim_text: Support being called both before and after mutations to verify integrity
    role: normative
    status: modeled
    span:
      start: 270
      end: 342
type: req
---

The `kb_check` MCP tool must:

1. Execute Kibi validation rules against the current branch KB snapshot.
2. Support filtering for specific rules (e.g., `must-priority-coverage`, `symbol-traceability`).
3. Return a list of violations with clear descriptions and entity references.
4. Support being called both before and after mutations to verify integrity.
