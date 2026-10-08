---
title: Bootstrap plans shorten long generated claim names and keep them distinct
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - naming
origin:
  kind: agent
  recorded_at: '2026-10-08T09:14:07.827Z'
id: SCEN-bootstrap-claim-name-length
type: scenario
---
Given a declared knowledge source and the intent claim "Support inbox must update in real time when a new ticket is assigned to the agent without a page refresh." with `component: support inbox`, when the agent previews `kb_plan_bootstrap`, the planned facts are named `support_inbox.update_in_real_time` and the plan diagnostics hold a shortening line naming the full name and the short one. Two claims "Editor must discard a draft while finishing a review." and "Editor must discard a draft while leaving the page." get `editor.discard_a_draft` and `editor.discard_a_draft.leaving` and a disambiguation line; claims about the same behavior keep sharing a name, and planning twice gives the same names.

An onboarding evaluation found bootstrap names whose second segment was a whole clause.