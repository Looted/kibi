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
    receipt_id: PR-f5fe79974e7d1542c5ffa8a3
    test_id: TEST-proof-claim-binding-verdicts
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:03.034Z'
    finished_at: '2026-11-16T12:24:32.903Z'
    artifact_digest: 1bbb6b9d182a9bfb24ff6904410f4b4360b68d3d7cb4e22c1a4598f12fc5a58f
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