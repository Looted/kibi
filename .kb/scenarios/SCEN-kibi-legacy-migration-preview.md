---
id: SCEN-kibi-legacy-migration-preview
title: Preview legacy prose migration without changing evidence
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: .kb/scenarios/SCEN-kibi-legacy-migration-preview.md
tags: [requirements, migration, semantics, source-binding, packed, e2e]
links:
  - type: verified_by
    target: TEST-kibi-legacy-migration-preview
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Given a legacy requirement whose authored Markdown lacks a proposition inventory, when a packed CLI consumer or MCP caller opts into migration preview, then Kibi returns the same deterministic, read-only, source-bound review plan with exactly one disposition per proposition and no applicable write. Given a requirement whose existing `text_ref` contains distinct code evidence, the preview is blocked and preserves that evidence.
