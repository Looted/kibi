---
title: 'Source proof: the KB merge workflow runs the proof gate before pushing'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-kb-merge-gate-order
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: yaml
    file: .github/workflows/kb-merge.yml
    path: jobs.resolve.steps
    select: items
    field: run
  proves:
    - CLAIM-8948B0F74FEC41BA
origin:
  kind: agent
  recorded_at: '2026-10-28T09:39:51.162Z'
id: TEST-proof-kb-merge-gate-order
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2f10f86c8782c1300248f379
    test_id: TEST-proof-kb-merge-gate-order
    scope: unit
    outcome: passed
    code_snapshot: 97d0e95d2803eef139e4731599fac316348fd8eb1a484ebf032f2c4e0f78317d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T15:10:00.569Z'
    finished_at: '2026-11-04T15:10:00.734Z'
    artifact_digest: 0b658f61b722d0bee0933f603dd4f8edc74b60bfb10dd2b244f08c40727e3f47
    contract_hash: 45a6f9f3cc2fbf971dffa955ec0b1d1f6dd354ce6747049a2df628c945f47452
    binding_hash: 82617b0e0cc4972f9de0d8d714db8ff814b89301b0eba717087b20fd1bfaeeb3
    fingerprint: dd742b853858584a2558565d938847525b5dcffebf2b3531b084a11bc067ec54
    fingerprint_components:
      contract: 45a6f9f3cc2fbf971dffa955ec0b1d1f6dd354ce6747049a2df628c945f47452
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
      - symbol_id: SYM-proof-kb-merge-gate-order
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-kb-merge-gate-order
      source:
        reader: yaml
        file: .github/workflows/kb-merge.yml
        path: jobs.resolve.steps
        select: items
        field: run
      model:
        members:
          - |
            bun install --frozen-lockfile
            bun run build:cli-stack
          - git push origin "HEAD:refs/heads/$KIBI_BRANCH"
          - |
            set -euo pipefail
            bun "$KIBI_CLI" sync
            if ! git diff --quiet HEAD; then
              echo "::error::Kibi sync changed tracked files after the merge: $(git diff --name-only HEAD | tr '\n' ' ')"
              exit 1
            fi
          - |
            set -euo pipefail
            git commit -m "Merge $BASE into $KIBI_BRANCH" \
              -m "Kibi merge driver resolved the .kb manifest conflicts."
          - |
            set -euo pipefail
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git config merge.kibi.driver "node $GITHUB_WORKSPACE/packages/cli/bin/kibi merge-driver %O %A %B"
            printf '%s\n' '.kb/symbols.yaml merge=kibi' '.kb/relationships/*.yaml merge=kibi' \
              >> .git/info/attributes
            git merge --no-ff --no-commit "origin/$BASE" || true
            if ! git rev-parse -q --verify MERGE_HEAD >/dev/null; then
              echo "::error::Nothing to merge; the branch already contains $BASE or the merge could not start."
              exit 1
            fi
            unmerged=$(git diff --name-only --diff-filter=U)
            if [ -n "$unmerged" ]; then
              echo "::error::Conflicts need a person: $(echo $unmerged)"
              git merge --abort
              exit 1
            fi
          - sh scripts/proof-gate.sh
        sequence:
          - |
            bun install --frozen-lockfile
            bun run build:cli-stack
          - |
            set -euo pipefail
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git config merge.kibi.driver "node $GITHUB_WORKSPACE/packages/cli/bin/kibi merge-driver %O %A %B"
            printf '%s\n' '.kb/symbols.yaml merge=kibi' '.kb/relationships/*.yaml merge=kibi' \
              >> .git/info/attributes
            git merge --no-ff --no-commit "origin/$BASE" || true
            if ! git rev-parse -q --verify MERGE_HEAD >/dev/null; then
              echo "::error::Nothing to merge; the branch already contains $BASE or the merge could not start."
              exit 1
            fi
            unmerged=$(git diff --name-only --diff-filter=U)
            if [ -n "$unmerged" ]; then
              echo "::error::Conflicts need a person: $(echo $unmerged)"
              git merge --abort
              exit 1
            fi
          - |
            set -euo pipefail
            git commit -m "Merge $BASE into $KIBI_BRANCH" \
              -m "Kibi merge driver resolved the .kb manifest conflicts."
          - |
            set -euo pipefail
            bun "$KIBI_CLI" sync
            if ! git diff --quiet HEAD; then
              echo "::error::Kibi sync changed tracked files after the merge: $(git diff --name-only HEAD | tr '\n' ' ')"
              exit 1
            fi
          - sh scripts/proof-gate.sh
          - git push origin "HEAD:refs/heads/$KIBI_BRANCH"
    certificate_digest: e4cf6cded1c53bc6e2b75379b09ad68e99427919c6ef2ccb7cf1ff848ec4be4c
    claim_bindings:
      - claim_key: CLAIM-8948B0F74FEC41BA
        requirement_id: REQ-ci-kb-merge-gate-order
        fact_id: FACT-ci-kb-merge-gate-before-push
        binding: derived
        scope: source
        obligation:
          kind: sequence_precedes
          members:
            - sh scripts/proof-gate.sh -> git push origin "HEAD:refs/heads/$KIBI_BRANCH"
---
Reads the run command of each resolve step in .github/workflows/kb-merge.yml. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the proof gate step still comes before the push step.