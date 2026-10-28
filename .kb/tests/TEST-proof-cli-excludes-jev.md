---
title: The kibi-cli package dependencies shall exclude kibi-plugin-jev, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cli-excludes-jev
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cli/package.json
    path: /dependencies
    select: keys
  proves:
    - CLAIM-5D1C017C0416B115
origin:
  kind: agent
  recorded_at: '2026-10-28T10:17:39.823Z'
id: TEST-proof-cli-excludes-jev
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee1afcb79c4b937ac02afada
    test_id: TEST-proof-cli-excludes-jev
    scope: unit
    outcome: passed
    code_snapshot: bdaf6778db7b4bd8038f4810e2f16d71b67f6fcfa8bc512d4e83a235f1b5b5c5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:26:41.910Z'
    finished_at: '2026-10-28T10:26:42.028Z'
    artifact_digest: e7d3f0c37a59c53d061e58f59942da4d016e735784b91288fec8d509e7ae36a8
    contract_hash: aafe31d87ccd148dc3ae0d98cdb0a4e1c45aea5f7827144276bcd8a5097241ea
    binding_hash: 0ac7d8f7c00e3f1c8170ffb68b83975a139d79db7bb3f532c67dcbcb83ccfd13
    fingerprint: 55b4b84217a9274d82bb159cab419a6f1b0be797150c1fb228c07f9acbe5f129
    fingerprint_components:
      contract: aafe31d87ccd148dc3ae0d98cdb0a4e1c45aea5f7827144276bcd8a5097241ea
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
      - symbol_id: SYM-proof-cli-excludes-jev
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cli-excludes-jev
      source:
        reader: json
        file: packages/cli/package.json
        path: /dependencies
        select: keys
      model:
        members:
          - ajv
          - cli-table3
          - commander
          - fast-glob
          - gray-matter
          - ignore
          - js-yaml
          - kibi-core
          - kibi-plugin-builtin
          - kibi-plugin-sdk
          - kibi-swipl
          - saxes
          - yaml
    certificate_digest: 3a1d26d146181673cdca5ea8f2321be6bd0ae6341bcc50de8a4483d67bbe6530
    claim_bindings:
      - claim_key: CLAIM-5D1C017C0416B115
        requirement_id: REQ-capability-plugin-jev-optional-dependency
        fact_id: FACT-cli-excludes-jev
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-plugin-jev
          operator: excludes
---
Proves that the kibi-cli package dependencies shall exclude kibi-plugin-jev, against the file Kibi reads at ingest.