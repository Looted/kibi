---
id: REQ-mcp-kb-freshness
title: MCP auto-refreshes KB attachment on same-branch external replacement
status: open
created_at: 2026-06-08T10:00:00Z
updated_at: 2026-06-08T10:00:00Z
source: documentation/requirements/REQ-mcp-kb-freshness.md
priority: must
tags:
  - mcp
  - branch
  - freshness
  - prolog
links:
  - type: specified_by
    target: SCEN-mcp-kb-freshness-coverage
  - ADR-021
  - SCEN-001
  - REQ-core-prolog-process-management
  - REQ-core-persistence
---

MCP must detect when the attached branch KB snapshot has been replaced externally (for example, by `kibi sync --rebuild`) while the MCP session continues running, and must refresh attachment state before serving queries or mutations.

The attached KB stamp is based on branch KB filesystem metadata (`packages/mcp/src/server/kb-freshness.ts`) so same-branch replacements are detected without blocking normal branch-switch semantics.

When mismatch is detected, MCP must attempt deterministic refresh, retry once if the stamp changed between pre-attach and post-attach detection, and fail closed with `KbRefreshError` when reconciliation cannot be completed.
