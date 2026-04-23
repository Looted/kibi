---
id: TEST-opencode-kibi-briefing-v2
title: "OpenCode Kibi Briefings v2 Verification"
status: pending
created_at: 2026-04-23T00:00:00Z
updated_at: 2026-04-23T14:52:50Z
source: documentation/tests/TEST-opencode-kibi-briefing-v2.md
priority: must
tags:
  - test
  - opencode
  - briefing
  - auto-show
links:
  - type: validates
    target: SCEN-opencode-kibi-briefing-v2
  - type: relates_to
    target: TEST-opencode-kibi-briefing-v1
---

Automated and manual verification for the OpenCode Kibi Briefings v2 contract:

1. **Auto-Show Workflow Test**: Verify that risky code-edit contexts trigger a background fetch via `file.edited` and subsequent prompt injection without manual intervention.
2. **Deduplication Test**: Verify that identical context fingerprints within the TTL do not trigger redundant briefing fetches or duplicate prompt blocks.
3. **Toast Content Test**: Verify that toast notifications match the required copy for `ready`, `tldr`, and `unavailable` states exactly.
4. **Header and Fallback Test**: Verify that injected briefings use the required emoji header (`🧠 **Kibi briefing available**`) and that empty prompt blocks correctly fallback to TLdr summaries.
5. **Cue Suppression Test**: Verify that the manual `/brief-kibi` discovery cue is omitted ONLY when an authoritative prompt block is already rendered for the same fingerprint.
6. **Transform Text-Only Guarantee**: Verify that `experimental.chat.system.transform` remains a text-only hook and does not attempt live tool execution or rich object injection.
7. **Manual Path Preservation**: Verify that `/brief-kibi` remains functional even after an auto-briefing has been displayed.
8. **Surface Policy Compliance**: Verify that v2 documentation files are included in the `agent-surface-policy.test.ts` coverage if applicable, and that they do not contain forbidden CLI commands.
