---
title: Every proof kind supports exactly its evidence level
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-code-proof-kinds-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-kinds
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:43.873Z'
id: TEST-kibi-code-proof-kinds-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fdbb3667e671cd446d3df603
    test_id: TEST-kibi-code-proof-kinds-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: ded72dac6be0ba6834ef5c3166558b3ffad93197ba8871d340c23f98ebdbb69e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T21:36:31.389Z'
    finished_at: '2026-10-24T21:36:31.813Z'
    artifact_digest: 1deb316d99474393f9bd15d1ac405b46d5be5d831c73912c60d00721565c491a
    contract_hash: 274e1ad1d17b444603e18e0e996f88d61d5ee6c5cbfcbe6f01e50681af29726b
    binding_hash: 33a4d5395b5a5f68318c9d97f160236f944bfadd9720848f007ed5a87b4bb337
    fingerprint: 49a2845cc7a95fea06fb54b61f759de7779b8d12c68ffc6df5afef3ca4e1fa21
    fingerprint_components:
      contract: 274e1ad1d17b444603e18e0e996f88d61d5ee6c5cbfcbe6f01e50681af29726b
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
      - symbol_id: SYM-test-code-proof-kinds-exhaustive
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-kibi-code-proof-kinds-exhaustive
      domain:
        symbol_id: SYM-proof-kinds
        members:
          - e2e
          - example
          - property
          - exhaustive
          - typecheck
          - arithmetic
          - smt
      results:
        - member: e2e
          outcome: passed
        - member: example
          outcome: passed
        - member: property
          outcome: passed
        - member: exhaustive
          outcome: passed
        - member: typecheck
          outcome: passed
        - member: arithmetic
          outcome: passed
        - member: smt
          outcome: passed
    certificate_digest: 8fffc1f6ca5dd776bde850ce95b5182993520b4f517b3e7d5164ef8f8bd1732d
---
Checks every member of PROOF_KINDS: a runner kind earns tested without a certificate, and for each certificate kind a valid certificate re-checks in code_certificates.pl with the receipt's digest while every tampered variant is rejected; the run leaves an exhaustive certificate over PROOF_KINDS.