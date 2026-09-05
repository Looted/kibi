---
id: REQ-mcp-kb-freshness
title: MCP auto-refreshes KB attachment on same-branch external replacement
status: open
created_at: 2026-06-08T10:00:00.000Z
updated_at: 2026-06-08T10:00:00.000Z
source: documentation/requirements/REQ-mcp-kb-freshness.md
priority: must
tags:
  - mcp
  - branch
  - freshness
  - prolog
links:
  - type: specified_by
    target: SCEN-mcp-kb-freshness
  - type: specified_by
    target: SCEN-mcp-kb-freshness-coverage
  - ADR-021
  - SCEN-001
  - REQ-core-prolog-process-management
  - REQ-core-persistence
semantic_text: MCP must detect when the attached branch KB snapshot has been replaced externally while the MCP session continues running. MCP must refresh attachment state before serving queries or mutations after a same-branch replacement. The attached KB stamp must be based on branch KB filesystem metadata so same-branch replacements are detected. MCP must not block normal branch-switch semantics while detecting same-branch replacements.
logic_claims:
  - CLAIM-6227CA584850B7C2
  - CLAIM-ECD1F71256D876D4
  - CLAIM-8BE167FD3F001381
  - CLAIM-1F6AF01B7B4AD519
semantic_clauses:
  - MCP must detect when the attached branch KB snapshot has been replaced externally while the MCP session continues running
  - MCP must refresh attachment state before serving queries or mutations after a same-branch replacement
  - The attached KB stamp must be based on branch KB filesystem metadata so same-branch replacements are detected
  - MCP must not block normal branch-switch semantics while detecting same-branch replacements
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f818278b34610ac1cda58d0556c4d046d7360c2d6c498c58d52bc03bcaeadd89
semantic_inventory:
  - claim_key: CLAIM-6227CA584850B7C2
    claim_text: MCP must detect when the attached branch KB snapshot has been replaced externally while the MCP session continues running
    role: normative
    status: modeled
    span:
      start: 0
      end: 121
  - claim_key: CLAIM-ECD1F71256D876D4
    claim_text: MCP must refresh attachment state before serving queries or mutations after a same-branch replacement
    role: normative
    status: modeled
    span:
      start: 123
      end: 224
  - claim_key: CLAIM-8BE167FD3F001381
    claim_text: The attached KB stamp must be based on branch KB filesystem metadata so same-branch replacements are detected
    role: normative
    status: modeled
    span:
      start: 226
      end: 335
  - claim_key: CLAIM-1F6AF01B7B4AD519
    claim_text: MCP must not block normal branch-switch semantics while detecting same-branch replacements
    role: normative
    status: modeled
    span:
      start: 337
      end: 427
type: req
---

MCP must detect when the attached branch KB snapshot has been replaced externally (for example, by `kibi sync --rebuild`) while the MCP session continues running, and must refresh attachment state before serving queries or mutations.

The attached KB stamp is based on branch KB filesystem metadata (`packages/mcp/src/server/kb-freshness.ts`) so same-branch replacements are detected without blocking normal branch-switch semantics.

When mismatch is detected, MCP must attempt deterministic refresh, retry once if the stamp changed between pre-attach and post-attach detection, and fail closed with `KbRefreshError` when reconciliation cannot be completed.
