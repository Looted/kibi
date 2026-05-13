---
id: REQ-opencode-smart-enforcement-v1
title: "OpenCode Smart Enforcement: Umbrella"
status: open
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-05-13T00:00:00Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - enforcement
links:
  - type: supersedes
    target: REQ-opencode-smart-enforcement-v1-old
  - type: specifies
    target: REQ-opencode-posture-detection
  - type: specifies
    target: REQ-opencode-risk-classification
  - type: specifies
    target: REQ-opencode-guidance-caching
---

The OpenCode Kibi Plugin implements smart, posture-aware enforcement to provide high-signal guidance while minimizing noise and token usage.

When briefing guidance is sanctioned for risky edits, smart enforcement should point agents to `/brief-kibi` and the public MCP briefing workflow through `kb_briefing_generate`.

This requirement is an umbrella doc for the following granular behaviors:
1. Posture-Aware Enforcement (REQ-opencode-posture-detection)
2. Risk Classification (REQ-opencode-risk-classification)
3. Guidance Caching Policy (REQ-opencode-guidance-caching)

Smart enforcement ensures that guidance is contextual, non-blocking, and adheres to token budget constraints.
