---
id: SCEN-opencode-kibi-briefing-v4
title: "OpenCode Kibi Briefing v4: Render-First Delivery Scenarios"
status: active
created_at: 2026-04-29T10:00:00Z
updated_at: 2026-04-29T10:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v4.md
tags:
  - scenario
  - opencode
  - briefing
  - render-first
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v4
---

**Scenario: Render-First Delivery — Brief appended to prompt**

**GIVEN** an active OpenCode session with `briefs.enabled: true` and `briefs.channels.tui: true`
**AND** the background producer completes a briefing for the current session
**WHEN** the producer persists the `IdleBriefEnvelope` to `.kb/briefs/session_brief.json`
**THEN** the OpenCode TUI must detect the unread envelope
**AND** it must append the `briefing.promptBlock` to the system guidance in the next transform cycle
**AND** the briefing must be visible to the agent without any toast clicks or auto-submit configuration.

**Scenario: Channel Gating — Delivery suppressed by config**

**GIVEN** a shared config in `.kb/config.json` where `briefs.channels.tui: false`
**WHEN** the background producer persists an idle briefing envelope
**THEN** the OpenCode TUI must NOT append the briefing to the prompt guidance
**AND** the briefing remains available only via manual `/brief-kibi` command if requested.

**Scenario: Manual Retrieval — /brief-kibi force-renders context**

**GIVEN** a session where the idle delivery has not yet triggered or was suppressed
**WHEN** the agent executes the `/brief-kibi` command
**THEN** the plugin must invoke `kb_briefing_generate` immediately
**AND** it must render the full briefing block into the session regardless of the idle envelope state.

**Scenario: Branch Isolation — Stale briefs cleared**

**GIVEN** a session on `main` with a persisted briefing in `.kb/briefs/`
**WHEN** the user switches to feature branch `feat-x`
**THEN** the plugin must immediately clear all files in `.kb/briefs/`
**AND** it must NOT render the `main` briefing in the `feat-x` session.
