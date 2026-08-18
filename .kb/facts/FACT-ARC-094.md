---
id: FACT-ARC-094
title: Structured Logging with Context
status: active
tags: [logging, patterns, best-practices]
source: memory-bank/logging.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Use structured context objects in logs. Example: `this.logger.info('Action started', { userId: '123' });`. Do not use string concatenation.
