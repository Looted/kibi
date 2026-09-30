---
title: 'Packed e2e: harness-independent Kibi env bootstrap'
status: active
tags:
  - env
  - bootstrap
  - e2e
  - packed
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-env-bootstrap
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-kibi-env-bootstrap
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e21a1c24c2229e61c62e61b3
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 4c9397126af225c64a080a69a1e365ad33383072729e7f96e6cbf04206fe84f8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-23T15:17:39.511Z'
    finished_at: '2026-09-23T15:19:07.582Z'
    artifact_digest: c7cb60192231a1df82456fd82b3286cfdeab788a4d59fcc9f3c60edf51fb2a66
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a2e212316ce133cda129e833
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 1ac23b799fd9d689c50a315ed4fe92d5c7925122c9a20ffca0645c3f3c88ae73
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-23T16:13:41.077Z'
    finished_at: '2026-09-23T16:15:16.487Z'
    artifact_digest: 48aca1a77fb2dd303ea694f13911002f72bbb336137d109a2223b695bb99bdec
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-14d0b57a0b8575437cc3c89b
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1c584d3294231a1b4adb8d92
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-329ccc84bc1aa964700a82a8
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2ba169aacafb434dec1b6c80
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: failed
    code_snapshot: 17d26c6bf27a3e5fa42113f021bf2b250140851aea8a51dcb29e71ea85465ffc
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:09:39.572Z'
    finished_at: '2026-09-26T11:26:46.912Z'
    artifact_digest: 5e15c583ed601b53256856b0f62aa348fec3a03cc76f327007241136eff85214
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2feaf66ddd8b8ccc58da3ff5
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: a20108970eddbe026c332f8f0fef6001fa956bf246b5dee956c8c7586f878071
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:43:16.296Z'
    finished_at: '2026-09-26T11:59:41.121Z'
    artifact_digest: b458ebe1ef850179dd754bc08eb0a62bb0e46b7bbf068e00bb4230915cc296ed
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-523dc655ca51d0bd21dacd8d
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: de201a2dd0c317058bd0fb2437de496eaadfbdd3e21c3fd432d77169cc672e2e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T12:51:30.031Z'
    finished_at: '2026-09-26T13:07:42.195Z'
    artifact_digest: c9cece4a6c8412af4af92cf82807f3850d2b801045aacf7d48830d68278a660f
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0d646754baf1405b62ced2c5
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 5b48c0a3883b7536cf6deb6ced03e3127349d55dfa5b78fcd7466dcabb3b1d46
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T23:50:31.951Z'
    finished_at: '2026-09-27T00:15:04.234Z'
    artifact_digest: 9641e1263e8cbd4aec2a63cf924f78c694de2fa481b3e6b278d288dc964e768b
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1f48824703ab7419bf9a1ea7
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: edf31aeb17bae9696cd9be1db2cfdab1162934903a40aff8334d03e84edd5872
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T09:58:13.375Z'
    finished_at: '2026-09-27T10:21:29.406Z'
    artifact_digest: 601f3dfdaa45bbef34f649d3ddd7d3e53a7dc2ba372aa80398ec1e1a58170f59
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-32a7b9f5a596a1b8f94939b1
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 1c7fc342e7e2f6dde52ad4d4bfb3dccda5184f524d128ad26d3d6aa8928b80df
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T15:30:37.315Z'
    finished_at: '2026-09-27T16:09:53.858Z'
    artifact_digest: cab9ee9d09f579ccae00bea019b0266d72e41c24a37e65651b84956de238bb61
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: 45ec37e52174b9f1811c45cd5fcccd3d3d9d69e175bac1fd9d3a4dadf902965a
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e600d6c70af89af563323e5d
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d2237db9cb9df68ce5a43a5ebb63dbe6b70f66b617d7ffa68d33c708da3cf9f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T22:29:15.770Z'
    finished_at: '2026-09-27T23:18:57.015Z'
    artifact_digest: 63668ccae6cd3a610be243d571de8e94f160e26926e4fd9f926a702b3a19dd3e
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: 45ec37e52174b9f1811c45cd5fcccd3d3d9d69e175bac1fd9d3a4dadf902965a
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-25734a234f9f8ee7c38421d0
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: 45ec37e52174b9f1811c45cd5fcccd3d3d9d69e175bac1fd9d3a4dadf902965a
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-569dc3e130250518b39d24d9
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: 45ec37e52174b9f1811c45cd5fcccd3d3d9d69e175bac1fd9d3a4dadf902965a
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-29524d28dc8628a8f4e5bbe5
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: e6dce889e04133dddde5bb152ef08004d729e8222131fac883e8471d1b0c9373
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-748fbd9f9f96839a56a064b0
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: c68c59386a65bbc45eb7bab369c18e7a1fd56877b18b15aa78215c1841cd5dc4
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d437bdfd8bb758df2ebc7806
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: c68c59386a65bbc45eb7bab369c18e7a1fd56877b18b15aa78215c1841cd5dc4
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9b7ed046a2bfdcd2ae66827a
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: c68c59386a65bbc45eb7bab369c18e7a1fd56877b18b15aa78215c1841cd5dc4
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b79c8fc521224f86a6cf2a9f
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: c68c59386a65bbc45eb7bab369c18e7a1fd56877b18b15aa78215c1841cd5dc4
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0e95bcd893760a7e681f504f
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: c68c59386a65bbc45eb7bab369c18e7a1fd56877b18b15aa78215c1841cd5dc4
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# TEST-e2e-kibi-env-bootstrap

Packed consumer e2e for harness-independent env bootstrap: process wins over project `.env.kibi`, blank values stay unset (user wins), and `KIBI_WORKSPACE` overrides cwd for workspace resolution via `kibi-runtime`.
