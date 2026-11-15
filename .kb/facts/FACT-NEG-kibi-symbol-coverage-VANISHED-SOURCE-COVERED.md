---
title: Symbol coverage counts a linked symbol whose source file is gone as fully covered
status: active
fact_kind: property_value
subject_key: kibi.symbols.traceability
property_key: vanished_source_symbol_reported_uncovered
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - coverage
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: FACT-NEG-kibi-symbol-coverage-VANISHED-SOURCE-COVERED
type: fact
---
The failure side of the vanished-source rule: a production symbol whose file was deleted or moved would still read as fully covered because its requirement and test links are complete, so the stale link goes unnoticed.