---
id: TEST-vscode-kibi-briefing-v2
title: "VS Code Kibi Briefings v2 Verification"
status: pending
created_at: 2026-04-29T00:00:00Z
updated_at: 2026-04-29T00:00:00Z
source: documentation/tests/TEST-vscode-kibi-briefing-v2.md
priority: must
tags:
  - test
  - vscode
  - briefing
  - auto-open
links:
  - type: validates
    target: SCEN-vscode-kibi-briefing-v2
---

Verification plan for the VS Code render-first auto-open briefing system:

1.  **Auto-Open Test**: Verify that when `briefs.channels.vscode: true` in `.kb/config.json`, unread briefs automatically open in a new editor tab without notification click-gating.

2.  **Unread Filter Test**: Verify that only unread briefs trigger auto-open, preventing repeated document opening for the same brief.

3.  **Content Rendering Test**: Verify that the opened document correctly renders the `promptBlock` and summary from the brief JSON.

4.  **Channel Suppression Test**: Verify that when `briefs.channels.vscode: false`, no automatic document opening occurs.

5.  **Manual Command Test**: Verify that `kibi.showLatestBrief` (VS Code) and `/brief-kibi` (OpenCode) correctly display the brief even when auto-open is disabled.

6.  **Silent Failure Test**: Verify that corrupted brief files or missing KB initialization do not trigger error notifications or crashes in VS Code.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/vscode/tests/activation/briefs.test.ts` | Activation, gating, and auto-open trigger logic |
| `packages/vscode/tests/briefDocumentProvider.test.ts` | Document rendering and content extraction logic |
