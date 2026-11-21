---
title: An intent claim kind shall be intent, observation or open_question, by an exhaustive proof
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
    - symbol_id: SYM-proof-intent-claim-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-intent-claim-kinds
  proves:
    - CLAIM-1CF6616CDA0B4638
origin:
  kind: agent
  recorded_at: '2026-10-28T19:19:55.320Z'
id: TEST-proof-intent-claim-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7ba15ad0184d229ff1f35877
    test_id: TEST-proof-intent-claim-kinds
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5fd0d2fa5ce2a5b5c77392959da362af30a12c548f9e62de24207b416d2a4f92
    binding_hash: 7c87a949481b5377b9a4b55782b06b15b8392cc56076986fdc3144b2b2afd4d9
    fingerprint: 391ca81672a282c848a5899abd1747bdda81517cf54f74e534e89dfe075c38aa
    fingerprint_components:
      contract: 5fd0d2fa5ce2a5b5c77392959da362af30a12c548f9e62de24207b416d2a4f92
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
      - symbol_id: SYM-proof-intent-claim-kinds
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
      test_id: TEST-proof-intent-claim-kinds
      domain:
        symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-intent-claim-kinds
        members:
          - intent
          - observation
          - open_question
      results:
        - member: intent
          outcome: passed
        - member: observation
          outcome: passed
        - member: open_question
          outcome: passed
    certificate_digest: e6a6fa9c9c14a654ca94e5fc174bf70d0797a0c4a483a975c36c9c44947b8b31
    claim_bindings:
      - claim_key: CLAIM-1CF6616CDA0B4638
        requirement_id: REQ-kibi-knowledge-source-vocabulary
        fact_id: FACT-intent-claim-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - intent
            - observation
            - open_question
---
Proves that an intent claim kind shall be intent, observation or open_question, against the code Kibi reads at ingest.