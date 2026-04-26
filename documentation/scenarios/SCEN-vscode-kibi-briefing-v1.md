---
id: SCEN-vscode-kibi-briefing-v1
title: "VS Code Kibi Briefing v1: Channel Gating and Manual Access"
status: active
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
source: documentation/scenarios/SCEN-vscode-kibi-briefing-v1.md
tags:
  - scenario
  - vscode
  - briefing
  - channel-gating
links:
  - type: relates_to
    target: REQ-vscode-kibi-briefing-v1
---
id: SCEN-vscode-kibi-briefing-v1
title: "VS Code Kibi Briefing v1: Channel Gating and Manual Access"
status: active
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
source: documentation/scenarios/SCEN-vscode-kibi-briefing-v1.md
tags:
  - scenario
  - vscode
  - briefing
  - channel-gating
links:
  - type: relates_to
    target: REQ-vscode-kibi-briefing-v1
---

**Scenario: VS Code Channel Enabled — Brief notifications appear**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.enabled: true`
**AND** `briefs.channels.vscode: true`
**WHEN** the VS Code extension detects a new brief is available
**THEN** it must display a brief notification in the VS Code UI
**AND** the notification must contain the brief summary content

**Scenario: VS Code Channel Disabled — No automatic notifications**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.channels.vscode: false`
**WHEN** the VS Code extension detects a new brief is available
**THEN** it must NOT display any automatic notification
**AND** the brief is still available for manual retrieval

**Scenario: Manual Escape Hatch — /brief-kibi works regardless of channel setting**

**GIVEN** a workspace where VS Code channel is disabled
**WHEN** the user executes `/brief-kibi` in OpenCode
**THEN** the full briefing must be retrieved and displayed
**AND** channel gating must not affect manual retrieval

**Scenario: Master Switch Off — All channels disabled**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.enabled: false`
**WHEN** any channel requests brief delivery
**THEN** no brief notifications appear in any channel
**AND** manual `/brief-kibi` still functions for explicit retrieval
