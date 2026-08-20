---
id: SCEN-opencode-bootstrap-nudge
title: OpenCode Bootstrap Nudge Guidance
type: scenario
status: active
created_at: 2026-05-13T00:00:00.000Z
source: documentation/scenarios/SCEN-opencode-bootstrap-nudge.md
priority: must
tags:
  - opencode
  - bootstrap
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---
When a repository needs initial Kibi inference, OpenCode reads bootstrap status and routes the agent to kibi-bootstrap. The planner returns any bounded context questions and an exact plan; approval and application use the public plan/apply contract, followed by a typed check.
