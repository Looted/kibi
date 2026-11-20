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
    receipt_id: PR-3aa676e80e738bfe96bfb5c0
    test_id: TEST-proof-adr-unlinked-review-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e289ac4fed17962f015322d4215867d1af9fe7e83db58de93dcca7e92143ee42
    binding_hash: 229b040900a1e69d826e49b5e83425fd20c7bab4a8bc090e15e7e7d238f871d7
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
        requirement_id: REQ-kibi-lifecycle-review-codes
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