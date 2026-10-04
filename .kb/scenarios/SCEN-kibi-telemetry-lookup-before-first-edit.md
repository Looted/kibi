---
title: Telemetry acceptance reports sessions that edited requirement-linked code before looking it up
status: active
priority: must
tags:
  - telemetry
  - acceptance
  - hooks
  - remediation
origin:
  kind: agent
  recorded_at: '2026-10-04T02:14:36.899Z'
id: SCEN-kibi-telemetry-lookup-before-first-edit
type: scenario
---
# Telemetry acceptance reports sessions that edited requirement-linked code before looking it up

Given a usage log whose hook rows show one host session that ran `kb_search` before its first edit of a file whose symbols implement a requirement, and another session that edited such a file first
When `kibi usage-metrics` evaluates telemetry acceptance
Then `lookup_before_first_edit` reports 1 of 2 sessions, fails against the default minimum of 1, and names the unguided file
And an unfiltered `kb_check` adds the advisory `lookup_before_first_edit_bypassed` diagnostic
And `kibi usage-remediation` lists the second session with the exact `.kb/usage.log` line of its edit.

Given a usage log with no hook row for a requirement-linked edit
When telemetry acceptance is evaluated
Then `lookup_before_first_edit` is `not_applicable` and the other metrics are judged as before.
