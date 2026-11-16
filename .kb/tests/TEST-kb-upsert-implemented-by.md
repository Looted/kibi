---
title: kb_upsert implementedBy tests
status: passing
priority: must
tags:
  - mutation
  - traceability
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T07:13:21.038Z'
id: TEST-kb-upsert-implemented-by
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-implemented-by
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a2696980a9f8b356a1a52ec2
    test_id: TEST-kb-upsert-implemented-by
    scope: end_to_end
    outcome: passed
    code_snapshot: df0f74af81e64a9ccc5235e8267c8b776e9bce30c68a0dfc5bb669c392f06e71
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T20:44:00.533Z'
    finished_at: '2026-11-16T20:44:24.080Z'
    artifact_digest: 56d432bf30b1bea7671a8ce826ab53273c799a122375c2376194376635282759
    contract_hash: a8d0ce5de0dddad9c482d8df92fc8539a38c5ec325dbb68af444b322f1288e84
    binding_hash: ccb5be046894734ad2846269bb5a8c8eb3a6b7fd022007c5e387836863616634
    fingerprint: 086d6977faf01e66d464004762d90243c83eeeb89fa32fa1e4a99367348e7abe
    fingerprint_components:
      contract: a8d0ce5de0dddad9c482d8df92fc8539a38c5ec325dbb68af444b322f1288e84
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
      - symbol_id: SYM-test-kb-upsert-implemented-by
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The operation tests run kb_upsert of a requirement with implementedBy entries against a workspace whose files declare known symbols. An entry that names one granular declaration records an implements link from that symbol to the requirement, creating the symbol entity when it is new. An entry that matches no declaration or several is refused with the candidate symbols and nothing is written; the candidates are the declarations kb_upsert accepts as granular links (exported constants and types included, a file-local function not). An entry that would link a whole file or a coarse declaration such as a class with methods is refused, and implementedBy on a non-requirement entity is refused. Entries that name one declaration by another path spelling or as Class.method and its bare method name record one link, and a stored symbol is reused under either name. A name the ASCII slug cannot spell gets a non-empty id, and a taken id gets a numbered one. The result counts and source writes include the symbol writes, and a failed symbol write keeps the failure's code and retryability (packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts). The consumer tests run the same writes through the kibi upsert command (packages/cli/tests/consumer/upsert-implemented-by.test.ts), and the MCP server test runs kb_upsert over stdio and checks that it records the link and refuses an unknown symbol as the CLI does (packages/mcp/tests/server.test.ts).

A false pass would be a test that checks only the returned status, never that the stored link comes from the declared symbol rather than the file.
