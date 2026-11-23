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
Given a Kibi workspace where `deleteInvoice` in `src/invoices.ts` implements a current firm requirement, when a Vibe `edit` of that file succeeds, the post_tool context names the requirement and asks for a verdict; a second edit in the same session adds no notice.