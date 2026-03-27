---
id: FACT-ARC-035
title: Smart/Dumb Component Pattern
status: active
tags: [design, architecture, components]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Pages are "Smart" (fetch data via services). Components are "Dumb" (receive inputs, emit outputs). This separation improves testability and reusability.
