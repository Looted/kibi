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
    receipt_id: PR-653e8e1d164bccf449a17abe
    test_id: TEST-proof-claim-binding-verdicts
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 910d594c0cffec58e1da5ca0acf5d4dac792c0fc4490a57276b196aa7374b647
    binding_hash: be095ee5956f8cf65e18b180feca92bab60ffa1d1371632b6bfb9ec4a0eb9ab7
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