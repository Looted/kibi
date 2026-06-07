---
id: REQ-vscode-kibi-briefing-v1
title: "VS Code Kibi Briefing v1: Channel-Gated Brief Notifications"
status: superseded
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v1.md
priority: must
tags:
  - vscode
  - briefing
  - notifications
  - channel-gating
links:
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v1
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v1
---

The VS Code Kibi extension must support brief notifications gated by shared config to provide contextual guidance while respecting project-level policy.

1.  **Channel Gating**: Brief notifications in VS Code must respect the shared `briefs.channels.vscode` flag in `.kb/config.json`. When disabled, no automatic brief notifications appear.

2.  **Shared Policy**: The brief system uses `.kb/config.json` as the source of truth for channel enablement:
    - `briefs.enabled`: Master switch for all brief functionality
    - `briefs.channels.vscode`: VS Code channel toggle
    - `briefs.channels.tui`: OpenCode TUI channel toggle

3.  **Manual Access**: When VS Code channel is disabled or notifications are suppressed, users can still retrieve briefs manually via the `/brief-kibi` slash command in OpenCode.

4.  **Notification Behavior**: When enabled, brief notifications appear as toast/notification in the VS Code UI with brief summary content.

5.  **Graceful Degradation**: If brief generation fails or KB is uninitialized, the VS Code extension must not crash; it simply skips notification delivery.
