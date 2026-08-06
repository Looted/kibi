---
id: REQ-opencode-kibi-plugin-v1
title: "OpenCode Kibi Plugin v1: Umbrella"
status: open
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-05-13T00:00:00Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - plugin
links:
  - type: specified_by
    target: SCEN-opencode-kibi-plugin-v1-coverage
  - REQ-opencode-guidance-injection
  - REQ-opencode-background-sync
  - REQ-opencode-sync-feedback
  - REQ-opencode-bootstrap-nudge
  - REQ-opencode-briefing-command
---

The OpenCode Kibi Plugin v1 provides Kibi context and synchronization within the OpenCode environment.

For repo bootstrap, agent-facing guidance must prefer the sanctioned `/init-kibi` slash command before asking an operator to perform setup outside OpenCode.

When risky work needs start-task context, the plugin may guide agents toward `/brief-kibi` and the public MCP briefing surface via `kb_briefing_generate`.

This requirement is an umbrella doc for the following granular behaviors:
1. Prompt Guidance Injection (REQ-opencode-guidance-injection)
2. Debounced Background Sync (REQ-opencode-background-sync)
3. Sync Status Feedback (REQ-opencode-sync-feedback)
4. Initialization Bootstrap Nudge (REQ-opencode-bootstrap-nudge)
5. Briefing Command Integration (REQ-opencode-briefing-command)

Detailed specifications for each behavior are found in their respective granular requirement documents.
