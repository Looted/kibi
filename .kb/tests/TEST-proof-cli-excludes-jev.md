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
    receipt_id: PR-033f8e1bd1659f210e22cf19
    test_id: TEST-proof-cli-excludes-jev
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: aafe31d87ccd148dc3ae0d98cdb0a4e1c45aea5f7827144276bcd8a5097241ea
    binding_hash: 8504031d867e767d5db949834f73a71e9c5ed75d4d1336ed08cebadd15e41a28
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
          - kibi-agent-core
          - kibi-core
          - kibi-plugin-builtin
          - kibi-plugin-sdk
          - kibi-swipl
          - saxes
          - yaml
    certificate_digest: 46e9241eb3e0c7e779b6eaccf62f1f46a9b86911428bfbbd7539dbc4f9525848
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