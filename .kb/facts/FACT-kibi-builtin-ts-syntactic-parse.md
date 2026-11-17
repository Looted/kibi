---
title: The builtin TypeScript provider decides symbols from each file's own syntax
status: active
fact_kind: property_value
subject_key: kibi.plugin_builtin.ts_symbols
property_key: loads_library_declarations_or_resolves_imports
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - plugins
  - symbols
  - typescript
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
claim_text: The builtin TypeScript provider must decide symbols from each file's own syntax, without loading TypeScript's library declarations or resolving the file's imports
text_ref: REQ-kibi-builtin-ts-syntactic-parse
claim_key: CLAIM-4DCBC7183589D6C4
id: FACT-kibi-builtin-ts-syntactic-parse
type: fact
---
The grounded claim of REQ-kibi-builtin-ts-syntactic-parse: The builtin TypeScript provider must decide symbols from each file's own syntax, without loading TypeScript's library declarations or resolving the file's imports.