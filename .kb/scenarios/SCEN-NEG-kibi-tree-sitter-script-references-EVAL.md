---
title: A Bash environment read that reaches eval or a variable set on only some paths is refused with its place
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-02T12:20:28.701Z'
id: SCEN-NEG-kibi-tree-sitter-script-references-EVAL
type: scenario
---
Given a Bash script that runs eval "$RELEASE_STEPS" and another that sets TARGET only inside an if block before expanding it, when a source test reads the environment variables of every deploy script to decide which ones they read, then the read is refused, not answered, and the reasons name bash/release.sh line 3 and bash/rollback.sh line 5, so the claim is not decided over reads Kibi only partly saw. PHP dynamic calls, C macros Kibi cannot expand and computed Terraform keys are refused the same way.

This is the failure side of reading script languages statically. documentation/tests/e2e/packed/tree-sitter-script-references.test.ts and packages/plugin-treesitter/tests/references-more-languages.test.js exercise it.
