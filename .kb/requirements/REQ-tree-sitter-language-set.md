---
title: Tree-sitter plugin languages and extensions
status: open
priority: must
firmness: firm
semantic_text: A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl. A Python source file shall end in .py or .pyi. A Go source file shall end in .go. A Rust source file shall end in .rs.
semantic_clauses:
  - A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl.
  - A Python source file shall end in .py or .pyi.
  - A Go source file shall end in .go.
  - A Rust source file shall end in .rs.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T22:41:35.378Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a419d8494ed479ecc2cb5c9ac2d0a81c0679acfb7e613fd0f1aba5105c6a9f7b
semantic_inventory:
  - claim_key: CLAIM-792D57510F335E69
    claim_text: A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl
    role: normative
    status: modeled
    span:
      start: 0
      end: 112
  - claim_key: CLAIM-7EF27325E2CE1902
    claim_text: A Python source file shall end in .py or .pyi
    role: normative
    status: modeled
    span:
      start: 114
      end: 159
  - claim_key: CLAIM-D3B5367E18F80DF4
    claim_text: A Go source file shall end in .go
    role: normative
    status: modeled
    span:
      start: 161
      end: 194
  - claim_key: CLAIM-D5BAED30A693179C
    claim_text: A Rust source file shall end in .rs
    role: normative
    status: modeled
    span:
      start: 196
      end: 231
logic_claims:
  - CLAIM-792D57510F335E69
  - CLAIM-7EF27325E2CE1902
  - CLAIM-D3B5367E18F80DF4
  - CLAIM-D5BAED30A693179C
id: REQ-tree-sitter-language-set
type: req
---
A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl. A Python source file shall end in .py or .pyi. A Go source file shall end in .go. A Rust source file shall end in .rs.

## Context

packages/plugin-treesitter/src/catalog.ts is the language catalog REQ-tree-sitter-language-authoring-scaffold adds new languages to. The supported language ids and the extensions of the most used languages are stated here so they are proved against the catalog.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"