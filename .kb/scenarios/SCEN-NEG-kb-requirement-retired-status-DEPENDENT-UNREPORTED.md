---
title: kibi check stays silent about a fact only a retired requirement owns
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - retired-status
origin:
  kind: agent
  recorded_at: '2026-11-11T17:42:15.024Z'
id: SCEN-NEG-kb-requirement-retired-status-DEPENDENT-UNREPORTED
type: scenario
---
Given a current fact that only a retired requirement constrains and a second fact a closed requirement also constrains, when kibi check runs, then it must report the first under retired-owner-only and leave the shared one alone, so a check that let the orphaned fact pass is caught.

This is the failure side of the leftover claim. packages/cli/tests/commands/retired-status.test.ts "kibi check asks a retired requirement why and reports what it alone still owns, and search stops treating it as governing" exercises it with FACT-audit-only and FACT-audit-shared.