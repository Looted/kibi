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
    receipt_id: PR-d243ef0cff78010f04902b61
    test_id: TEST-kibi-no-git-advisory-mcp-session
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:43:27.429Z'
    finished_at: '2026-11-25T11:43:35.631Z'
    artifact_digest: 3adfed733981da18c3ff773f94e53b9a9bfa789d864b81f9d6db7652a17b845a
    contract_hash: 28575753be3d1dc9d8bf62d97adf14ee864afacce34f6120f8587ff1c87f530b
    binding_hash: df2fd2c9d7c6cf8d4c0912cd5c168049d9757afde40407d199c6efff1717a4e7
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
