---
id: SCEN-kibi-legacy-migration-preview-v2
title: Preview legacy semantic prose without replacing evidence
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/scenarios/SCEN-kibi-legacy-migration-preview-v2.md
tags: [requirements, migration, semantics, source-binding, packed, e2e]
links:
  - type: verified_by
    target: TEST-kibi-legacy-migration-preview-v2
---

Given a legacy requirement whose authored Markdown lacks a proposition inventory and whose `text_ref` points to independent code or document evidence, when a packed CLI consumer or MCP caller opts into migration preview, then Kibi returns the same deterministic, read-only review plan with the normalized prose in a `semantic_text` patch and no `text_ref` replacement. Given an existing `semantic_text` value that differs from the normalized authored Markdown, the preview is blocked as semantic source drift.
