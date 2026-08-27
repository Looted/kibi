---
id: SCEN-opencode-kibi-plugin-v1-coverage
title: OpenCode Kibi plugin exposes sanctioned context and synchronization guidance
type: scenario
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
source: documentation/scenarios/SCEN-opencode-kibi-plugin-v1-coverage.md
priority: must
links:
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1-coverage
---

Given an OpenCode session with the Kibi plugin enabled, when an agent needs bootstrap, briefing, or synchronization context, then the plugin presents only the sanctioned Kibi guidance and public surfaces.
