---
title: Claude Code host converts streams into scorer evidence, isolates the target and keeps the broker alive across client responses
status: passing
priority: should
tags:
  - skillopt
  - claude-code
  - integration
verification_scope: integration
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-05: continue PR 331 on another agent host Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-05T21:21:03.650Z'
id: TEST-skillopt-claude-code-host
type: test
---

## Context
Target cells can run on the Claude Code CLI as well as Codex. Its stream output is converted to the Codex format, so scoring and trust scans stay unchanged. The same change fixed a broker bug: it treated a client's response as a pending request, and that killed the broker mid-episode. Source: commit "run target cells on the Claude Code CLI".
