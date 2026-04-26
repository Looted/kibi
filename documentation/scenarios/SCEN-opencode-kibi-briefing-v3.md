---
id: SCEN-opencode-kibi-briefing-v3
title: "OpenCode Kibi Briefing v3: Session Reconciliation and Cache Management"
status: active
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v3.md
tags:
  - scenario
  - opencode
  - briefing
  - reconcile
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v3
---
id: SCEN-opencode-kibi-briefing-v3
title: "OpenCode Kibi Briefing v3: Session Reconciliation and Cache Management"
status: active
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v3.md
tags:
  - scenario
  - opencode
  - briefing
  - reconcile
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v3

**Scenario: Config-Governed Delivery — Brief gating by channel**

**GIVEN** a shared config in `.kb/config.json` with `briefs.enabled: true`
**AND** `briefs.channels.tui: true`
**WHEN** the idle delivery worker completes a briefing generation
**THEN** it must respect `briefs.enabled` gate before delivery
**AND** it must respect `briefs.channels.tui` for TUI channel delivery
**AND** when `ux.briefs.autoSubmit` is `true` (default), TUI delivery proceeds automatically

**Scenario: AutoSubmit Override — Manual control preserved**

**GIVEN** a session where `ux.briefs.autoSubmit: false` in `.opencode/kibi.json`
**WHEN** the idle delivery worker completes a briefing generation
**THEN** it must NOT auto-submit to TUI channel
**AND** the agent must use `/brief-kibi` to retrieve the briefing manually
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v3
---

**Scenario: Session Reconcile — Multi-file edit triggers briefing update**

**GIVEN** an agent is in an active OpenCode session
**AND** the agent has uncommitted edits in `file_a.ts` and `file_b.ts`
**WHEN** the agent edits `file_c.ts`
**THEN** the plugin must calculate a context fingerprint based on the **current-session** state of all three files
**AND** it must invoke the `kb_briefing_generate` MCP tool with the session state for **reconcile**
**AND** if the briefing is updated, it must show the "Kibi brief ready" toast.

**Scenario: Branch Switch — Cache is cleared, reverted to baseline**

**GIVEN** a session with a cached Kibi briefing for `branch-a`
**WHEN** the user switches to `branch-b`
**THEN** the plugin must **revert-to-baseline** and clear all cached briefing artifacts
**AND** the next prompt transformation must NOT include stale guidance from `branch-a`.

**Scenario: Manual Force — /brief-kibi triggers fresh reconcile**

**GIVEN** a session where the agent suspects the auto-briefing is stale or missing context
**WHEN** the agent executes the `/brief-kibi` command
**THEN** the plugin must force a fresh **reconcile** with the background worker
**AND** the full briefing must be rendered even if a compact summary was previously shown.



