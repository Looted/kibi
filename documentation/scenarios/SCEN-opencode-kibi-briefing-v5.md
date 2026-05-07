---
id: SCEN-opencode-kibi-briefing-v5
title: "OpenCode Kibi Briefing v5: Session-Local & Dedupe Scenarios"
status: active
created_at: 2026-04-30T12:00:00Z
updated_at: 2026-04-30T12:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v5.md
tags:
  - scenario
  - opencode
  - briefing
  - session-local
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v5
---

**Scenario: Session-Local Baseline — Historical unread briefs ignored**

**GIVEN** a branch with several unread briefs from a previous session
**WHEN** a new OpenCode session starts
**THEN** the system must NOT automatically replay the historical backlog
**AND** the first briefing generated in the new session should only reflect changes since the session start

**Scenario: Semantic Dedupe — Identical content suppressed**

**GIVEN** a briefing has already been delivered in the current session
**WHEN** a new briefing is generated with normalized content matching the previous one
**THEN** the delivery must be suppressed
**AND** no duplicate information should be appended to the prompt

**Scenario: Multi-File Fingerprinting — Briefing stability across files**

**GIVEN** multiple files are edited in the current session
**WHEN** the briefing is generated
**THEN** it must reflect the combined fingerprint of all dirty files
**AND** the briefing remains stable as the agent moves between these files

**Scenario: Render-First TUI Delivery — Replay preserved**

**GIVEN** an unread briefing envelope generated during the current session
**WHEN** a `system.transform` cycle occurs
**THEN** the briefing must be appended to the prompt guidance
**AND** marked as read upon successful delivery
