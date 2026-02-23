---
id: FLAG-002
title: "scip-symbol-extraction: SCIP/LSP-based language-specific symbol indexing"
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: could
tags:
  - symbols
  - scip
  - deferred
links:
  - ADR-005
---

When enabled: replaces manual `symbols.yaml` maintenance with automatic symbol
extraction using the SCIP protocol. Requires language-specific indexers (scip-typescript,
scip-python, etc.). Deferred behind this flag until tooling matures.
