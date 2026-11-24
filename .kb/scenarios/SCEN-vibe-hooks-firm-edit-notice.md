---
title: Vibe names a firm requirement once after an edit of its code
status: active
expects: success
tags:
  - vibe
priority: should
origin:
  kind: agent
  recorded_at: '2026-11-22T18:24:25.855Z'
id: SCEN-vibe-hooks-firm-edit-notice
type: scenario
---
Given a Kibi workspace where `deleteInvoice` in `src/invoices.ts` implements a current firm requirement, when a Vibe `edit` or `search_replace` of that file succeeds, the post_tool context names the requirement and asks for a verdict, whether the path is absolute, relative to the payload cwd, or named only inside an `edits` list; a second edit in the same session adds no notice. packages/vibe/tests/hooks.test.mjs runs the shipped hook script for these cases and checks that the hooks.toml matcher covers every edit tool.