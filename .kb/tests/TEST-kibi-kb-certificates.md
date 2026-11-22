---
title: Knowledge-base certificates in kibi check through the packed CLI
status: passing
tags:
  - proof
  - check
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-kb-certificates
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-23T14:07:36.626Z'
id: TEST-kibi-kb-certificates
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d9d2c67e11e6cad21a09ef71
    test_id: TEST-kibi-kb-certificates
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: da3c96aa44a2ccc63b8bb84944b1502a2af8be2d441d831e81ea57293d943669
    binding_hash: a089fd1191acb385aaeecd7b91e1b39c8c55949568d2e36e68fd29550fd862a3
    fingerprint: b5a63a1704a60a41d39a24a0818abcf235854e5f4a05de74b64bef489d2d4a7d
    fingerprint_components:
      contract: da3c96aa44a2ccc63b8bb84944b1502a2af8be2d441d831e81ea57293d943669
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
      - symbol_id: SYM-e2e-packed-kb-certificates
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository with property facts and checks the kb-consistency rule end to end: consistent bounds pass kibi check, a saved bundle with a broken model is rejected by kibi check --certificates with the fact it breaks and exit 1, and four bounds that only contradict together are a blocking kb-consistency violation with a core of all four facts that kibi check --staged also blocks.