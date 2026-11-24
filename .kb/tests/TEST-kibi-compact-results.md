---
title: kb_search and kb_check give each entity, statement and advice once
status: passing
priority: should
tags:
  - search
  - check
  - cost
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-compact-results
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-24T19:19:11.192Z'
id: TEST-kibi-compact-results
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c1491ef8dc4e6fa643fea26d
    test_id: TEST-kibi-compact-results
    scope: end_to_end
    outcome: passed
    code_snapshot: 2cf8e5c0e94b9e3ceb952466b217c7984e9a31b072ae29a19c46443db34eeaf9
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-24T20:02:16.945Z'
    finished_at: '2026-11-24T20:02:48.511Z'
    artifact_digest: f3830cbc6bd37a69dedb33f89cc55665a9115aa9c7ae82194401559b41500be5
    contract_hash: 95819afde91c56e27673a3c700673af3d0e126d0c0b35dae353ceb0b228a732a
    binding_hash: 880e09a312f8690860d192a46017f3573f7d2f0ec5de97ae06d3045bc76d8de1
    fingerprint: c8cbf3ab4cd07684f052662755d0503971cb27e6a2e18dbb105d4d96f2a99c3a
    fingerprint_components:
      contract: 95819afde91c56e27673a3c700673af3d0e126d0c0b35dae353ceb0b228a732a
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
      - symbol_id: SYM-test-kibi-compact-results
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the result-compaction steps of kb_search and kb_check. packages/cli/tests/search-answered-results.test.ts asserts which answer entries count as quoted (a whole statement, not a clipped one; a fact with its claim) and that a quoted entity's result keeps exactly its id, type, title, score and reasons while every other result is returned unchanged. packages/cli/tests/operations/discovery.test.ts runs kb_search end to end over a stubbed engine, with and without the answer. packages/cli/tests/public/impact/shared-advice.test.ts asserts each shared advice text, that a suggestion no template gives keeps its own text, and that the statement leaves the message but stays in evidence; packages/cli/tests/public/check-format-shared.coverage.test.ts asserts the kb_check structured result lists each shared advice once with every diagnostic pointing at it and lists changed symbols without linkedEntityIds. A false pass would be a test that only checks sizes: each one compares the exact objects. End to end, packages/cli/tests/consumer/check-compact-impact.test.ts runs kibi check on the built CLI over a committed workspace whose two requirements are implemented by a changed file and asserts each statement is quoted only in evidence, both statement warnings point at one advice and the symbols carry no linkedEntityIds; packages/cli/tests/consumer/search-answer-layer.test.ts runs kibi search on the built CLI and asserts every result the answer quotes keeps only entity, score and reasons while the others keep their evidence; packages/mcp/tests/tools/check-impact.test.ts runs the MCP kb_check handler and asserts each shared advice is listed once.