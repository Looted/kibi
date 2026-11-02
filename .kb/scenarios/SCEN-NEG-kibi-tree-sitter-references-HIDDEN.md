---
title: A Go environment read of a name computed at run time is refused with its place
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-31T16:49:14.635Z'
id: SCEN-NEG-kibi-tree-sitter-references-HIDDEN
type: scenario
---
Given a Go file with return os.Getenv(name), when a source test reads the environment variables of the Go server package to decide which ones it reads, then the read is refused, not answered, and the reason names go/lookup.go line 6 and os.Getenv(name), so the claim is not decided over reads Kibi only partly saw. Reflection, Rust macros, C# #if blocks and non-test #[cfg] items are refused the same way.

This is the failure side of reading compiled languages statically. documentation/tests/e2e/packed/tree-sitter-source-references.test.ts and packages/plugin-treesitter/tests/references.test.js exercise it.