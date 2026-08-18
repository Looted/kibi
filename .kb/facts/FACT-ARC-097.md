---
id: FACT-ARC-097
title: Log Level Resolution Order
status: active
tags: [logging, configuration, best-practices]
source: memory-bank/logging.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Effective log level is determined in this order: 1) Runtime override via `logger.setLevel('debug')`, 2) Session storage via `sessionStorage.getItem('ALIGN_LOG_LEVEL')`, 3) Local storage via `localStorage.getItem('ALIGN_LOG_LEVEL')`, 4) URL param (Non-Prod only) `?logLevel=debug`, 5) Default: Development (`info`), Production (`warn`).
