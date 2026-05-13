---
id: SCEN-opencode-guidance-injection
title: OpenCode Prompt Guidance Injection
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-guidance-injection.md
priority: must
tags:
  - enforcement
  - opencode
  - guidance
links:
  - type: specifies
    target: REQ-opencode-guidance-injection
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

## Scenario: Prompt Guidance Injection

The plugin must inject context-aware Kibi guidance into the session flow.

### Guidance Injection
**Given** an OpenCode session is active
**When** the user or agent makes a "risky" edit (e.g., code without traceability)
**Then** the plugin must inject a contextual guidance block into the prompt.

### Token Budget Compliance
**Given** the plugin is injecting guidance
**When** multiple guidance candidates are available
**Then** it must combine them into a single block
**And** truncate to a maximum of 5 bullet points or 120 words.
