---
id: FACT-ARC-042
title: Never Use @HostListener Decorator
status: active
tags: [forbidden, components, decorators]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T21:42:12Z
updated_at: 2026-02-20T21:42:12Z
fact_kind: meta
---

Put host bindings inside the `host` object of `@Component` or `@Directive` decorator instead of using `@HostBinding` and `@HostListener` decorators.
