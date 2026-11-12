---
title: kibi check stays silent about a retired requirement without a reason
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - retired-status
origin:
  kind: agent
  recorded_at: '2026-11-11T17:42:13.982Z'
id: SCEN-NEG-kb-requirement-retired-status-REASON-UNREPORTED
type: scenario
---
Given a requirement with status retired and no retired_reason, when kibi check runs, then it must report the requirement under retired-reason-missing, so a check that let it pass silently is caught.

This is the failure side of the reason claim. packages/cli/tests/commands/retired-status.test.ts "kibi check asks a retired requirement why and reports what it alone still owns, and search stops treating it as governing" exercises it: REQ-audit-unexplained is reported and REQ-audit-retired, which has a reason, is not. The same file's "kb_upsert refuses status retired without retired_reason" shows the write path refusing such a requirement before it reaches the KB.