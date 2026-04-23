---
id: SCEN-opencode-kibi-briefing-v2
title: "OpenCode Kibi Briefing v2: Auto-Show and Fallback Behaviors"
status: draft
created_at: 2026-04-23T00:00:00Z
updated_at: 2026-04-23T00:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v2.md
tags:
  - scenario
  - opencode
  - briefing
  - auto-show
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v2
  - type: supersedes
    target: SCEN-opencode-kibi-briefing-v1
---

**Scenario: Ready state — brief auto-fetched, toast shown, prompt block rendered, cue suppressed**

**GIVEN** an OpenCode session is in an authoritative, non-degraded posture
**AND** the current work is a risky code-edit context (e.g., `behavior_candidate`)
**AND** the background worker successfully fetches a Kibi briefing for the current context fingerprint
**WHEN** the plugin processes the `file.edited` event
**THEN** it must show a toast: `"Kibi brief ready — summary added to guidance."`
**AND** it must inject a prompt block with the header `🧠 **Kibi briefing available**`
**AND** it must suppress the manual `/brief-kibi` discovery cue in subsequent prompt transformations for this context.

**Scenario: No briefing — no fake content, manual cue preserved**

**GIVEN** a risky edit context where no Kibi briefing can be generated (e.g., stale state or unsupported posture)
**WHEN** the background worker attempts an auto-fetch
**THEN** it must NOT inject speculative content into the prompt
**AND** it must show a toast: `"Kibi brief unavailable — keeping /brief-kibi manual path."`
**AND** the manual discovery cue for `/brief-kibi` must be preserved in prompt guidance.
37#RB|
38#BR|**Scenario: Verification via MCP tool — manual check of context fingerprint via `kb_briefing_generate`**
39#MS|
40#ZJ|**GIVEN** an agent is in an OpenCode session and receives a Kibi-briefing-enabled prompt
41#XZ|**WHEN** the agent needs to verify the current context fingerprint or force a briefing refresh
42#VS|**THEN** the agent must use the `kb_briefing_generate` MCP tool instead of any direct CLI commands.
43#ZP|**AND** the tool must return the current context fingerprint and any available briefing content.
44#TW|
45#NN|**Scenario: TLdr fallback — empty promptBlock but non-empty tldr, fallback block shown**

**Scenario: TLdr fallback — empty promptBlock but non-empty tldr, fallback block shown**

**GIVEN** an authoritative risky edit context where a full prompt block is too large or fails to render
**AND** a valid TLdr summary is available from the briefing artifact
**WHEN** the plugin processes the guidance injection
**THEN** it must show a toast: `"Kibi brief summary added — use /brief-kibi for full details."`
**AND** it must inject a compact fallback summary block
**AND** the manual discovery cue for `/brief-kibi` must be preserved to allow full discovery.
