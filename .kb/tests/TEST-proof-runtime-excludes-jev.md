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
    receipt_id: PR-04a6d84f598f4039a3827683
    test_id: TEST-proof-runtime-excludes-jev
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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