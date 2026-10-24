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
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:49.356Z'
id: TEST-kibi-code-proof-kinds-typecheck
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f1ed766d2d59e3b3c9d173a8
    test_id: TEST-kibi-code-proof-kinds-typecheck
    scope: unit
    outcome: passed
    code_snapshot: ded72dac6be0ba6834ef5c3166558b3ffad93197ba8871d340c23f98ebdbb69e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T21:36:36.936Z'
    finished_at: '2026-10-24T21:36:37.806Z'
    artifact_digest: d4a93fd74076eab1c42d1298913f0480213247ee1a2473978a49dc4348a9151f
    contract_hash: 75e952d682d83f1211eeb49bb8663cda7dffa172f0d63718c4371d51ecb908f8
    binding_hash: ba1b8335c7e3aaaf2fe90befbef0b7250a29a7724efa5e6236005ae7668d54c4
    fingerprint: a19643859576e2cc8e1764d76eddd27ddd692cd88ced6b1e04d10b3dc09d4855
    fingerprint_components:
      contract: 75e952d682d83f1211eeb49bb8663cda7dffa172f0d63718c4371d51ecb908f8
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
---
Compiles the proof-kind witness with the TypeScript compiler in strict mode: a map over PROOF_KINDS and a switch ending in a never check, so a new proof kind without an evidence level fails to compile; the run leaves a typecheck certificate naming the witness hash and compiler version.