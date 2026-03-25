---
id: FACT-ARC-084
title: Search for Affected Selectors Before Modifying UI
status: active
tags: [quality, e2e, selectors, best-practices]
source: memory-bank/development.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Before modifying UI components, search for affected selectors: `grep -r "data-testid='element-name'" tests/` and `grep -r 'data-testid="element-name"' tests/`.
