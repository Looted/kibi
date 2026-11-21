---
title: 'Source proof: kibi-cursor peer dependencies'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:53:42.193Z'
id: TEST-proof-cursor-peer-dependencies
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-peer-dependencies
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/package.json
    path: /peerDependencies
    select: keys
  proves:
    - CLAIM-69509950E9E93838
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-320ed1d4e25901055c7afb9e
    test_id: TEST-proof-cursor-peer-dependencies
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 69ed487df13cfc6694b904d16e1e1e6c7cae4f72077fb2dc565dfabe2e580167
    binding_hash: f97879a1c771829549d2d7aa822c3304a13bbb775774236eda8d3f1bb7a539d1
    fingerprint: a5739c2d936ceb9a1a8c4141dfccee241cbf510e32f72ba7054848e0cb380801
    fingerprint_components:
      contract: 69ed487df13cfc6694b904d16e1e1e6c7cae4f72077fb2dc565dfabe2e580167
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
      - symbol_id: SYM-proof-cursor-peer-dependencies
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
      test_id: TEST-proof-cursor-peer-dependencies
      source:
        reader: json
        file: packages/cursor/package.json
        path: /peerDependencies
        select: keys
      model:
        members:
          - kibi-cli
          - kibi-mcp
    certificate_digest: 9248929c9be2910505e9ed27fe39b28ae7f8b75c50c3fff47ec8267439af1a86
    claim_bindings:
      - claim_key: CLAIM-69509950E9E93838
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-peer-dependencies
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-cli
            - kibi-mcp
          operator: eq
---
Reads the peer dependency names in packages/cursor/package.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
