---
id: TEST-remove-briefs-v1
title: "Briefing removal verification plan"
status: pending
created_at: 2026-05-28T00:00:00Z
updated_at: 2026-05-28T00:00:00Z
source: documentation/tests/TEST-remove-briefs-v1.md
priority: must
tags:
  - removal
  - briefing
  - mcp
  - opencode
  - vscode
links:
  - type: validates
    target: SCEN-remove-briefs-v1
---

Verification plan for the briefing removal requirement:

1. Assert `kb_briefing_generate` and `/brief-kibi` are absent from MCP tool and prompt lists.
2. Assert OpenCode no longer emits briefing prompt blocks, idle brief generation, persisted brief routes, or TUI brief commands.
3. Assert VS Code no longer contributes `kibi.showLatestBrief`, `kibi-brief` documents, brief watchers, or brief notifications.
4. Assert shared config/docs/tests describe the removed state and do not reintroduce active briefing behavior.
