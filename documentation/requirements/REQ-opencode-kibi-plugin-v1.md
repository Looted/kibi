---
id: REQ-opencode-kibi-plugin-v1
title: "OpenCode Kibi Plugin v1: Prompt Guidance, Debounced Sync, Non-blocking UX"
status: open
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-03-13T00:00:00Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - plugin
  - traceability
links:
  - TEST-opencode-kibi-plugin-v1
  - ADR-016
---

The OpenCode Kibi Plugin v1 must:

1. Inject Kibi prompt guidance into the OpenCode session flow, surfacing relevant requirements and traceability context to the user and agents.
2. Run `kibi sync` in a debounced, non-blocking manner after relevant file edits, ensuring the KB stays up to date without blocking the user experience.
3. Surface structured logs and toasts for sync status and errors, but never block the main OpenCode workflow on sync failures.
4. Be configurable via OpenCode or plugin settings for debounce interval and sync behavior.

All plugin code symbols must reference this requirement (`REQ-opencode-kibi-plugin-v1`) to satisfy staged traceability. The implementation must not begin until this requirement is present in the KB.
