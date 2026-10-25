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
    - CLAIM-296F27003E43BA8A
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:49.356Z'
id: TEST-kibi-code-proof-kinds-typecheck
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-68528343c27e113e2de6f3ec
    test_id: TEST-kibi-code-proof-kinds-typecheck
    scope: unit
    outcome: passed
    code_snapshot: 88f72ac7863bc053137ae0fbd6e7ea179d4fbf9dd5cb363152f2b4fc11739754
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T18:53:46.427Z'
    finished_at: '2026-10-25T18:53:47.327Z'
    artifact_digest: dd68699b4690c5db850cd19455bbe328bf396e45404f047939800f8dd18c4b82
    contract_hash: 066bcf205dfce6c11fe820ddfbfd1d0514564cabda4efe15eac7b5c860e2490e
    binding_hash: b1ef752eb8676f5cda48b3e3b7a1a1496e69d7d15e7cfd9235fc3565d5fd479d
    fingerprint: f124203071181b24f097f8f21a34358d792b1e67a5b8aea14b84daa3afb1bd63
    fingerprint_components:
      contract: 066bcf205dfce6c11fe820ddfbfd1d0514564cabda4efe15eac7b5c860e2490e
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
        sha256: 494b8c49703159b97ca5e60dc885810fbcb73855ba9d081c9b4a2e8d39527afa
      compiler:
        name: tsc
        version: 5.9.3
      outcome: passed
    certificate_digest: 1a4875180506dc597f961bc6d0fd5106b734d2ec3f83ca667d55aae64a3c4b9f
    claim_bindings:
      - claim_key: CLAIM-296F27003E43BA8A
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
            - smt
            - typecheck
---
Compiles the proof-kind witness with the TypeScript compiler in strict mode: a map over PROOF_KINDS and a switch ending in a never check, so a new proof kind without an evidence level fails to compile; the run leaves a typecheck certificate naming the witness hash and compiler version.