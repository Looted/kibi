---
title: Installed staged impact review, generated coordinate migration and trusted aggregate gate lifecycle
status: active
tags:
  - multilingual
  - impact-policy
  - stage-e
  - e2e
  - consumer
text_ref: documentation/tests/e2e/packed/impact-review-stage-e.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
    target: default
    native_id: documentation/tests/e2e/packed/impact-review-stage-e.test.ts::keeps exact staged and trusted-diff impact evidence through ownership repair and canonical receipt append
id: TEST-impact-policy-stage-e-installed-e2e
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a2f72d71de74852337c55907
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: 60d497c30e4fc41530fd9ae75e4bfb5175c63a77e86423b482e829b70f4db692
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f568ffa035494f692189d852
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: 8f58af1e0123478c41604e8700183bc37b396632b00f5d8b77ed581698fe1973
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-eaf415de2492e1172bd5d16b
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: 05e2391058ec6b8ea50d4132172881df6be6b9626b32f29c2ff80f98d26d0131
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c3c2c5f388efc939c8946342
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: 155f2b863ff09dba66e5e9f9571677ab4e4bb5c945021f095c1f318e93da28d1
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d547397899f092684a2c1e2e
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: 155f2b863ff09dba66e5e9f9571677ab4e4bb5c945021f095c1f318e93da28d1
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2f2a62d9007b3c49346934b0
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: d09f23835065b9eb83904adac8f95a500d6183513ebfd8331f540fee5ffd846e
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-07bd3062d618a71fae48ab58
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: d09f23835065b9eb83904adac8f95a500d6183513ebfd8331f540fee5ffd846e
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9356ef52d26830abbe0c7ce5
    test_id: TEST-impact-policy-stage-e-installed-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
    binding_hash: cb2458a24f8337b5dea7907e123eb9ec79af4b061a64c13b13d35c0e8577c0e6
    fingerprint: 707a71967bb43296116fef56f996bdb2bc0f728c88acfe5c1812b6cf3415d654
    fingerprint_components:
      contract: c2eb1035aa4e92933096678876e955f9a13300287f2cfecd6b5ba038aaed6454
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 9fc05c59a76931e7ce7f29b298bd5294cbbc85d635016f87330380c8bdc399fe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-impact-stage-e-runinstalledimpactpolicye2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
