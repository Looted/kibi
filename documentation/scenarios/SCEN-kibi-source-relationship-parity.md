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
---
1. A tracked requirement or symbol manifest authors a typed relationship.
2. The compiled RDF snapshot lacks that exact edge.
3. An explicit source-relationship-parity check reports the authored-to-compiled drift and blocks.
4. A runtime-only source edge remains exempt only from reverse source ownership.
5. After a successful sync reconciles the authored edge, the scoped parity check passes.
