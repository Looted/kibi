---
title: Builtin TypeScript symbol extractor file extensions
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs.
semantic_clauses:
  - A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:44:33.471Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b6a099fb60f27b55cb95bcc4452c1de853885cdad0c4adbda3c070bb82d9e40d
semantic_inventory:
  - claim_key: CLAIM-E5D54009549D5E0E
    claim_text: A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs
    role: normative
    status: modeled
    span:
      start: 0
      end: 119
logic_claims:
  - CLAIM-E5D54009549D5E0E
id: REQ-builtin-symbol-source-extensions
type: req
---
A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs.

## Context

REQ-capability-plugin-builtin-parity-v1 keeps the builtin TypeScript symbol analysis. The file extensions that analysis reads are stated here so they are proved against SUPPORTED_SOURCE_EXTENSIONS in packages/plugin-builtin/src/symbols/ts-morph-shared.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
