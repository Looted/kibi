---
title: Plan apply migrates an attached legacy branch store only under its approved preview
status: pending
priority: must
tags:
  - branching
  - migration
  - mcp
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-legacy-attachment-apply-migration
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-14T12:00:00.000Z'
id: TEST-kibi-legacy-attachment-apply-migration
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-00a4dbf3a5100ec60db38b5b
    test_id: TEST-kibi-legacy-attachment-apply-migration
    scope: end_to_end
    outcome: passed
    code_snapshot: ac4149e63b8ab95e0be33eadc4067d6553a1c0295848d566409b59a1a309cf06
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T07:48:46.417Z'
    finished_at: '2026-11-15T07:50:01.298Z'
    artifact_digest: c1d4d8a86234db060394e4835fb78a5c292c10b4565f91c4c5afb64d986583ed
    contract_hash: f7b06691934d83b64e987e9c7eeeb0dc7159bd0b554956de82f0eab17e02a777
    binding_hash: e32aed8e5688b270384cb9f7f7ca8afd6f5795b6ba7d6fe9c10b7a36740e43b3
    fingerprint: 6404a2e030005ac25cd06c74bd1a2daf664cb2c4678a509972a9342211a42e93
    fingerprint_components:
      contract: f7b06691934d83b64e987e9c7eeeb0dc7159bd0b554956de82f0eab17e02a777
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
      - symbol_id: SYM-e2e-test-kibi-legacy-attachment-apply-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/legacy-attachment-apply.test.ts: through the installed kibi-mcp server it renames a synced store to the legacy literal path, then checks that kb_apply_plan refuses a plan without the legacy migration, refuses a preview made before the store changed, and applies the approved migration first so kb_status attaches the hashed store fresh.