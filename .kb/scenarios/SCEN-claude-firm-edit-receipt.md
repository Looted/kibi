---
title: Claude Code lets only the retry of an edit it asked about through on a keeps receipt
status: active
priority: must
expects: success
tags:
  - hooks
  - claude-code
  - firmness
origin:
  kind: agent
  recorded_at: '2026-11-16T07:02:46.971Z'
id: SCEN-claude-firm-edit-receipt
type: scenario
---
Given computeTotal implements the firm requirement "Totals round half up to two decimals.", when the agent edits computeTotal, the kibi-claude PreToolUse hook asks the person. When nobody can answer and the agent records a keeps receipt for computeTotal with kibi review-firm-edit, the retried edit goes through without a permission prompt. A keeps receipt recorded before the session asked, such as one committed in an earlier session, does not skip the question: a new session editing computeTotal is asked again. Once the code or the statement changes, the receipt lapses.