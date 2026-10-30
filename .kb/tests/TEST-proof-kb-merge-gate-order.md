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
    receipt_id: PR-f0d6ad38e25a80d9e2d86153
    test_id: TEST-proof-kb-merge-gate-order
    scope: unit
    outcome: passed
    code_snapshot: 8b4869505ab14fdc6d5dd258ec6c0af2fd47ca09698ebd81badf90867e6c2cb7
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:40:26.238Z'
    finished_at: '2026-10-28T09:40:26.382Z'
    artifact_digest: 6901cc9d8d1706a1cfc3bb52882b2da0950d74b36665a33127121692ad6448e2
    contract_hash: d76dfcf52a14733a53c4be03addcb2abd8617eb1b387ee6852035998f34e3af8
    binding_hash: cf7aab2bc1863298a730d2a359ef1699961b6f5aa692637f6375c3992a473079
    fingerprint: 07a2156321846050bdbc366a74eeead67a4fd25fd1798f66611a1d14d823deed
    fingerprint_components:
      contract: d76dfcf52a14733a53c4be03addcb2abd8617eb1b387ee6852035998f34e3af8
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
    evidence_level: tested
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-kb-merge-gate-order
    certificate_digest: cf3db706955a1795d7ee53675100d20a02ad17993af7ffb580391a2f0ccd6357
    certificate_rejection: 'Kibi could not read yaml .github/workflows/kb-merge.yml at jobs.resolve.steps: jobs.resolve.steps holds a value that is not a string, number or boolean, so it cannot be a member (select keys, or point path at the list)'
    claim_bindings:
      - claim_key: CLAIM-8948B0F74FEC41BA
        requirement_id: REQ-ci-kb-merge-gate-order
        fact_id: FACT-ci-kb-merge-gate-before-push
        binding: rejected
        obligation:
          kind: sequence_precedes
          members:
            - sh scripts/proof-gate.sh -> git push origin "HEAD:refs/heads/$KIBI_BRANCH"
        reason: 'the certificate did not re-check: Kibi could not read yaml .github/workflows/kb-merge.yml at jobs.resolve.steps: jobs.resolve.steps holds a value that is not a string, number or boolean, so it cannot be a member (select keys, or point path at the list)'
  - version: kibi.proof-receipt.v2
    receipt_id: PR-719a70ab804045bb5f38810e
    test_id: TEST-proof-kb-merge-gate-order
    scope: unit
    outcome: passed
    code_snapshot: 8b4869505ab14fdc6d5dd258ec6c0af2fd47ca09698ebd81badf90867e6c2cb7
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:41:20.816Z'
    finished_at: '2026-10-28T09:41:20.943Z'
    artifact_digest: 33be35c3eb16eaaf13beb9727261c4734417949d5ae37d30eb75405727138422
    contract_hash: 45a6f9f3cc2fbf971dffa955ec0b1d1f6dd354ce6747049a2df628c945f47452
    binding_hash: 1fe0bf8548cf3f0b1c91d1dc7433371cf3eaefabb1104e806124207c5ce961b3
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
            # Derived and no longer tracked: drop the branch's copy.
            if git ls-files --error-unmatch .kb/symbol-coordinates.yaml >/dev/null 2>&1; then
              git rm --cached --quiet -- .kb/symbol-coordinates.yaml
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
            # Derived and no longer tracked: drop the branch's copy.
            if git ls-files --error-unmatch .kb/symbol-coordinates.yaml >/dev/null 2>&1; then
              git rm --cached --quiet -- .kb/symbol-coordinates.yaml
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
          - sh scripts/proof-gate.sh
          - git push origin "HEAD:refs/heads/$KIBI_BRANCH"
    certificate_digest: 77a6db585c03d540ee2c32dc32c5e622f12145dd6d2088647791e9cae1403260
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