---
id: REQ-remove-briefs-v1
title: Remove Kibi briefing surfaces (fulfilled; archived)
status: closed
created_at: 2026-05-28T00:00:00.000Z
updated_at: 2026-05-28T00:00:00.000Z
source: documentation/requirements/REQ-remove-briefs-v1.md
priority: must
owner: platform-team
tags:
  - removal
  - briefing
  - mcp
  - opencode
  - vscode
  - historical-status:archived
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v6
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v3
  - type: supersedes
    target: REQ-mcp-kibi-briefing-v1
  - type: supersedes
    target: REQ-opencode-briefing-command
  - type: specified_by
    target: SCEN-remove-briefs-v1
  - type: verified_by
    target: TEST-remove-briefs-v1
semantic_text: Kibi must remove the active briefing product surface across MCP, OpenCode, VS Code, and shared CLI configuration while preserving the rest of the knowledge-base discovery, query, sync, and validation workflows.\n\nThe MCP server must no longer expose `kb_briefing_generate`, `/brief-kibi`, or mutation pending-marker behavior for `.kb/briefs`.\nThe OpenCode integration must no longer generate, consume, render, route, or prompt for Kibi briefing artifacts.\nThe VS Code extension must no longer watch, parse, render, command-open, or notify on Kibi briefing artifacts.\nShared config, docs, and tests must treat prior briefing requirements, scenarios, and verification plans as removed/superseded rather than active product behavior.
type: req
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as archived before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e0d5595b2ee41f92903311420c620db88af09a7a75137715ac30efb241c1205e
semantic_inventory:
  - claim_key: CLAIM-CC07119627B258DB
    claim_text: Kibi must remove the active briefing product surface across MCP, OpenCode, VS Code, and shared CLI configuration while preserving the rest of the knowledge-base discovery, query, sync, and validation workflows.\n\nThe MCP server must no longer expose `kb_briefing_generate`, `/brief-kibi`, or mutation pending-marker behavior for `.kb/briefs`.\nThe OpenCode integration must no longer generate, consume, render, route, or prompt for Kibi briefing artifacts.\nThe VS Code extension must no longer watch, parse, render, command-open, or notify on Kibi briefing artifacts.\nShared config, docs
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 590
    payload_hash: ccc0f5e1d5ab2a2693d2b9b3d70df35ac616595cb81f8619e440a4d46be4e7b1
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-88652EA2A55E0EDF
    claim_text: tests must treat prior briefing requirements, scenarios, and verification plans as removed/superseded rather than active product behavior
    role: normative
    status: ontology_gap
    span:
      start: 596
      end: 733
    payload_hash: ccc0f5e1d5ab2a2693d2b9b3d70df35ac616595cb81f8619e440a4d46be4e7b1
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-CC07119627B258DB
  - CLAIM-88652EA2A55E0EDF
---

Kibi must remove the active briefing product surface across MCP, OpenCode, VS Code, and shared CLI configuration while preserving the rest of the knowledge-base discovery, query, sync, and validation workflows.

1. The MCP server must no longer expose `kb_briefing_generate`, `/brief-kibi`, or mutation pending-marker behavior for `.kb/briefs`.
2. The OpenCode integration must no longer generate, consume, render, route, or prompt for Kibi briefing artifacts.
3. The VS Code extension must no longer watch, parse, render, command-open, or notify on Kibi briefing artifacts.
4. Shared config, docs, and tests must treat prior briefing requirements, scenarios, and verification plans as removed/superseded rather than active product behavior.
