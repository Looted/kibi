---
title: Tree-sitter language scaffold emits disconnected unqualified draft output
status: active
text_ref: scripts/tests/scaffold-tree-sitter-language.test.mjs
tags:
  - multilingual
  - tree-sitter
  - language-authoring
  - scaffold
verification_scope: unit
verification_perspective: internal
id: TEST-tree-sitter-language-authoring-scaffold-draft-output
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
      target: default
  success_policy: all_required_first_attempt
---
