---
id: TEST-prolog-library-adoption-mcp
title: MCP remote SPARQL handler validation tests
status: passing
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
source: packages/mcp/tests/tools/sparql.test.ts
tags:
  - mcp
  - sparql
  - security
  - unit
links:
  - type: validates
    target: SCEN-prolog-library-adoption
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-prolog-library-adoption-mcp
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e061bdb8e1768c663fff0b4a
    test_id: TEST-prolog-library-adoption-mcp
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 5985c323d9921120505a728904b7fc1c507150c5661ff2cfad5330e524323efb
    binding_hash: 34a80b57d153b3badb860cd767f2ae0ae8f4c63d9d6c8d1f1d86cd415beec3d1
    fingerprint: c9ef417ac71d7728cf592ce304f85973b805a1c10eb0fc64a7384d2e91c08708
    fingerprint_components:
      contract: 5985c323d9921120505a728904b7fc1c507150c5661ff2cfad5330e524323efb
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
      - symbol_id: SYM-unit-test-prolog-library-adoption-mcp
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Verification covers argument validation, public remote endpoint restrictions, SELECT-only query enforcement, Prolog query construction, structured MCP responses, and error wrapping for `kb_sparql_remote`.
