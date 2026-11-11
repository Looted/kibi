---
title: Packed CLI exposes the current KB schema version
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-schema-version-surface
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-schema-version-surface
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-661204200275adbd61647e19
    test_id: TEST-e2e-schema-version-surface
    scope: end_to_end
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: 917d8c0d204f88993958886f633f0a9421e6c2d89e444e5124e76423ae7487b7
    binding_hash: c0b74ebb63cdc2a50bf3505045cad154430be36519074160339d2b5af42db29b
    fingerprint: 1ec9d10fa085b0d11545b0706b906c620c3737ddaa7ff3ce2602598d94ed1c8a
    fingerprint_components:
      contract: 917d8c0d204f88993958886f633f0a9421e6c2d89e444e5124e76423ae7487b7
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
      - symbol_id: SYM-e2e-test-cli-schema-version-surface
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

Packed end-to-end regression for packed cli exposes the current kb schema version.
