---
id: SCEN-vscode-kibi-briefing-v3
title: "VS Code Kibi Briefing v3: Popup & Manual-Open Scenarios"
status: active
created_at: 2026-04-30T12:00:00Z
updated_at: 2026-04-30T12:00:00Z
source: documentation/scenarios/SCEN-vscode-kibi-briefing-v3.md
tags:
  - scenario
  - vscode
  - briefing
  - manual-open
links:
  - type: relates_to
    target: REQ-vscode-kibi-briefing-v3
---

**Scenario: New brief triggers notification — user clicks "View Brief"**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.enabled: true`
**AND** `briefs.channels.vscode: true`
**WHEN** the VS Code extension detects a new unread brief
**THEN** it must display a popup notification with the text "New Kibi briefing available"
**AND** the notification must contain a "View Brief" action
**WHEN** the user clicks "View Brief"
**THEN** the briefing document must open in a new VS Code editor tab

**Scenario: New brief triggers notification — user ignores it**

**GIVEN** a new unread brief is detected
**WHEN** the notification appears
**AND** the user does NOT click "View Brief"
**THEN** NO editor tab should be automatically opened
**AND** the brief remains unread and available for manual retrieval

**Scenario: VS Code Channel Disabled — No notification**

**GIVEN** a workspace where `briefs.channels.vscode: false`
**WHEN** a new unread brief is detected
**THEN** NO notification must be displayed
**AND** NO document must be automatically opened

**Scenario: Manual Retrieval via Command Palette**

**GIVEN** an available brief
**WHEN** the user executes the `kibi.showLatestBrief` command
**THEN** the latest brief must open in a VS Code editor tab
**AND** this must work regardless of whether a notification was previously shown or dismissed
