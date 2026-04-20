---
id: SCEN-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin Prompt Guidance and Background Sync
status: active
created_at: 2026-04-13T10:00:00Z
updated_at: 2026-04-20T00:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-plugin-v1.md
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

## Scenario: Prompt Guidance Injection

**Given** an OpenCode session is active
**When** the user or agent makes a "risky" edit (e.g., code without traceability)
**Then** the plugin must inject a contextual guidance block into the prompt.

## Scenario: Debounced Background Sync

**Given** the plugin is active and configured with a 1000ms debounce
**When** a file is saved
**Then** the plugin must wait 1000ms before triggering a background KB sync
**And** subsequent saves within the window must reset the timer.

## Scenario: Start-Task Briefing Cue

**Given** an OpenCode session is starting or an authoritative risky edit is detected
**When** the plugin decides a briefing cue fits within the smart-enforcement prompt budget
**Then** the guidance may mention `/brief-kibi` as a sanctioned slash command backed by `kb_briefing_generate`
**And** the cue must not imply that `/brief-kibi` replaces `/init-kibi` bootstrap guidance.
