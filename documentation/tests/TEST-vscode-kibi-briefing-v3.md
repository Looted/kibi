---
id: TEST-vscode-kibi-briefing-v3
title: "VS Code Kibi Briefings v3 Verification"
status: pending
created_at: 2026-04-30T12:00:00Z
updated_at: 2026-04-30T12:00:00Z
source: documentation/tests/TEST-vscode-kibi-briefing-v3.md
priority: must
tags:
  - test
  - vscode
  - briefing
  - manual-open
links:
  - type: validates
    target: SCEN-vscode-kibi-briefing-v3
---

Verification plan for the VS Code popup-first and manual-open briefing system:

1.  **Notification Trigger Test**: Verify that a popup notification appears when a new unread brief is available and the VS Code channel is enabled.
2.  **Actionable Notification Test**: Verify that clicking the "View Brief" action in the notification opens the correct briefing document.
3.  **No Auto-Open Regression Test**: Verify that unread briefs do NOT automatically open editor tabs without user interaction.
4.  **Channel Suppression Test**: Verify that no notifications or documents open when `briefs.channels.vscode: false`.
5.  **Manual Command Test**: Verify that `kibi.showLatestBrief` remains functional and opens the latest brief even if the notification was dismissed.
6.  **Silent Failure Test**: Verify that failures in notification display or document opening do not cause VS Code to crash or show unhandled errors.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/vscode/tests/activation/briefs.test.ts` | Notification trigger and gating logic |
| `packages/vscode/tests/commands/showLatestBrief.test.ts` | Command execution and document display |
