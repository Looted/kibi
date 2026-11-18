---
title: An unreviewed firm-edit finding that names only the CLI route is wrong
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T15:35:30.572Z'
id: SCEN-NEG-firm-edit-finding-names-tool-CLI-ONLY
type: scenario
---
Given a staged edit of firm code without a keeps receipt, when the firm_edit_unreviewed finding's suggestion names only kibi review-firm-edit and not kb_review_firm_edit, then the exact-text assertion in packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts fails.