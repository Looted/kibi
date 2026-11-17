---
title: Kibi's CI workflows report one aggregate check each and run the search gates before proof
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
    - symbol_id: SYM-test-ci-required-checks-workflow-contract
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:13.501Z'
id: TEST-ci-required-checks-workflow-contract
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ea295679f0e5537bf34b181b
    test_id: TEST-ci-required-checks-workflow-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 0a984815743f3cb024f66865f813584eff4f4d8800d695c80d273b8ae4150885
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T10:52:01.773Z'
    finished_at: '2026-11-17T10:52:01.857Z'
    artifact_digest: 502e57b06eacafc3b59c4318acad5ce072d8fb361d86db22f2b7191e617ed025
    contract_hash: 7d940f37cd71f28694d8d9a000079df025ed4aa1649757437b7bca94743131e1
    binding_hash: eea41e813865bdad85259da742f70cb0822eb4c4815a28e4de6e7066f7257553
    fingerprint: d0c39b8ea8803613910a805775e4169fa416eb1562709dfbdbc738cbb516ec6d
    fingerprint_components:
      contract: 7d940f37cd71f28694d8d9a000079df025ed4aa1649757437b7bca94743131e1
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
      - symbol_id: SYM-test-ci-required-checks-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Reads ci.yml and proof.yml: each aggregate job needs every other job, always runs and its script fails on a failed, skipped or cancelled result and passes when all succeed; the two kb_search gold-set gates sit between the KB sync and kibi prove --all.