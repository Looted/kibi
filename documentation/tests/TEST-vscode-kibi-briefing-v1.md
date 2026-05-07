---
id: TEST-vscode-kibi-briefing-v1
title: "VS Code Kibi Briefings v1 Verification"
status: pending
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
source: documentation/tests/TEST-vscode-kibi-briefing-v1.md
priority: must
tags:
  - test
  - vscode
  - briefing
  - channel-gating
links:
  - type: validates
    target: SCEN-vscode-kibi-briefing-v1
---

Verification plan for the VS Code channel-gated briefing system:

1.  **VS Code Channel Enabled Test**: Verify that when `briefs.channels.vscode: true` in `.kb/config.json`, brief notifications appear in VS Code.

2.  **VS Code Channel Disabled Test**: Verify that when `briefs.channels.vscode: false`, no automatic notifications appear in VS Code.

3.  **Master Switch Test**: Verify that when `briefs.enabled: false`, all channels are disabled regardless of individual channel settings.

4.  **Manual Retrieval Test**: Verify that `/brief-kibi` works regardless of VS Code channel setting.

5.  **Graceful Degradation Test**: Verify that VS Code extension handles KB uninitialization or brief generation failures without crashing.

6.  **Config Change Reactivity Test**: Verify that changing `.kb/config.json` is reflected in subsequent brief delivery decisions.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/vscode/tests/activation/briefs.test.ts` | Brief activation and gating logic |
| `packages/vscode/tests/briefs.test.ts` | Brief notification delivery behavior |
