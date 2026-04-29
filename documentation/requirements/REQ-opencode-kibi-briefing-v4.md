---
id: REQ-opencode-kibi-briefing-v4
title: "OpenCode Kibi Briefing v4: Render-First Idle Delivery"
status: open
created_at: 2026-04-29T10:00:00Z
updated_at: 2026-04-29T10:00:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v4.md
priority: must
tags:
  - opencode
  - briefing
  - render-first
  - idle-delivery
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v3
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v4
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v4
---

The OpenCode Kibi Briefing system must transition to a render-first idle-delivery model. This contract replaces toast-gated delivery with persistent, render-ready envelopes that the TUI appends directly to the guidance block, ensuring briefings are immediately visible without user interaction or auto-submit configuration complexity.

1.  **Render-First Delivery**: When an idle briefing is generated, it must be persisted as a JSON envelope in `.kb/briefs/*_brief.json`. The OpenCode TUI must detect these envelopes and automatically append the `briefing.promptBlock` to the guidance section of the next prompt cycle.
2.  **Deprecation of Toast Gating**: The v3 "Toast Invariant" is deprecated. Delivery is no longer gated by or dependent on toast notifications. Briefings are delivered by rendering, not by notifying.
3.  **TUI Auto-Append**: The TUI must append the full briefing block to the prompt without requiring an explicit "submit" or "auto-submit" action from the user.
4.  **Envelope Persistence**: Briefings must be stored in the `.kb/briefs/` directory using the `IdleBriefEnvelope` schema. This directory serves as the canonical handoff point between the background producer and the TUI consumer.
5.  **Channel Gating**: Delivery remains gated by `.kb/config.json` settings:
    - `briefs.enabled`: Global kill-switch for all briefing generation.
    - `briefs.channels.tui`: Specifically enables/disables the render-first path in the TUI.
    - `briefs.channels.vscode`: Enables/disables delivery to the VS Code channel.
6.  **Config Deprecation**: The following configuration keys are deprecated and ignored in v4:
    - `briefs.tui.toast` (replaced by render-first)
    - `briefs.tui.appendPrompt` (now mandatory/default behavior)
    - `ux.briefs.autoSubmit` (now mandatory/default behavior)
7.  **Manual Retrieval Path**: The `/brief-kibi` command must be retained as a manual retrieval path for agents to force a fresh briefing or recover context if the idle delivery is skipped.
8.  **MCP-Only Generation**: All briefing generation must continue to use the `kb_briefing_generate` MCP tool.
9.  **Baseline Integrity**: The system must clear the `.kb/briefs/` directory and reset to baseline on branch checkout or session termination.
