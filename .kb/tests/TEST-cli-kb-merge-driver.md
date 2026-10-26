---
title: KB manifest merge driver behavior and real git merge
status: active
verification_scope: end_to_end
verification_perspective: internal
tags:
  - cli
  - git
  - merge
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-kb-merge-driver
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-kb-merge-driver
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3f7d4a1202fbd3556e271668
    test_id: TEST-cli-kb-merge-driver
    scope: end_to_end
    outcome: passed
    code_snapshot: fd533bf19c861ad8ac8efb75758e48e7ddd616896e097e02d5eeb8945729f8b3
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T23:26:46.216Z'
    finished_at: '2026-10-24T23:26:54.318Z'
    artifact_digest: 7cc22765a9804ba2f6f8cdcbf72bb2e0b4ef879a50be8088f003f7968bab12d2
    contract_hash: b72a52386298f6c288cd3858a212fafb9f94fb19a241a4b643d3f3c830108bc5
    binding_hash: fd4294fc634858343ff85b4abf42f9286ad6d0aaedbb454d4422904bb5d883a3
    fingerprint: 594784d28b2685754b581fdc3bc4c326b2d36e01655866c42d53a334d4a19daf
    fingerprint_components:
      contract: b72a52386298f6c288cd3858a212fafb9f94fb19a241a4b643d3f3c830108bc5
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
      - symbol_id: SYM-test-cli-kb-merge-driver
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
Runs `packages/cli/tests/commands/merge-driver.test.ts`: id-keyed three-way merge cases for `mergeKbManifests` and a real `git merge` that resolves concurrent symbol appends through `kibi merge-driver`, plus the conflict-marker and exit-code path.
