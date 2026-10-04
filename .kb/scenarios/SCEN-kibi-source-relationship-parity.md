---
title: Authored relationship drift blocks until compilation catches up
status: active
priority: must
tags:
  - relationships
  - validation
  - parity
id: SCEN-kibi-source-relationship-parity
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
1. A tracked requirement or symbol manifest authors a typed relationship.
2. The compiled RDF snapshot lacks that exact edge.
3. An explicit source-relationship-parity check reports the authored-to-compiled drift and blocks.
4. A runtime-only source edge remains exempt only from reverse source ownership.
5. After a successful sync reconciles the authored edge, the scoped parity check passes.
