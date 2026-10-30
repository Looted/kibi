---
title: The packed kibi-cursor hooks warn about a direct .kb edit and never block it
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:12:13.505Z'
id: SCEN-CASE-cursor-kibi-plugin-v1-BLOCKING-HOOK
type: scenario
---
Given the packed kibi-cursor hook runner and an agent about to write a file under .kb, which a blocking hook would stop, when the preToolUse hook runs, then it allows the write with the direct-edit warning, and the beforeSubmitPrompt hook for a prompt asking for that edit does not hold the prompt back; neither returns a deny.

This covers the value outside the set, a hook output that includes a kind other than reminder or warning. documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts "the packed hooks only warn: a direct .kb edit is allowed with a warning and a prompt is never held back" exercises it.
