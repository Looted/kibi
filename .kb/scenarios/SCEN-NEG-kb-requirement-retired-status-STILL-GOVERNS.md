---
title: A search answer never lists a retired requirement as governing
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - retired-status
origin:
  kind: agent
  recorded_at: '2026-11-11T17:42:16.013Z'
id: SCEN-NEG-kb-requirement-retired-status-STILL-GOVERNS
type: scenario
---
Given two retired requirements whose words match a search, when kb_search answers it, then neither is listed as governing, so an answer that kept serving a retired requirement as current intent is caught.

This is the failure side of the search claim. packages/cli/tests/commands/retired-status.test.ts "kibi check asks a retired requirement why and reports what it alone still owns, and search stops treating it as governing" exercises it with the query "audit trail of every write".