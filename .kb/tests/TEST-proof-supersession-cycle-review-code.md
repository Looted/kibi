---
title: The supersession cycle review code shall be review_supersession_cycle, by a regex proof
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
    - symbol_id: SYM-proof-supersession-cycle-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SUPERSESSION_CYCLE_REVIEW_CODE
  proves:
    - CLAIM-B26CCE9856ABAD66
origin:
  kind: agent
  recorded_at: '2026-10-28T17:27:10.300Z'
id: TEST-proof-supersession-cycle-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-702f2b15210177ec7e0a8ca7
    test_id: TEST-proof-supersession-cycle-review-code
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:30:44.719Z'
    finished_at: '2026-10-28T17:30:44.871Z'
    artifact_digest: 41ae0f7166c9f765abce2e5420b78cd254c1838f3651002d345b920c178fded7
    contract_hash: 005ddec32e342e8e141e95036f2e03a0a0f8609f6924689fbfcdb500ba96b518
    binding_hash: e3a794e49d81ec40b09847477df3c24151ce64f0183b8cdbd5b3a507787dbd88
    fingerprint: 4894c81f3542b57d7538458f57288b86e3ddbb5ec1b89cdc5ad9c4f537a7bf6c
    fingerprint_components:
      contract: 005ddec32e342e8e141e95036f2e03a0a0f8609f6924689fbfcdb500ba96b518
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
      - symbol_id: SYM-proof-supersession-cycle-review-code
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
      test_id: TEST-proof-supersession-cycle-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-SUPERSESSION_CYCLE_REVIEW_CODE
        type: string
        value: review_supersession_cycle
    certificate_digest: 298aca7880a2c6e46690758e582ac5ad502ae168c76fa9ef9d55d6e95c7bb77e
    claim_bindings:
      - claim_key: CLAIM-B26CCE9856ABAD66
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-supersession-cycle-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_supersession_cycle
---
Proves that the supersession cycle review code shall be review_supersession_cycle, against the code Kibi reads at ingest.