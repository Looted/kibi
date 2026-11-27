---
title: MCP no-Git session tests
status: active
priority: must
tags:
  - vcs
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:20:53.313Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-no-git-workspace
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-advisory-mcp-session
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d63fd317946b455825b3b8d6
    test_id: TEST-kibi-no-git-advisory-mcp-session
    scope: end_to_end
    outcome: passed
    code_snapshot: 3c361c41fe03cd40fedcd2319e2929aa6962611973c96ed4ff0e14d5a3ac43bd
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T11:17:24.397Z'
    finished_at: '2026-11-26T11:17:32.090Z'
    artifact_digest: fa018d2731a0297b3375be2c018a24eb7055f9cad4b035d6c830e364a606f7dc
    contract_hash: 28575753be3d1dc9d8bf62d97adf14ee864afacce34f6120f8587ff1c87f530b
    binding_hash: e487ee33ee7e453ca7673dd8b72d9773873d5bc1492c4364357e67ad51e150fe
    fingerprint: 3713baf79409e1f9923f7c51e21391beccd5b02efeb5d66e1967614db38c11d1
    fingerprint_components:
      contract: 28575753be3d1dc9d8bf62d97adf14ee864afacce34f6120f8587ff1c87f530b
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
      - symbol_id: SYM-test-mcp-no-git-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Starts the MCP server over stdio in a directory outside Git and checks the advisory on the first result, on kb_status and kb_check only, a working kb_upsert and kb_search on the no-Git store, and GIT_REQUIRED from kb_prepare_impact_review (packages/mcp/tests/no-git-workspace.test.ts); in process, checks the once-per-store rule, its re-arming for another store and the status advisory rebuilt from versionControl (packages/mcp/tests/server/add-tool-paths.test.ts).
