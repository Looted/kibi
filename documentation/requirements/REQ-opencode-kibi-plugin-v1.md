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
  - type: supersedes
    target: REQ-opencode-kibi-plugin-v1-old
  - type: specifies
    target: REQ-opencode-guidance-injection
  - type: specifies
    target: REQ-opencode-background-sync
  - type: specifies
    target: REQ-opencode-sync-feedback
  - type: specifies
    target: REQ-opencode-bootstrap-nudge
  - type: specifies
    target: REQ-opencode-briefing-command
---

The OpenCode Kibi Plugin v1 provides Kibi context and synchronization within the OpenCode environment.

This requirement is an umbrella doc for the following granular behaviors:
1. Prompt Guidance Injection (REQ-opencode-guidance-injection)
2. Debounced Background Sync (REQ-opencode-background-sync)
3. Sync Status Feedback (REQ-opencode-sync-feedback)
4. Initialization Bootstrap Nudge (REQ-opencode-bootstrap-nudge)
5. Briefing Command Integration (REQ-opencode-briefing-command)

Detailed specifications for each behavior are found in their respective granular requirement documents.
