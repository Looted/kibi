---
id: FACT-ARC-016
title: Component Relationships Hierarchy
status: active
tags: [architecture, components, structure]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

App (root standalone component) delegates to Header and RouterOutlet, which manages page navigation via routes. Pages then compose shared components. This hierarchical structure promotes component reusability and separation of concerns.
