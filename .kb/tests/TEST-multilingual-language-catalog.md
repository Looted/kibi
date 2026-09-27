---
title: Installed multilingual catalog and exact-index ownership behavior
status: active
text_ref: documentation/tests/e2e/packed/multilingual-language-catalog.test.ts
tags:
  - multilingual
  - source-analysis
  - catalog
  - e2e
  - consumer
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-multilingual-language-catalog
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-multilingual-language-catalog
    target: default
    native_id: documentation/tests/e2e/packed/multilingual-language-catalog.test.ts::runs offline qualified catalog, ambiguity, and exact-index ownership behavior from installed tarballs
id: TEST-multilingual-language-catalog
type: test
---
