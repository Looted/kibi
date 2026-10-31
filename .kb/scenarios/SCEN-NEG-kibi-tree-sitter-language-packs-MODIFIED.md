---
title: A modified grammar pack file is refused, not loaded
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-31T20:10:12.802Z'
id: SCEN-NEG-kibi-tree-sitter-language-packs-MODIFIED
type: scenario
---
Given a kibi-lang-rust pack whose tree-sitter-rust.wasm differs by one byte from the file the plugin release pins, when the maintenance host analyzes a Rust file, then the analysis fails with TREESITTER_LANGUAGE_PACK_MISMATCH and the reinstall line, and the grammar is never loaded.

packages/cli/tests/plugins/approved-source-consumer.test.ts exercises it.