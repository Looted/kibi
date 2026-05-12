---
id: SCEN-opencode-kibi-briefing-v6
title: "OpenCode Kibi Briefing v6: Schema-2.0 & Session-Delta Scenarios"
status: active
created_at: 2026-05-06T04:35:00Z
updated_at: 2026-05-06T04:35:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v6.md
tags:
  - scenario
  - opencode
  - briefing
  - schema-2.0
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v6
---

**Scenario: Session-Delta Reconciliation — Accurate lifecycle tracking**

**GIVEN** an OpenCode session started with a clean KB snapshot
**WHEN** the agent adds 2 requirements, modifies 1 fact, and deletes 1 test
**THEN** the briefing `counts` must show `entitiesAdded: 2`, `entitiesModified: 1`, `entitiesRemoved: 1`
**AND** the `changes.entities` object must contain the corresponding IDs in `added`, `modified`, and `removed` arrays
**AND** `schemaVersion` must be "2.0"

**Scenario: Cited-First Narrative — Prioritizing explicit tool impact**

**GIVEN** the agent explicitly upserted `REQ-001` using a tool
**AND** the system detected an implicit side-effect in `FACT-002` via audit
**WHEN** the briefing narrative is generated
**THEN** the `changeNarrative` array must list the change to `REQ-001` before `FACT-002`

**Scenario: Relationship Change Tracking — Link delta visibility**

**GIVEN** a new relationship is created between a symbol and a requirement
**WHEN** the briefing is generated
**THEN** `counts.relationshipsChanged` must reflect the change
**AND** `changes.relationships.changed` must contain the relationship details

**Scenario: Schema Migration — v2.0 exclusive write**

**GIVEN** the system is in a transition state
**WHEN** a new briefing is persisted
**THEN** it must follow the Schema-2.0 structure
**AND** legacy fields like `requirementsAdded` must NOT be present
**Scenario: Route-Based Auto-Open — Proactive TUI delivery**

**GIVEN** the plugin is active in an OpenCode session
**AND** a new briefing is generated for a risky edit
**WHEN** the briefing is marked as unread
**THEN** the plugin must trigger the `kibi.brief` route in the TUI automatically

**Scenario: Manual Briefing Open — User-initiated retrieval**

**GIVEN** a briefing was previously generated
**WHEN** the user executes the `kibi.open_latest_brief` command
**THEN** the TUI must navigate to the `kibi.brief` route and display the content

**Scenario: In-Place Refresh — Updating content without flicker**

**GIVEN** the user is currently viewing the `kibi.brief` route
**WHEN** a newer briefing becomes available during the session
**THEN** the TUI must refresh the content in-place without re-navigating the route
