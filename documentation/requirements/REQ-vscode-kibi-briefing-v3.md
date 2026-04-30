---
id: REQ-vscode-kibi-briefing-v3
title: "VS Code Kibi Briefing v3: Popup-First & Manual-Only Contract"
status: open
created_at: 2026-04-30T12:00:00Z
updated_at: 2026-04-30T12:00:00Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v3.md
priority: must
tags:
  - vscode
  - briefing
  - popup-notification
  - manual-open
links:
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v2
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v3
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v3
---

The VS Code Kibi extension must transition from auto-opening briefing documents to a popup-notification and manual-open model. This ensures that briefings are visible but non-intrusive, allowing users to choose when to engage with new contextual guidance.

1.  **Popup Notifications**: When a new unread idle brief is detected and `briefs.channels.vscode` is enabled, the VS Code extension must display a non-modal popup notification (toast) instead of automatically opening the document.
    - The notification must include an actionable "View Brief" button.
    - Clicking "View Brief" must open the briefing document in a new editor tab.

2.  **No Auto-Open**: The extension must NOT automatically open the brief document without a manual user action (either clicking the notification button or executing a command).

3.  **Manual Retrieval**: Users must be able to retrieve and view briefings manually via:
    - The `kibi.showLatestBrief` command from the VS Code Command Palette.
    - The "View Brief" action in the popup notification.
    - The `/brief-kibi` command in OpenCode (if applicable in shared contexts).

4.  **Channel Gating**: Notification behavior must respect the shared configuration in `.kb/config.json`:
    - `briefs.enabled`: Global switch for all brief functionality.
    - `briefs.channels.vscode`: VS Code channel toggle. If false, all briefing notifications and auto-actions are suppressed.

5.  **Unread Filtering**: Notifications are only triggered for briefs marked as unread.

6.  **Graceful Degradation**: If the notification cannot be displayed or the manual open action fails, the extension must fail silently without impacting the VS Code host stability.
