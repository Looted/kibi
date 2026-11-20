---
title: The kibi-runtime package dependencies shall exclude kibi-plugin-jev, by a source proof
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
    - symbol_id: SYM-proof-runtime-excludes-jev
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/runtime/package.json
    path: /dependencies
    select: keys
  proves:
    - CLAIM-3A89EF7214DE03AB
origin:
  kind: agent
  recorded_at: '2026-10-28T10:17:50.797Z'
id: TEST-proof-runtime-excludes-jev
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ea6c63963a2b5d7d6cfd6963
    test_id: TEST-proof-runtime-excludes-jev
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 2e65814399188f3c6edbb9f87bfa44108e237b9beeb8c72e756aa5bbacd2a517
    binding_hash: 6bbd407c6e3973fa14243df23beea042fed23bff98207f73811dd2e77cb634e0
    fingerprint: 8c40af1c9de57ccd61a43f690115bab3d0e4e5bf483a8a3913ed5774e300cbad
    fingerprint_components:
      contract: 2e65814399188f3c6edbb9f87bfa44108e237b9beeb8c72e756aa5bbacd2a517
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
      - symbol_id: SYM-proof-runtime-excludes-jev
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
      test_id: TEST-proof-runtime-excludes-jev
      source:
        reader: json
        file: packages/runtime/package.json
        path: /dependencies
        select: keys
      model:
        members:
          - gray-matter
          - kibi-core
          - kibi-plugin-builtin
          - kibi-swipl
    certificate_digest: f12373ce7b9389538692a27846e289fdc6ed589b84e0b84ec96fc047a7f6fe41
    claim_bindings:
      - claim_key: CLAIM-3A89EF7214DE03AB
        requirement_id: REQ-capability-plugin-jev-optional-dependency
        fact_id: FACT-runtime-excludes-jev
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-plugin-jev
          operator: excludes
---
Proves that the kibi-runtime package dependencies shall exclude kibi-plugin-jev, against the file Kibi reads at ingest.