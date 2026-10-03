---
title: must-priority-coverage still applies to superseded requirements
status: active
fact_kind: observation
tags:
  - kibi
  - checks
  - supersession
  - review:rule-gap
id: FACT-OBS-superseded-must-requirements-still-need-coverage
type: fact
---
Observed 2026-10-02 while superseding REQ-claude-mcp-follows-session-workspace and REQ-mcp-launchers-follow-session-workspace with REQ-mcp-workspace-routing.

- `current_req/1` excludes a requirement once a `supersedes` link points at it, and `req-status-vocabulary` rejects a literal `superseded` status, so the documented way to retire a requirement is to keep its status and add the link.
- `must-priority-coverage` (`coverage_gap/2` via `must_requirement/1`) selects every requirement whose priority ends in `must`, with no `current_req/1` filter. A superseded must-priority requirement whose scenario and test were removed therefore still violates it, although the proof ladder already treats it as not applicable.

Workaround used here: lower the superseded requirements' priority to `should`. A cleaner rule would exclude non-current requirements from must-priority coverage, or the schema docs should say that superseded requirements keep their scenario and test.