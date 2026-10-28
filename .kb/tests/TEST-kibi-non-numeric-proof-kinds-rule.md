---
title: Rule, state_machine and regex are certificate proof kinds, by model check
status: passing
tags:
  - proof
  - certificate
  - rule
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-non-numeric-proof-kinds-rule
      target: default
  success_policy: all_required_first_attempt
  kind: rule
  predicate_source:
    certificate_proof_kind:
      symbol_id: SYM-is-certificate-proof-kind
  domains:
    proof_kind:
      symbol_id: SYM-proof-kinds
  proves:
    - CLAIM-289608FF49F0F9C6
origin:
  kind: agent
  recorded_at: '2026-10-26T09:47:52.812Z'
id: TEST-kibi-non-numeric-proof-kinds-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d26ce0fa832b3ae5dbf6ddee
    test_id: TEST-kibi-non-numeric-proof-kinds-rule
    scope: unit
    outcome: passed
    code_snapshot: 5cd63ae2d123c329d0f327961e5bd248bf2ec09473953b646a5ae51a11d4014d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T13:48:06.391Z'
    finished_at: '2026-10-28T13:48:06.518Z'
    artifact_digest: 4d7e78a6391dce9de7f095f8b75ca4205f4f9067ee2f8fe9f63b62686b15c7ba
    contract_hash: 8bea2f893deb7c093328a1092e7e7232f5d310282d008753b7641859bb6b19a0
    binding_hash: 3b7b9b499581cd36023db242a13ade1f654e5f7326d9d1037a3c53aebbda92ea
    fingerprint: 8693ea47063630def80565422453b26b807dddead76dc018ee9c0b00495d87dc
    fingerprint_components:
      contract: 8bea2f893deb7c093328a1092e7e7232f5d310282d008753b7641859bb6b19a0
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
      - symbol_id: SYM-test-non-numeric-proof-kinds-rule
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: rule
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: rule
      test_id: TEST-kibi-non-numeric-proof-kinds-rule
      domains:
        proof_kind:
          symbol_id: SYM-proof-kinds
          members:
            - e2e
            - example
            - property
            - exhaustive
            - typecheck
            - arithmetic
            - smt
            - rule
            - state_machine
            - regex
            - source
      predicates:
        certificate_proof_kind:
          symbol_id: SYM-is-certificate-proof-kind
          arg_types:
            - proof_kind
          rows:
            - args:
                - e2e
              value: false
            - args:
                - example
              value: false
            - args:
                - property
              value: false
            - args:
                - exhaustive
              value: true
            - args:
                - typecheck
              value: true
            - args:
                - arithmetic
              value: true
            - args:
                - smt
              value: true
            - args:
                - rule
              value: true
            - args:
                - state_machine
              value: true
            - args:
                - regex
              value: true
            - args:
                - source
              value: true
    certificate_digest: 412d921126e14b5fee0a25438442b8670ca2572bbab83ae00f2e58a198dfa271
    claim_bindings:
      - claim_key: CLAIM-289608FF49F0F9C6
        requirement_id: REQ-kibi-non-numeric-certificate-kinds
        fact_id: FACT-kibi-non-numeric-certificate-kinds
        binding: derived
        scope: code
        obligation:
          kind: every_member
          members:
            - regex
            - rule
            - state_machine
          predicate: certificate_proof_kind
---
Decides isCertificateProofKind for every member of PROOF_KINDS and leaves a rule certificate; Kibi re-evaluates the function over the same domain from proof-protocol.ts and checks that it holds for every member of the set fact naming rule, state_machine and regex, which proves the requirement's claim that the three are certificate proof kinds.