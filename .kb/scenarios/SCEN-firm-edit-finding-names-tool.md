---
title: The unreviewed firm-edit finding names the receipt tool and its CLI route
status: active
expects: success
priority: should
tags:
  - firmness
  - check
  - mcp
origin:
  kind: agent
  recorded_at: '2026-11-17T15:35:29.527Z'
id: SCEN-firm-edit-finding-names-tool
type: scenario
---
Given a staged edit inside a symbol that implements a current firm requirement and no current keeps receipt for it, when kibi check --staged runs, then the firm_edit_unreviewed finding's suggestion tells the agent to send the printed input to kb_review_firm_edit, and to pipe it to kibi review-firm-edit --input - when MCP is not available. packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts exercises it.