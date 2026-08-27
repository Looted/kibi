---
id: FACT-ARC-026
title: Sport-Neutral Domain Model
status: active
tags: [architecture, domain-model, terminology]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-03-25T00:00:00Z
fact_kind: meta
---

Internal code uses sport-neutral terminology: `Student` and `Instructor`. The user interface maps these terms to market-specific terms: `Climber` and `Coach`. This separation allows the platform to target other sports without code changes.
