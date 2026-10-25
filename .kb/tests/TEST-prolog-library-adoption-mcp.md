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
    receipt_id: PR-b9e91b840c0a4adad9f8e200
    test_id: TEST-prolog-library-adoption-mcp
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:28:23.242Z'
    finished_at: '2026-10-25T12:28:23.541Z'
    artifact_digest: bd761abe71ed7d77b75e6d93225eeb0634bb913870cb970b15bb8b61603f2c6c
    contract_hash: 5985c323d9921120505a728904b7fc1c507150c5661ff2cfad5330e524323efb
    binding_hash: 953d5070252ec161071c659f82a89f9b439f8110c1e97089086b4272fa130631
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
