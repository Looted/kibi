---
title: An empty knowledge base adds kb_plan_bootstrap and kb_apply_plan to the core profile
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-mcp-bootstrap-tools
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T22:37:51.875Z'
id: TEST-proof-mcp-bootstrap-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-16976162ec20e96074d7f806
    test_id: TEST-proof-mcp-bootstrap-tools
    scope: unit
    outcome: passed
    code_snapshot: bf728393848d8d041bb9f4f7426a9989adf51075b0700112dffd0fb3e965a69e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T18:50:43.658Z'
    finished_at: '2026-11-17T18:50:56.400Z'
    artifact_digest: 0dd89fba0e87fd074e05f7546ce0b1789adf24cd3623664838b77c818cdb87fb
    contract_hash: 84899f70b2680de01c7e241745f1f11fc2d638f7c270cefb556ce0346ed0d76a
    binding_hash: 0fcbbe651c618daa1d8c9399b40c8e33d932f206673cfd7bc9809866c312db9d
    fingerprint: c27921ab52523b20cf73e84d360a940b329792f3823173e9f2bf0dcab84f31e8
    fingerprint_components:
      contract: 84899f70b2680de01c7e241745f1f11fc2d638f7c270cefb556ce0346ed0d76a
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
      - symbol_id: SYM-proof-mcp-bootstrap-tools
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Proves that the default profile adds exactly kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity, against BOOTSTRAP_TOOLS as Kibi reads it at ingest.