---
title: 'KB dependencies from git: lock, fetch, status, scoped reads over CLI and MCP, and every refusal'
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-04T10:43:11.892Z'
id: TEST-kb-dependencies-git
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kb-dependencies-git-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-37c3b9972e2a7a57127c4220
    test_id: TEST-kb-dependencies-git
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e27265dbf6479b6e957d4503fef9bcbecc471997ec083a6f3f1dfc91a01d214a
    binding_hash: 61e4487c1c5649c273318184d0deb0d6cdb3bebf3f766d219f8a674efeb6a27a
    fingerprint: 90afaabf4e9be5cb440e502c673db46b87b4966e9f6c82dc69fe0f0d41af77bd
    fingerprint_components:
      contract: e27265dbf6479b6e957d4503fef9bcbecc471997ec083a6f3f1dfc91a01d214a
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
      - symbol_id: SYM-kb-dependencies-git-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Creates real Git repositories holding Kibi KBs, declares them as dependencies of a project and runs `kibi deps lock`, `kibi deps fetch` and `kibi deps status`; checks tag, branch and commit pins, the detached cached checkout, lock updates, schema 6 and the refusal of older or newer schemas, the scoped `--kb` CLI reads and JSON routes, and that the MCP server answers a `kb` read from a separate routed child for the dependency (packages/cli/tests/dependencies/kb-dependencies.test.ts, packages/cli/tests/dependencies/kb-dependency-commands.test.ts, packages/mcp/tests/server/workspace-router-dependency.test.ts, packages/mcp/tests/server/add-tool-paths.test.ts).