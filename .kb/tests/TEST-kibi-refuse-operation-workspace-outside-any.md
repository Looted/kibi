---
title: Outside-Git refusal tests for kibi init, kibi status, the JSON routes and the MCP session
status: active
priority: must
tags:
  - cli
  - init
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-25T07:07:03.263Z'
id: TEST-kibi-refuse-operation-workspace-outside-any
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-outside-git-consumer
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aa635436b0feaa3b10f9f371
    test_id: TEST-kibi-refuse-operation-workspace-outside-any
    scope: end_to_end
    outcome: passed
    code_snapshot: fbc51139d826b980d70202c9c381d40b3625558e77e87685caebd9ead0510449
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T07:50:24.028Z'
    finished_at: '2026-11-25T07:50:27.892Z'
    artifact_digest: 378c584b27d53f48c5a3690d5a6076bacad1a266fa0e27acfb09fa884115e1ab
    contract_hash: 5ac908dd415812d378260e6ef5557df013bf4341f01ca62a169c5a82ff997444
    binding_hash: c3f892360827aaf9e73e4bb8defe55f923da063ca83c64d21cf87509a35aeba1
    fingerprint: d0c9d8122fcc37e17ca5d5867301d3cafa4c0411ba4393a026d9304827bab79f
    fingerprint_components:
      contract: 5ac908dd415812d378260e6ef5557df013bf4341f01ca62a169c5a82ff997444
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
      - symbol_id: SYM-test-kibi-outside-git-consumer
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the built CLI in a temporary directory outside Git (GIT_CEILING_DIRECTORIES above it) and checks that kibi init exits 1 with the git init instruction and leaves the directory empty, that kibi status in text and as a JSON route refuse with NOT_A_GIT_REPOSITORY, retryable false and the same message, that git init followed by kibi init succeeds, and that kibi init with KIBI_BRANCH says the branch holds for that run only while kibi status without it is refused again (packages/cli/tests/consumer/outside-git.test.ts). Unit tests cover the codes and messages of BranchResolutionFailure for every resolver code (packages/cli/tests/cli-errors.test.ts), init's coded refusal and telemetry category (packages/cli/tests/commands/init-command-mutation.test.ts, packages/cli/tests/commands/init-coverage.test.ts, packages/cli/tests/cli-failure-categories.test.ts), the unwrapped refusal from executeStatus and the runtime (packages/cli/tests/public-mutation/operations/discovery-status.mutation.test.ts, packages/cli/tests/operations/discovery.test.ts, packages/cli/tests/cli-runtime-remaining.coverage.test.ts), the open-failure envelope keeping its code (packages/cli/tests/cli-protocol-mutation.test.ts), the MCP session throwing the same coded refusal (packages/mcp/tests/server/session-coverage.test.ts) and the rejected telemetry outcome of the new categories (packages/agent-core/tests/usage-telemetry-outcomes.test.ts).
