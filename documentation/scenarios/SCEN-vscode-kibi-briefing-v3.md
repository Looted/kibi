---
id: SCEN-vscode-kibi-briefing-v3
title: "VS Code Kibi Briefing v3: Deterministic Ordering & Schema-2.0 Scenarios"
status: closed
created_at: 2026-05-06T04:45:00Z
updated_at: 2026-05-06T04:45:00Z
source: documentation/scenarios/SCEN-vscode-kibi-briefing-v3.md
tags:
  - scenario
  - vscode
  - briefing
  - deterministic-ordering
links:
  - type: relates_to
    target: REQ-vscode-kibi-briefing-v3
---

**Scenario: Deterministic Latest Selection — Filename priority**

**GIVEN** three brief files in the `.kb/briefs/` directory:
  - `brief-20260506-040000.json` (mtime: newer)
  - `brief-20260506-041500.json` (mtime: older)
  - `brief-20260506-043000.json` (mtime: middle)
**WHEN** the extension selects the latest brief
**THEN** it must choose `brief-20260506-043000.json` based on lexicographical filename sorting
**AND** ignore the filesystem `mtime`

**Scenario: Schema-2.0 Rendering — Narrative and counts display**

**GIVEN** a brief following Schema-2.0 with a multi-line `changeNarrative`
**WHEN** the brief is opened in VS Code
**THEN** the narrative block must render the ordered array as a cohesive text block
**AND** the `counts` object (entitiesAdded, etc.) must be accurately reflected in the UI summary

**Scenario: Auto-Open Preservation — Session-local trigger**

**GIVEN** a new Schema-2.0 brief is generated in the current session
**WHEN** the VS Code extension detects the unread file
**THEN** it must automatically open the document tab (if channel enabled)
**AND** the selection of this unread file must be deterministic
