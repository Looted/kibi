---
id: SCEN-opencode-bootstrap-nudge
title: OpenCode Bootstrap Nudge Guidance
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-bootstrap-nudge.md
priority: must
tags:
  - opencode
  - bootstrap
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

## Scenario: Bootstrap Nudge

**Given** a repository declares Kibi intent but is not fully initialized
**When** the plugin evaluates workspace health
**Then** it must nudge the agent toward `/init-kibi`
**And** it must ask for operator help when external setup is required.
