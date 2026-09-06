---
id: REQ-opencode-smart-enforcement-v1
title: 'OpenCode Smart Enforcement: Umbrella'
status: open
created_at: 2026-04-03T00:00:00.000Z
updated_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - enforcement
links:
  - type: specified_by
    target: SCEN-opencode-smart-enforcement-v1-coverage
  - REQ-opencode-posture-detection
  - REQ-opencode-risk-classification
  - REQ-opencode-guidance-caching
semantic_text: The OpenCode Kibi Plugin implements smart, posture-aware enforcement to provide high-signal guidance while minimizing noise and token usage.\n\nWhen briefing guidance is sanctioned for risky edits, smart enforcement should point agents to `/brief-kibi` and the public MCP briefing workflow through `kb_briefing_generate`.\n\nThis requirement is an umbrella doc for the following granular behaviors:\nPosture-Aware Enforcement (REQ-opencode-posture-detection)\nRisk Classification (REQ-opencode-risk-classification)\nGuidance Caching Policy (REQ-opencode-guidance-caching)\n\nSmart enforcement ensures that guidance is contextual, non-blocking, and adheres to token budget constraints.
logic_claims:
  - CLAIM-C0D9D30612CDB6DD
semantic_clauses:
  - The OpenCode Kibi Plugin implements smart, posture-aware enforcement to provide high-signal guidance while minimizing noise and token usage.\n\nWhen briefing guidance is sanctioned for risky edits, smart enforcement should point agents to `/brief-kibi` and the public MCP briefing workflow through `kb_briefing_generate`.\n\nThis requirement is an umbrella doc for the following granular behaviors:\nPosture-Aware Enforcement (REQ-opencode-posture-detection)\nRisk Classification (REQ-opencode-risk-classification)\nGuidance Caching Policy (REQ-opencode-guidance-caching)\n\nSmart enforcement ensures that guidance is contextual, non-blocking, and adheres to token budget constraints
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ce8de35aa22e62fe4cd7e7b897c0c67ebd5140cf1852105473d1d9cdd1695de3
semantic_inventory:
  - claim_key: CLAIM-C0D9D30612CDB6DD
    claim_text: The OpenCode Kibi Plugin implements smart, posture-aware enforcement to provide high-signal guidance while minimizing noise and token usage.\n\nWhen briefing guidance is sanctioned for risky edits, smart enforcement should point agents to `/brief-kibi` and the public MCP briefing workflow through `kb_briefing_generate`.\n\nThis requirement is an umbrella doc for the following granular behaviors:\nPosture-Aware Enforcement (REQ-opencode-posture-detection)\nRisk Classification (REQ-opencode-risk-classification)\nGuidance Caching Policy (REQ-opencode-guidance-caching)\n\nSmart enforcement ensures that guidance is contextual, non-blocking, and adheres to token budget constraints
    role: normative
    status: modeled
    span:
      start: 0
      end: 683
type: req
---

The OpenCode Kibi Plugin implements smart, posture-aware enforcement to provide high-signal guidance while minimizing noise and token usage.

When briefing guidance is sanctioned for risky edits, smart enforcement should point agents to `/brief-kibi` and the public MCP briefing workflow through `kb_briefing_generate`.

This requirement is an umbrella doc for the following granular behaviors:
1. Posture-Aware Enforcement (REQ-opencode-posture-detection)
2. Risk Classification (REQ-opencode-risk-classification)
3. Guidance Caching Policy (REQ-opencode-guidance-caching)

Smart enforcement ensures that guidance is contextual, non-blocking, and adheres to token budget constraints.
