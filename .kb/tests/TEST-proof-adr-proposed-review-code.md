---
title: The proposed ADR review code shall be review_adr_proposed, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-adr-proposed-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-ADR_PROPOSED_REVIEW_CODE
  proves:
    - CLAIM-C3EEAB6C1BBB59F7
origin:
  kind: agent
  recorded_at: '2026-10-28T17:25:45.920Z'
id: TEST-proof-adr-proposed-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7080743a47b5166cbdcb7acf
    test_id: TEST-proof-adr-proposed-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 4e35bbf6a7bf0311bb53f3b5f9c8bd221b3b307286ec9291bc3022c8496386bc
    binding_hash: 78a56af1c0b486bf63dd7883b0b7bfe4aecd5e7e5bc3ba0cf796678b45eb93fe
    fingerprint: 22918f106f623e520f5e315ac6d4e3e219d012616ec432c49abf893858e742f0
    fingerprint_components:
      contract: 4e35bbf6a7bf0311bb53f3b5f9c8bd221b3b307286ec9291bc3022c8496386bc
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
      - symbol_id: SYM-proof-adr-proposed-review-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-adr-proposed-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-ADR_PROPOSED_REVIEW_CODE
        type: string
        value: review_adr_proposed
    certificate_digest: 82bde39f1d94dbaafaec5a600471eef106e6cff2d9f7eb69cd336bf14637b918
    claim_bindings:
      - claim_key: CLAIM-C3EEAB6C1BBB59F7
        requirement_id: REQ-kibi-lifecycle-review-codes
        fact_id: FACT-adr-proposed-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_adr_proposed
---
Proves that the proposed ADR review code shall be review_adr_proposed, against the code Kibi reads at ingest.