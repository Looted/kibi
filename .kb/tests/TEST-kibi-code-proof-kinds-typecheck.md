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
    receipt_id: PR-e32e1ce73b2816db3709a94b
    test_id: TEST-kibi-code-proof-kinds-typecheck
    scope: unit
    outcome: passed
    code_snapshot: e7ef7119bcc90f0b8409339ad2246d8e19fdffcaa2429ca3ccda3a5b7dc8f4b1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T08:01:07.365Z'
    finished_at: '2026-10-27T08:01:10.872Z'
    artifact_digest: 7ad59d1e8e946a4ce3376438eb1d87a3372223cbdf4c85eedc66d1c8f9da03af
    contract_hash: 5c5e6c891cebfed5cdaf90f417f85bc2be49c0b2b98c573d3a68e394e3fe5df2
    binding_hash: bb2b099a2e7ece519c7621e44a19fa1a1f9c12fe523382da059218ba74649e18
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
        sha256: c2a5b3a9bd3136ab98fb80d43b6f84baaa569f907b206cd033bd803546326d93
      compiler:
        name: tsc
        version: 5.9.3
      outcome: passed
    certificate_digest: 2cd3ada745a61a77a6a5685aaa6a2df7860909e3c461aa0714606be14edb1c4c
    claim_bindings:
      - claim_key: CLAIM-AEDC5DE05A243DB4
        requirement_id: REQ-kibi-code-proof-kinds
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