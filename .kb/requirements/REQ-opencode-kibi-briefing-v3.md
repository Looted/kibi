---
id: REQ-opencode-kibi-briefing-v3
title: "OpenCode Kibi Briefing v3: Reliable Session-Grounded Guidance"
status: superseded
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v3.md
priority: must
tags:
  - opencode
  - briefing
  - reliability
  - session-local
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v2
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v3
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v3
---

The OpenCode Kibi Briefing system must transition to a session-grounded reconcile model to ensure briefings remain accurate and reliable across complex multi-step agent workflows.

1.  **Session-Local Authority**: Briefings must be generated based on the **current-session** state, including dirty files and session history, ensuring guidance matches the agent's actual environment.
2.  **Reconcile Mechanism**: The plugin must reconcile the local session state with the KB snapshot. If the session state has diverged, the briefing must be regenerated or adjusted to maintain accuracy.
3.  **Multi-File Fingerprinting**: Briefing triggers and cache keys must use a fingerprint derived from all currently active/edited files in the session to prevent stale guidance when bouncing between related files.
4.  **Baseline Reset**: The briefing system must explicitly revert-to-baseline and clear all cached briefings on branch checkout or session termination.
5.  **Event Flow**:
    - `file.edited` continues to serve as a fast-path trigger for the reconcile cycle.
    - `system.transform` remains the primary injection point for guidance, leveraging the reconciled briefing state.
6.  **Manual Escape Hatch**: The `/brief-kibi` command must be preserved as the canonical manual refresh mechanism.
7.  **MCP Constraint**: All briefing generation must continue to use the `kb_briefing_generate` MCP tool. Direct use of `kibi` CLI commands (init, sync, check, etc.) by agents is strictly forbidden.
8.  **Toast Invariant**: Toast notification behavior from v2 must be preserved, but grounded in the new reconcile-ready state.
9.  **Config Split**: Brief policy is split across two locations:
    - Shared policy (`.kb/config.json`): `briefs.enabled`, `briefs.channels.vscode`, `briefs.channels.tui`, `briefs.tui.toast`, `briefs.tui.appendPrompt`
    - OpenCode-local (`.opencode/kibi.json`): `ux.briefs.autoSubmit` (default: `true`)
10. **Canonical Retrieval**: The `/brief-kibi` command remains the canonical manual refresh mechanism, unaffected by `autoSubmit` settings.
11. **MCP Constraint**: All briefing generation must continue to use the `kb_briefing_generate` MCP tool. Direct use of `kibi` CLI commands (init, sync, check, etc.) by agents is strictly forbidden.
