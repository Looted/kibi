---
title: Claude hooks log reads, edits, and Kibi calls in session order when opted in
status: active
priority: should
tags:
  - claude
  - telemetry
  - hooks
id: SCEN-claude-hook-usage-telemetry
type: scenario
---
## Given
A Kibi workspace and a Claude Code session with the kibi-claude hooks installed.

## When
The operator sets KIBI_DIAGNOSTIC_MODE=1, and the agent searches with Grep, reads a requirement-linked source file, edits it, calls kb_search, and edits it again.

## Then
- .kb/usage.log gains one row per call, each tagged interface "hook" and carrying the session id.
- The first read row records that a requirement snippet was shown; a repeated read is recorded as silent.
- Rows before the kb_search call record kb_used_before false; the edit after it records true.
- Without KIBI_DIAGNOSTIC_MODE, no row is written and hook output is unchanged.
- Telemetry acceptance parsing ignores the hook rows.
