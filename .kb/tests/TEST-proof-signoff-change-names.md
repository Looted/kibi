---
title: A signoff change shall be new, changed, affected or retired, by an exhaustive proof
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
    - symbol_id: SYM-proof-signoff-change-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-signoff-model-signoff-change-labels
  proves:
    - CLAIM-B8B22A3C064D6B6B
origin:
  kind: agent
  recorded_at: '2026-10-28T22:22:02.645Z'
id: TEST-proof-signoff-change-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0dd822b3910bfeec7b3c0bf4
    test_id: TEST-proof-signoff-change-names
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:26:34.918Z'
    finished_at: '2026-10-28T22:26:35.046Z'
    artifact_digest: 348cbb9151a875e1e71a5fdfb7b72d86a5d0c0f43c6184a8ee034e5293fb64be
    contract_hash: d38962e5661b49911f05f04c4a14e97df1a73d5aecc1df173448f1d081011acf
    binding_hash: 7e3c18e90619b16da8b5061b22c000549ff8275e62e84dd089249e12b8692f48
    fingerprint: 45e13fc932b1af4769078b47b44e8fcc6b0d1927ee011a8811ae9ea5d46a949e
    fingerprint_components:
      contract: d38962e5661b49911f05f04c4a14e97df1a73d5aecc1df173448f1d081011acf
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
      - symbol_id: SYM-proof-signoff-change-names
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
      test_id: TEST-proof-signoff-change-names
      domain:
        symbol_id: SYM-cli-signoff-model-signoff-change-labels
        members:
          - new
          - changed
          - affected
          - retired
      results:
        - member: new
          outcome: passed
        - member: changed
          outcome: passed
        - member: affected
          outcome: passed
        - member: retired
          outcome: passed
    certificate_digest: 343171dd519e9d0cce2e7703bb15e1478e5381b52911f8f0fabc3283fdef13ad
    claim_bindings:
      - claim_key: CLAIM-B8B22A3C064D6B6B
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-change-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - affected
            - changed
            - new
            - retired
---
Proves that a signoff change shall be new, changed, affected or retired, against the code Kibi reads at ingest.