---
id: TEST-001
title: kibi init creates .kb/ directory structure
status: passing
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - init
  - unit
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-workflows
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-735a74cc4810c887ba55dd8c
    test_id: TEST-001
    scope: end_to_end
    outcome: passed
    code_snapshot: 087a2518414febd6b7fb103b85e4f25d9015549de2dbc345361b11d301fc6e8e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:26:55.143Z'
    finished_at: '2026-11-10T15:28:26.816Z'
    artifact_digest: a6f904a9a8960e8ded7de2f01fd093c736ac83d9019318899b64378c2e7326cf
    contract_hash: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
    binding_hash: 1e392cc3828545b0d4881f50fc8da8b66138836013e2bb1f89d17f9c1ca3d0d9
    fingerprint: 5802a43cc4640a02573b20e676f828c1d5e5aff77b3354c3d78855fbba53e8ae
    fingerprint_components:
      contract: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
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
      - symbol_id: SYM-e2e-cli-workflows
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Validates that `kibi init` creates `.kb/config.json`, `.kb/schema/`, and
`.kb/branches/main/` in a temp directory. Asserts all three paths exist and
`config.json` is valid JSON with a `paths` object.
