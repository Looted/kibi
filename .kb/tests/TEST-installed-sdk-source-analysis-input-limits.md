---
title: Installed public SDK source-analysis input limit contract
status: passing
text_ref: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts
tags:
  - plugins
  - source-analysis
  - e2e
  - consumer
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-installed-sdk-source-analysis-input-limits
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
    target: default
    native_id: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts::enforces the installed SDK UTF-16 input limit using its public export and validator
---
# Installed public SDK input-limit contract

The test installs frozen local package tarballs into a relocated consumer and imports only the public SDK export. It checks the exact UTF-16 boundary, oversized ASCII and astral inputs, valid empty failed observations, and rejection of successful/partial/unsupported observations, symbols, uncovered ranges, and ranged diagnostics above the bound. The test does not relabel internal unit tests as consumer evidence or change the production proof rules.
