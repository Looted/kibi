---
title: kb_upsert capture with why tests
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - kb_upsert
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-capture-with-why
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T16:17:30.686Z'
id: TEST-kb-upsert-capture-with-why
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1658d75a432c3fcbb11ae56b
    test_id: TEST-kb-upsert-capture-with-why
    scope: end_to_end
    outcome: passed
    code_snapshot: 365c3f4fec36f6d3e4da061b45917b669a9f63c1b24a7bb1e57719c531c25cb6
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T22:11:07.471Z'
    finished_at: '2026-11-16T22:11:14.204Z'
    artifact_digest: 4e4b1412b775aed80d2ca4392f5fd24759d5cf982a394a3804ee989f965e57ab
    contract_hash: e3a1e8977ba75f24bc5a4c7967629ffde2830d30c2601a80c4e8d9968f6b810e
    binding_hash: 4bd843cb7e4a0e1ae16e6b44c55188b458b6434edab90b9252f92722b35cbffc
    fingerprint: 3a131a21177955cd5f0aaec572bc916dcdabd6bb755b72c28c0bc15040ef3ed6
    fingerprint_components:
      contract: e3a1e8977ba75f24bc5a4c7967629ffde2830d30c2601a80c4e8d9968f6b810e
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
      - symbol_id: SYM-test-kb-upsert-capture-with-why
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The capture unit tests and a consumer workspace run of the CLI: a requirement written with a statement body, why and origin.ref records its rationale, Context, Source and semantic_text; its result lists the steps kb_check still needs as nextActions, each accepted by kb_upsert once its placeholders are filled, and the current requirements on the same terms, at most five.