---
title: Host hooks log Kibi lookups and requirement-linked edits when opted in, and acceptance reads them only for lookup before first edit
status: active
priority: should
tags:
  - claude
  - telemetry
  - hooks
  - acceptance
origin:
  kind: agent
  recorded_at: '2026-10-04T02:12:54.240Z'
id: SCEN-claude-hook-usage-telemetry-v2
type: scenario
---
# Host hooks log Kibi lookups and requirement-linked edits when opted in, and acceptance reads them only for lookup before first edit

Given a Kibi workspace with `KIBI_DIAGNOSTIC_MODE` set
When the agent runs `kb_search` and then edits a file whose symbols implement a requirement
Then the host hook appends a `kb_usage` row and an `edited` row to `.kb/usage.log` with `interface: hook`, the host name, the session id and the file's requirement ids
And the Claude Code rows also record whether Kibi had been used before the call and whether context was shown or suppressed.

Given the same session without `KIBI_DIAGNOSTIC_MODE`
When the agent reads and edits files
Then no hook row is written and hook output is unchanged.

Given a usage log with hook rows
When telemetry acceptance is evaluated
Then hook rows are kept out of the operation events and only the `lookup_before_first_edit` metric reads them.
