---
title: A changed symbol in kb_check never lists the links linkedEntities carries
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-11-24T19:26:43.364Z'
id: SCEN-CASE-kb-check-symbols-without-links-CHECK-SYMBOL-WITH-LINKS
type: scenario
---
Given a change to two symbols that implement requirements, when kibi check returns its impact result, then no extractedSymbols entry has linkedEntityIds while linkedEntities pairs each symbol with its requirement, so a symbol that still listed its links is caught.

This covers one violating item past the invariant, `gt 0` on `extracted_symbols_listing_linked_entities`. packages/cli/tests/consumer/check-compact-impact.test.ts exercises it by asserting the keys of every symbol.
