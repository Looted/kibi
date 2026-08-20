---
id: TEST-cli-symbol-extract-methods
title: CLI staged extraction emits class method symbols
status: passing
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: packages/cli/tests/traceability/symbol-extract.test.ts
tags: [cli, symbols, traceability, unit]
links:
  - type: validates
    target: SCEN-symbol-granularity
---

Verifies that staged symbol extraction qualifies duplicate class method symbols and keeps method-level traceability directives attached to the method rather than the containing class.
