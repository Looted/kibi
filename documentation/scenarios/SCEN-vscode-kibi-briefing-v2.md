---
id: SCEN-vscode-kibi-briefing-v2
title: "VS Code Kibi Briefing v2: Auto-Open Scenarios"
status: closed
created_at: 2026-04-29T00:00:00Z
updated_at: 2026-04-29T00:00:00Z
source: documentation/scenarios/SCEN-vscode-kibi-briefing-v2.md
tags:
  - scenario
  - vscode
  - briefing
  - auto-open
links:
  - type: relates_to
    target: REQ-vscode-kibi-briefing-v2
---

**Scenario: VS Code Channel Enabled — New brief auto-opens**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.enabled: true`
**AND** `briefs.channels.vscode: true`
**WHEN** the VS Code extension detects a new unread brief is available
**THEN** it must automatically open the brief document in a VS Code editor tab
**AND** the document must display the full `promptBlock` content

**Scenario: VS Code Channel Disabled — No auto-open**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.channels.vscode: false`
**WHEN** the VS Code extension detects a new unread brief is available
**THEN** it must NOT automatically open any document
**AND** it must NOT display a notification click-gate
**AND** the brief remains available for manual retrieval

**Scenario: Manual Retrieval via Command Palette**

**GIVEN** a workspace where a brief has been generated
**WHEN** the user executes the `kibi.showLatestBrief` command
**THEN** the latest available brief must be opened in a VS Code editor tab
**AND** this must work regardless of the `briefs.channels.vscode` setting

**Scenario: Master Switch Off — All briefing behavior suppressed**

**GIVEN** a workspace with `.kb/config.json` containing `briefs.enabled: false`
**WHEN** a new brief is generated
**THEN** the VS Code extension must perform no automatic actions
**AND** auto-open behavior is completely disabled

**Scenario: Graceful Failure on Malformed Brief**

**GIVEN** a situation where a brief file is corrupted or unreadable
**WHEN** the VS Code extension attempts to auto-open the brief
**THEN** it must fail silently without displaying error popups or crashing
