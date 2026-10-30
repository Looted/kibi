---
title: A requirement added by an uncommitted change is listed in the signoff view, not left out
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:50:46.776Z'
id: SCEN-CASE-kibi-signoff-views-CHANGED-REQ-OMITTED
type: scenario
---
Given a workspace whose uncommitted change adds one requirement, when kibi signoff runs, then the summary lists that requirement as new with its statement and proof state, and the chat view counts it in its heading, so the added requirement is never missing from the view.

The test case "should show the requirements signoff summary and decisions view" in documentation/tests/e2e/packed/cli-workflows.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 0`, of changed or implemented requirements missing from signoff.