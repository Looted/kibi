# Stage E: content-bound file-impact review

Stage E adds a deterministic review record for a complete immutable Git diff. It answers whether changed files still satisfy current requirements, whether scoped requirement semantics were updated, or whether the file is explicitly outside applicability. It does not claim that a reviewer identity is authenticated and does not create or satisfy executable-test proof receipts.

## Trusted inputs

`kibi check --staged` evaluates the captured index snapshot. Its Stage E aggregate review is opt-in: it runs only when a valid `.kibi/impact-policy.json` exists in the captured base commit. A project without that base policy keeps its existing staged-check behavior and diagnostics. Adding the policy to the index does not enable review in that same change; commit the trusted policy separately, then prepare and stage the matching impact-review record. A malformed or non-regular policy already present in the base fails closed, and deleting the policy in a candidate does not disable a gate trusted by its base. `kibi check-diff` remains an explicit aggregate gate and fails closed without the policy from its protected target tree.

`kibi check-diff` is a separate, no-option aggregate gate intended for a trusted `pull_request_target` job. The PR wrapper verifies the event repository, target ref and commit, PR head commit, complete object history, and unique merge base. It captures the merge-base-to-head trees, loads source-provider configuration from the protected target tree, analyzes all inventory entries, and rechecks the event before returning success. It does not accept a caller-selected path scope, dry run, lowered link threshold, filtered rules, or shortened diagnostics.

The protected target's `.kibi/impact-policy.json` is the policy authority. Policy/evaluator changes in the PR are not accepted in the same gate run. The wrapper also rejects a target that has advanced knowledge, provider configuration, lockfiles, or a changed reviewed path since the PR merge base; rebase and refresh the review. A trusted CI integration must load the evaluator and policy only from protected code, fetch the exact PR head as Git objects without checking out or executing it, and require the gate through repository settings outside the PR's control.

The evaluator binds the exact before/after path, status, rename/copy origin, mode, object ID and bytes; old and new hunk ranges; per-side source classification and provider input/result fingerprints; scoped requirements and semantic entity fingerprints; complete relevant knowledge bytes/relationships; the trusted provider closure; the evaluator/normalizer/schema closure; and policy fingerprint. For `.kb/**/*.md`, both sides use the same proof-receipt frontmatter projection as the workspace proof snapshot: receipt-only edits do not stale an impact review or protected-target baseline, while authored text, path, mode, or other KB changes remain bound and in scope. Hunk ranges for such files are computed from the projected bytes, so appending a proof receipt cannot hide a concurrent authored edit. The impact-review transport path is excluded only when it is a plain added/modified entry at exactly `.kibi/impact-review.json`; a rename/copy into that path cannot hide its old source.

## Policy and migration

The policy is a strict `kibi.impact-policy.v1` JSON object. Unknown fields or versions, a missing policy, duplicate entries, and malformed paths fail closed. An example with no waivers is:

```json
{
  "contractVersion": "kibi.impact-policy.v1",
  "id": "protected-project-policy",
  "version": "1",
  "allowUnsupportedReview": false,
  "allowedPartial": [],
  "notApplicablePaths": []
}
```

Merge this policy to the protected target in a separate change before enabling the gate. A policy allowance for partial analysis must identify the exact provider ID, exact provider-closure fingerprint, diagnostic code, and limitation class. `failed`, syntax/parse/malformed-source, timeout, integrity/checksum, missing-input, and similar processing failures are never waived. A known structural limitation is a different state: if the protected policy allows its exact diagnostic, a record may contain an explicit residual review that matches every exact uncovered range. This is incomplete analysis plus a content-bound human decision, not a complete extraction or executable proof. Unsupported files require a policy allowance and explicit whole-file review. Existing strict staged gates should remain strict until an explicit migration selects the new policy-controlled partial lane.

Records use `kibi.impact-review.v1`. The `reviewer.id` is self-claimed local provenance, not a verified person, approval, signature, or authorization. `still_current` is a rationale bound to the exact snapshot, not proof of correctness. An `updated` decision must resolve a changed scoped requirement and include its before/after semantic fingerprints; cosmetic title/display/source-ownership or review-only metadata changes do not count unless the configured semantic source field makes that content normative. Raw knowledge bytes remain independently bound, so metadata-only edits still invalidate old records and require reevaluation.

The initial migration is explicit and does not stage files automatically: (1) merge policy/configuration separately so it is trusted by the base commit; (2) run `kibi prepare-impact-review --input -` with `{"scope":{"kind":"staged"}}`, or call the MCP peer `kb_prepare_impact_review`, to obtain the complete staged inventory, exact bindings, semantic context, residual obligations, and unauthored record template; (3) have an agent author one decision for every non-receipt path and each required side-specific residual review; (4) validate with the strict parser and evaluator; (5) write the resulting JSON to the exact receipt path and stage it deliberately; (6) run `kibi check --staged` and the trusted `kibi check-diff` job.

For offline authoring against explicitly selected immutable commits, the same CLI operation accepts `{"scope":{"kind":"diff","baseCommit":"<full-lowercase-commit-object-id>","headCommit":"<full-lowercase-commit-object-id>"}}`. The explicit diff selects only the preparation scope. It does not replace or authorize the protected-event target, PR head, or unique merge base independently verified by `kibi check-diff`. The preparation operation never chooses decisions or supplies rationale, reviewer identity, review time, signature, approval, or proof. There is no safe generic automatic decision generator. The current local record field is not reviewer authentication. A future protected approval mechanism would need a separately reviewed trust design.

## CI deployment boundary

`documentation/examples/kibi-impact-gate.yml` is an example only. It is not an active workflow, configured required status, or claim that repository settings enforce this gate. Its sample target is `main`; deployments must select and externally protect their actual target branch. The runner label is a placeholder. Before activation, provision an ephemeral runner with pinned Node/Bun runtimes and only read-only repository-fetch access, then configure the named check as required and protect the workflow, evaluator, schema, policy, provider pins and dependency lockfiles through settings outside PR control. Do not use a persistent self-hosted runner that may retain PR-controlled files. For private repositories, separately provision narrowly scoped read-only fetch authentication; never expose write tokens or unrelated secrets.

When adapted and activated, the example checks out only the trusted target tree. It fetches the PR head by numeric pull-request ref as Git objects; it never checks out the PR worktree, installs PR dependencies, or invokes PR scripts. The trusted CLI analyzes source bytes from the immutable Git snapshot. The sample job uses read-only contents permission and no deployment or mutation permissions.
