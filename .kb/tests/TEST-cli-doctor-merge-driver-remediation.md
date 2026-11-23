---
title: CLI kibi doctor names only the missing merge driver setup steps
status: passing
priority: must
tags:
  - cli
  - doctor
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-05T11:48:06.065Z'
id: TEST-cli-doctor-merge-driver-remediation
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cli-doctor-merge-driver-remediation-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4cb51d8b3690287a4b3cd7cc
    test_id: TEST-cli-doctor-merge-driver-remediation
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 590e42e2a7d6f8d225609aacd4c0e56510110b623ed13986f9036ad8ea9faf53
    binding_hash: 0804ca92292613241c99b794dcd82ff109a90330a450ffe8b48aac3af5afa11d
    fingerprint: 2c6d5706ca90776ccf38b68d8acf1ef20e8d3f321642eb2fadceda3667346fbd
    fingerprint_components:
      contract: 590e42e2a7d6f8d225609aacd4c0e56510110b623ed13986f9036ad8ea9faf53
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
      - symbol_id: SYM-cli-doctor-merge-driver-remediation-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `kibi doctor` in a temporary Git workspace with symbol records and a pnpm lockfile: without `merge=kibi` lines the remediation names the lines and the driver command; once `.gitattributes` routes the manifests it names only `git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"`; once the driver is set the check reports Configured. Unit tests pin the remediation text for each combination of gaps.