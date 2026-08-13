---
id: TEST-kibi-intent-aware-source-discovery
title: Intent-aware source discovery verification
type: test
status: passing
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/tests/TEST-kibi-intent-aware-source-discovery.md
priority: must
verification_scope: integration
verification_perspective: consumer
tags: [search, intent, source, test]
links:
  - type: validates
    target: SCEN-kibi-intent-aware-source-discovery
---

The CLI and MCP search contracts accept natural-language intent, return stable ranked entities, include source-linked evidence and graph paths, and preserve explicit zero-result behavior. Unit and operation parity tests cover lexical fallback, source filters, relationship filters, and deterministic ordering.
