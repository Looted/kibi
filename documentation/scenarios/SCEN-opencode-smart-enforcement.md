---
id: SCEN-opencode-smart-enforcement
title: "OpenCode Smart Enforcement: Policy"
type: scenario
status: active
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-smart-enforcement.md
priority: must
tags:
  - enforcement
  - opencode
  - policy
links:
  - type: verified_by
    target: TEST-opencode-smart-enforcement
  - type: relates_to
    target: SCEN-opencode-posture-detection
  - type: relates_to
    target: SCEN-opencode-risk-classification
---

## Scenario: Smart Enforcement Policy

This scenario doc describes the high-level policy and combined behaviors for smart enforcement.

### Degraded Mode Handling
**Given** a repository with a corrupted `.kb/config.json`
**When** the plugin attempts to detect posture
**Then** it must fail gracefully, preserving the underlying posture decision
**And** apply `maintenance_degraded` as an overlay.

### Targeted Validation Routing
**Given** the posture is `root_active` and targeted checks are enabled
**When** an agent edits a code file classified as `traceability_candidate`
**Then** the plugin must schedule a sync with reason `smart-enforcement.traceability` and rule `symbol-traceability`.

### Briefing Guidance Routing
**Given** smart enforcement classifies an edit as risky and briefing guidance is allowed
**When** the plugin emits a start-task cue
**Then** it may mention `/brief-kibi` and the public MCP briefing workflow `kb_briefing_generate`.
