---
title: The type checker accepts a witness over every proof kind
status: passing
tags:
  - proof
  - certificate
  - typecheck
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-code-proof-kinds-typecheck
      target: default
  success_policy: all_required_first_attempt
  kind: typecheck
  domain_source:
    symbol_id: SYM-proof-kinds
  witness:
    path: packages/cli/tests/proofs/witness/proof-kind-levels.ts
  proves:
    - CLAIM-AEDC5DE05A243DB4
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:49.356Z'
id: TEST-kibi-code-proof-kinds-typecheck
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2ac970cd576799204c8251cc
    test_id: TEST-kibi-code-proof-kinds-typecheck
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:23:37.996Z'
    finished_at: '2026-11-16T12:23:56.702Z'
    artifact_digest: 57a0a32e0d7704e27c251804647b7fbd6b59618c39cc94f5c0297939a79cad2b
    contract_hash: 5c5e6c891cebfed5cdaf90f417f85bc2be49c0b2b98c573d3a68e394e3fe5df2
    binding_hash: 9f4c521f1fc188ef5b26023b88bcb4b90713ff2147b9eaabde0be85f79b60d29
    fingerprint: 7b0d3807f8988e88403ec7d1583505fa629f273b63a58bc586447875e8b6832c
    fingerprint_components:
      contract: 5c5e6c891cebfed5cdaf90f417f85bc2be49c0b2b98c573d3a68e394e3fe5df2
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-code-proof-kinds-typecheck
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: typecheck
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: typecheck
      test_id: TEST-kibi-code-proof-kinds-typecheck
      domain:
        symbol_id: SYM-proof-kinds
      witness:
        path: packages/cli/tests/proofs/witness/proof-kind-levels.ts
        sha256: 0dcb3e79defb183bf10f07309f35ab49292aa18c1f55c30ff15a3d91b5e598ff
      compiler:
        name: tsc
        version: 5.9.3
      outcome: passed
    certificate_digest: 02d70592d226a6caab929e530e3819e2c4fed81612dfa1e5792a5280c00f19be
    claim_bindings:
      - claim_key: CLAIM-AEDC5DE05A243DB4
        requirement_id: REQ-kibi-proof-kind-vocabulary
        fact_id: FACT-kibi-code-proof-kind-vocabulary-closed
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - arithmetic
            - e2e
            - example
            - exhaustive
            - property
            - regex
            - rule
            - smt
            - source
            - state_machine
            - typecheck
---
Compiles the proof-kind witness with the TypeScript compiler in strict mode: a map over PROOF_KINDS and a switch ending in a never check, so a new proof kind without an evidence level fails to compile; the run leaves a typecheck certificate naming the witness hash and compiler version.