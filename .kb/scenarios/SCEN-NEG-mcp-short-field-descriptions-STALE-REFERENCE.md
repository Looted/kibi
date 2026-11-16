---
title: A field reference that no longer matches the catalog fails the field reference tests
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T06:40:15.953Z'
id: SCEN-NEG-mcp-short-field-descriptions-STALE-REFERENCE
type: scenario
---
Given an operation field whose full description changed without regenerating resources/operation-fields.md, when the field reference tests run, then they fail because a skill mirror's copy differs from the reference generated from the catalog, so kb_skills cannot serve a stale or missing description. packages/cli/tests/operations/field-reference.test.ts exercises it.