---
id: REQ-vscode-kibi-briefing-v2
title: "VS Code Kibi Briefing v2: Render-First Auto-Open Contract"
status: superseded
created_at: 2026-04-29T00:00:00Z
updated_at: 2026-04-29T00:00:00Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v2.md
priority: must
tags:
  - vscode
  - briefing
  - auto-open
  - channel-gating
links:
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v1
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v2
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v2
---

The VS Code Kibi extension must support a render-first auto-open contract for idle briefings, providing immediate visibility of contextual guidance when unread briefs are detected.

1.  **Auto-Open Behavior**: When a new unread idle brief is detected and `briefs.channels.vscode` is enabled, the VS Code extension must automatically open the brief document in a new editor tab.
    - This behavior replaces the notification-first "View Brief" click requirement from v1.
    - Automatic opening is only triggered for unread briefs.

2.  **Briefing Content**: The rendered document must include the full briefing body (`briefing.promptBlock`) and summary.

3.  **Channel Gating**: Auto-open behavior must respect the shared configuration in `.kb/config.json`:
    - `briefs.enabled`: Master switch for all brief functionality.
    - `briefs.channels.vscode`: VS Code channel toggle. If false, automatic opening is suppressed.

4.  **Manual Retrieval**: Users must still be able to retrieve and view briefs manually via:
    - The `kibi.showLatestBrief` command (VS Code Command Palette).
    - The `/brief-kibi` slash command in OpenCode.

5.  **Graceful Degradation**: If brief generation fails, the KB is uninitialized, or the brief file is malformed, the extension must fail silently without crashing the VS Code host.
