---
title: An agent edits a file no requirement owns yet
status: active
priority: must
tags:
  - hooks
  - impact
origin:
  kind: agent
  recorded_at: '2026-10-14T09:45:41.396Z'
id: SCEN-kb-unowned-file-candidates
type: scenario
---
Given a requirement titled "The coach inbox must list the analysis requests assigned to the coach." and no symbol in src/app/pages/coach-dashboard/coach-dashboard.html linked to any requirement, when an agent is about to edit that file, then the hook note says that no link does not mean no rule and names the coach inbox requirement as a candidate; a superseded requirement sharing the words is not named.

When the agent then runs kb_check with that file in sourceFiles and impact diagnostics on, then the result carries a non-blocking source_file_unowned diagnostic for the file that names the same candidate and says how to confirm and link it. A file whose words no requirement title shares gets the same diagnostic with a kb_search call instead of candidates.

This exists because agents read "no symbol is linked" and an empty scoped check as "no rule applies" and changed governed behavior without naming the rule.
