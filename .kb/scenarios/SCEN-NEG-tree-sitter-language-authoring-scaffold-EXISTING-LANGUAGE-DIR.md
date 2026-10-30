---
title: The Tree-sitter language scaffold refuses an existing language directory without overwriting it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:27.240Z'
id: SCEN-NEG-tree-sitter-language-authoring-scaffold-EXISTING-LANGUAGE-DIR
type: scenario
---
Given an output directory that already holds a sample-lang directory with operator files, when the scaffold is run for sample-lang, then it exits non-zero with an already-exists error and the existing files are left exactly as they were.

This is the failure side of the disconnected draft: the scaffold only creates a fresh draft and never rewrites language files that already exist. scripts/tests/scaffold-tree-sitter-language.test.mjs "refuses an existing language directory without overwriting its files" exercises it.
