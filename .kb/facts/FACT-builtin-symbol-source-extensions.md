---
title: A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs
status: active
fact_kind: property_value
subject_key: kibi.builtin.typescript_symbols
claim_key: CLAIM-E5D54009549D5E0E
claim_text: A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs
text_ref: REQ-builtin-symbol-source-extensions
property_key: source_extensions
operator: eq
value_type: set
value_set:
  - .ts
  - .tsx
  - .js
  - .jsx
  - .mts
  - .cts
  - .mjs
  - .cjs
origin:
  kind: agent
  recorded_at: '2026-10-30T19:42:02.175Z'
id: FACT-builtin-symbol-source-extensions
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.