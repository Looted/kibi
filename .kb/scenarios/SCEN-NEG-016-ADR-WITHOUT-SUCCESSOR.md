---
title: A deprecated ADR with no successor is flagged by the check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:37.350Z'
id: SCEN-NEG-016-ADR-WITHOUT-SUCCESSOR
type: scenario
---
Given a knowledge base holding an ADR whose status is deprecated and that no other ADR supersedes, when the deprecated-ADR check runs, then it reports a deprecated-adr-no-successor violation naming that ADR.

This is the failure side of the temporal ADR contract: a broken supersession chain must be flagged rather than silently accepted. packages/core/tests/kb.plt test check_deprecated_adrs_reports_missing_successor in the checks_coverage_gaps suite exercises it.
