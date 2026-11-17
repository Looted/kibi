---
title: The proof reuse check decides from committed snapshots before waiting on develop's proof
status: passing
priority: should
tags:
  - ci
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-proof-reuse-decide-before-wait
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:12.537Z'
id: TEST-ci-proof-reuse-decide-before-wait
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bf8007c92d1d294f6ebb4434
    test_id: TEST-ci-proof-reuse-decide-before-wait
    scope: end_to_end
    outcome: passed
    code_snapshot: 0a984815743f3cb024f66865f813584eff4f4d8800d695c80d273b8ae4150885
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T10:51:54.799Z'
    finished_at: '2026-11-17T10:51:59.596Z'
    artifact_digest: 545590ca06d35a41b6bcb4e90ad5b392dabbc17351e3190de31f93784dc7cf95
    contract_hash: 6af21dade8f52c701715b3c8f2e9a9c0d9273d3ca5c32b4473eaf2a656c46906
    binding_hash: 48d8dd23975e51ec9a03df24401e674e3beefca9b266fe882d77898d1b97c6b7
    fingerprint: 2cf6c0fea9921ab6e9dba71f2faa6bc941d482b0a9bd0bf49724b9af8ed88906
    fingerprint_components:
      contract: 6af21dade8f52c701715b3c8f2e9a9c0d9273d3ca5c32b4473eaf2a656c46906
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
      - symbol_id: SYM-test-ci-proof-reuse-decide-before-wait
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the reuse check's command line against real git repositories and a fake GitHub CLI: a merge whose committed snapshot differs from the proven commit's gets an execute decision with no GitHub lookup and leaves no scratch worktree, a matching tree still waits for develop's proof, and a shallow checkout fetches the proven commit first.