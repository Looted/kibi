---
title: Scaffold CLI creates a draft without modifying live language support
status: active
text_ref: scripts/tests/scaffold-tree-sitter-language.test.mjs
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - multilingual
  - tree-sitter
  - language-authoring
  - scaffold
  - e2e
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
      target: default
  success_policy: all_required_first_attempt
id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
type: test
---
