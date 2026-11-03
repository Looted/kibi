---
title: kibi sync asserts a front-matter relationship once its missing target is added
status: passing
tags:
  - cli
  - sync
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-sync-relationship-retry
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the fixes from the requirements-to-code audit, including retrying relationships sync could not assert: "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:17:44.092Z'
id: TEST-sync-relationship-retry
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-63954f8b277b674f8df5e400
    test_id: TEST-sync-relationship-retry
    scope: end_to_end
    outcome: passed
    code_snapshot: e7f999fd2cafc0023a3df6ba4d5dcd981ed959ec2970bf0988c8b053c5531965
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T11:23:12.864Z'
    finished_at: '2026-11-03T11:23:16.506Z'
    artifact_digest: 04764b67fb734900e18516920adeb38c73356ca1bac4197a2cd9f70d625b7407
    contract_hash: 49fd050f6fb77a538822e1889967826872dcc4b00ef70d7ad6b7111296047d2d
    binding_hash: 97b2ddd4695f8c5a994dd3d31b5adc9af4fdfbca0dcb89817773a69c4e075803
    fingerprint: e9bf5dc770f8cd59ebe2fb20bcd97a462380f7e094a1326386b4199ac05b26cd
    fingerprint_components:
      contract: 49fd050f6fb77a538822e1889967826872dcc4b00ef70d7ad6b7111296047d2d
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
      - symbol_id: SYM-test-sync-relationship-retry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the built kibi CLI in a fresh Git repository: a scenario links to a scenario that does not exist, sync reports the failed relationship, the target is added alone, and the next sync asserts the link (kibi query shows it) while a further sync imports nothing. It would pass falsely only if the first sync already asserted the link, which the failure message check rules out.