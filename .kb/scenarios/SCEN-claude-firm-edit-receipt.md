---
title: Claude Code does not ask the person about an edit a current keeps receipt covers
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
Given computeTotal implements the firm requirement "Totals round half up to two decimals." and the agent recorded a keeps receipt for computeTotal with kibi review-firm-edit, when the agent edits computeTotal again without changing the code the receipt covers, then the kibi-claude PreToolUse hook lets the edit through without a permission prompt. Once the code or the statement changes, the receipt lapses and the hook asks again.