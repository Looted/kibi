---
title: The unlinked ADR review code shall be review_adr_unlinked, by a regex proof
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
    - symbol_id: SYM-proof-adr-unlinked-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-ADR_UNLINKED_REVIEW_CODE
  proves:
    - CLAIM-38F792CCEE6129F9
origin:
  kind: agent
  recorded_at: '2026-10-28T17:26:07.080Z'
id: TEST-proof-adr-unlinked-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2596369743b591c3fb8ac80e
    test_id: TEST-proof-adr-unlinked-review-code
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:30:26.292Z'
    finished_at: '2026-10-28T17:30:26.416Z'
    artifact_digest: ced7569015bf6488337a95a6dde27fb30eee4bbb44e8ee9512826ca2ad93578f
    contract_hash: e289ac4fed17962f015322d4215867d1af9fe7e83db58de93dcca7e92143ee42
    binding_hash: fd9c659e551266f8791b5659f61ac50222b10ae409bc5061aa33203b4ea7e93e
    fingerprint: 64334923d8f45e62c4826bf2db7677ce8efcc6dd8e9422f1e828b69376233da6
    fingerprint_components:
      contract: e289ac4fed17962f015322d4215867d1af9fe7e83db58de93dcca7e92143ee42
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
      - symbol_id: SYM-proof-adr-unlinked-review-code
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
      test_id: TEST-proof-adr-unlinked-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-ADR_UNLINKED_REVIEW_CODE
        type: string
        value: review_adr_unlinked
    certificate_digest: eefdc3f9f560dff2d12e26b64d6812d1f9d7273fc5e6712c6275ac7345feb13e
    claim_bindings:
      - claim_key: CLAIM-38F792CCEE6129F9
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-adr-unlinked-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_adr_unlinked
---
Proves that the unlinked ADR review code shall be review_adr_unlinked, against the code Kibi reads at ingest.