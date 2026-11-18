---
title: A requirement write lists at most 5 related current requirements, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-kb-upsert-related-requirements-cap
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-capture-max-related-requirements
  proves:
    - CLAIM-318577AE3ADA2EF5
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0d2cc1a15da8ddcbe15e4092
    test_id: TEST-proof-kb-upsert-related-requirements-cap
    scope: unit
    outcome: passed
    code_snapshot: 2267f060b15b00eb168542778049bc4ef0fa3dafa539d836484d212cdb25a688
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T19:07:42.370Z'
    finished_at: '2026-11-17T19:07:50.547Z'
    artifact_digest: 35a293482b76e6485593c45a4f69db896a3065ed0aa5be50cf5c646fc06cbb17
    contract_hash: ede966f9af824d942e2f529e4ccce20c71371f3a9e5fd2e8a57d802339bafc75
    binding_hash: bfec86f886c649acd01125b96cfaf392f78916e4ea670a3a0ae2ce8d9c6fd659
    fingerprint: 329ec2b039529bf53e78141493c178140ce21d15f213493f69328967c04379c5
    fingerprint_components:
      contract: ede966f9af824d942e2f529e4ccce20c71371f3a9e5fd2e8a57d802339bafc75
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
      - symbol_id: SYM-proof-kb-upsert-related-requirements-cap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-kb-upsert-related-requirements-cap
      variable: related_current_requirements_listed_max
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: lte
        value: 5
    certificate_digest: 41c70dfd4092f7b59375a023b89c5d08d8de71724fa7d602c76944be2258efee
    claim_bindings:
      - claim_key: CLAIM-318577AE3ADA2EF5
        requirement_id: REQ-kb-upsert-related-current-requirements
        fact_id: FACT-kb-upsert-related-requirements-cap
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: lte
          value: 5
          value_type: int
          variable: related_current_requirements_listed_max
origin:
  kind: agent
  recorded_at: '2026-11-17T08:28:23.664Z'
id: TEST-proof-kb-upsert-related-requirements-cap
type: test
---
Proves that a requirement kb_upsert lists at most 5 related current requirements, against the MAX_RELATED_REQUIREMENTS constant Kibi reads at ingest.