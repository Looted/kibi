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
    receipt_id: PR-e4113c272749f56aabd4ee8f
    test_id: TEST-proof-kb-upsert-related-requirements-cap
    scope: unit
    outcome: passed
    code_snapshot: 1b40b260cab6097181efa0040df0b9303eb0edcd700924ba5d4b5dab6def025b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T08:55:12.664Z'
    finished_at: '2026-11-17T08:55:22.592Z'
    artifact_digest: 82b2fd8f4e312bbb3114eba6cfd262a57158353c5ef65cb6ed6e2202caeaa8b5
    contract_hash: ede966f9af824d942e2f529e4ccce20c71371f3a9e5fd2e8a57d802339bafc75
    binding_hash: ec932b6af4b3eff2b8a9b0d79456b515c4d6a63d9b8aff01e9e6a501801af23c
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