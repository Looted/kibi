---
title: A claim binding verdict shall be derived, attested or rejected, by an exhaustive proof
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
    - symbol_id: SYM-proof-claim-binding-verdicts
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-claim-binding-verdicts
  proves:
    - CLAIM-CE2055482973A026
origin:
  kind: agent
  recorded_at: '2026-10-29T16:46:51.212Z'
id: TEST-proof-claim-binding-verdicts
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cb9aba52c5ffb59ea7ad6bfa
    test_id: TEST-proof-claim-binding-verdicts
    scope: unit
    outcome: passed
    code_snapshot: 3ef679be4889b29bbf2035f91775c6f274ff1378dfca354d2d0e2fee8d047f47
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:50:34.301Z'
    finished_at: '2026-10-29T16:50:34.467Z'
    artifact_digest: bd7cf5344cba443454f2dd00afe24e29a74e680e2017d69429689ad91b22216c
    contract_hash: 910d594c0cffec58e1da5ca0acf5d4dac792c0fc4490a57276b196aa7374b647
    binding_hash: 95d01e938670208b92aa417f288500568b8036f47ce714eb9c841a931eca3c90
    fingerprint: 42a78af2a00ad0c0ab6ac86e52c420cd3902d805bf4159614b43c4412b6f3ccb
    fingerprint_components:
      contract: 910d594c0cffec58e1da5ca0acf5d4dac792c0fc4490a57276b196aa7374b647
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
      - symbol_id: SYM-proof-claim-binding-verdicts
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
      test_id: TEST-proof-claim-binding-verdicts
      domain:
        symbol_id: SYM-claim-binding-verdicts
        members:
          - derived
          - attested
          - rejected
      results:
        - member: derived
          outcome: passed
        - member: attested
          outcome: passed
        - member: rejected
          outcome: passed
    certificate_digest: fac452acaaaf45855f1a23c3bfc57945cde461fbbe20e2fc9d3048a0c956c9cf
    claim_bindings:
      - claim_key: CLAIM-CE2055482973A026
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-claim-binding-verdicts
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - attested
            - derived
            - rejected
---
Proves that a claim binding verdict shall be derived, attested or rejected, against the code Kibi reads at ingest.