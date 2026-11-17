# Second-agent edits

Recipes for an agent changing a knowledge base another agent or person
authored. Each one is the order the write path accepts.

1. **New strict requirement with a predicate grounding.** `kb_model` (core MCP profile: CLI `kibi model --input -`) mode
   `analyze` with the complete prose; copy `inventory_contract` into
   `semantic_inventory_version`, `semantic_source_field` and
   `semantic_source_hash`, the prose into `semantic_text`, `propositions`
   into `semantic_inventory` and the assertive `claim_key`s into
   `logic_claims`. Reuse (or `kb_upsert`) the subject fact, then call
   `kb_model` mode `predicates` per clause with `subjectHint` set to that
   subject fact's `subject_key`: the requirement constrains nothing yet, so
   the hint is the planned subject and the planned fact gets its
   `subject_key` (`subjectKey` is a mode `requirement` parameter; mode
   `predicates` ignores it and warns). `kb_upsert` the returned `applyPlan`
   fact first (it carries the clause's `claim_key`). Then write the
   requirement in one `kb_upsert` with the ledger (that clause `status:
   modeled`), or leave the four scalar ledger fields out and send
   `semantic_inventory` entries (`{claim_key, status, subjects}`) only for
   the claims you classify: `kb_upsert` derives the rest, records a claim
   `modeled` when a grounding link names its `claim_key` and `missing` when
   nobody classified it, and lists each claim in `inventoryApplied`. Send
   a sectioned `document.body`, `constrains` to the subject
   fact, `requires_predicate` to `relationshipTarget` and `specified_by` to
   its scenario: `specified_by` (req → scenario) is sent in the
   requirement's write, never in the scenario's, so create the scenario
   first, with `assumes` links (scenario → `property_value` fact, sent in
   the scenario's own write) to the values its outcome relies on; add a
   rejection scenario that assumes a forbidden value next to the success
   one (see `resources/quantified-claims.md`). Set
   `expects` only on a scenario that has `assumes` links; `expects: success`
   without them only yields `scenario-feasibility-unknown` ("assumes
   nothing"). Between the scenario's write and the requirement's, the
   check also reports the new success scenario as
   `scenario-feasibility-unknown` ("not constrained by any current
   requirement"): that is expected, it clears once the requirement write
   lands, so do not edit the scenario to silence it. A
   `modeled` entry and its grounding link must arrive in the same write
   (`modeled semantic_inventory entries (n) must equal logical grounding
   relationships (m)`); a clause not grounded yet stays `status: missing`
   and is switched to `modeled` together with its link later. A partial
   `{title, status}` upsert (plus relationships) is enough only for an
   existing entity, whose stored ledger Kibi keeps.
2. **Changing the text of a grounded requirement.** New prose means new
   claim keys, so a bare rewrite is refused with `modeled proposition
   claim_keys must match logical grounding target claim_keys exactly`; the
   error names the modeled keys no fact declares and the facts whose keys
   the ledger dropped. Analyze the new prose with the requirement's `id`
   first: the receipt warns `Claim-key drift against the stored ledger`
   and names the grounded clauses the new wording drops (the title worded
   differently from the stored `semantic_text` is the usual cause), before
   any write. Prefer supersession for a change of meaning: analyze the new prose,
   write its facts, write the new requirement (`-v2`) with `supersedes` to
   the old one, then set the old one to `status: closed`. Its scenario
   follows the same rule as in recipe 1: create the new scenario (with
   `assumes` to the `property_value` facts it relies on, and `expects` only
   when it has them) before the `-v2` write that sends `specified_by`, then
   re-point the old scenario (its `assumes` go in its own write) or close
   it. For a wording fix
   that keeps the meaning, re-ground in place: analyze the new prose,
   `kb_upsert` each grounding fact with the new `claim_key`/`claim_text`
   (same fact id), then `kb_upsert` the requirement with the new ledger,
   `semantic_text` and the same grounding links in one write. The requirement
   write checks the targets' stored claim keys, so the facts go first;
   between the two writes `kb_check` reports the requirement until the
   second lands.
3. **Deleting authored entities.** `kb_delete` (core MCP profile: CLI `kibi delete --input -`) on an authored entity that
   is not a requirement (scenario, test, fact, ADR, …) writes nothing and
   returns `outcome: plan_returned` with a hash-bound
   `kibi.entity-deletion-plan.v1` in `deletionPlan`. After review, run
   `nextActions[0]` unchanged: `kb_apply_plan` with its `input` (`plan` plus
   `approvedPlanHash: plan.planHash`), or repeat the `kb_delete` call with
   `approvedPlanHash` to apply the freshly computed plan in one step (a
   changed source fails with `DELETE_PLAN_HASH_MISMATCH`). `dryRun: true`
   previews relationship and direct deletes without writing. For an
   authored requirement the result is `outcome: supersession_required`, the
   plan carries `supersessionRequired: true` and both routes refuse it
   (`REQUIREMENT_SUPERSESSION_REQUIRED`): Kibi never deletes an authored
   requirement. Evolve it instead with a new
   requirement linked by `supersedes` and close the old one. When the
   behavior is gone and nothing replaces it (or for an agent-origin
   requirement nobody approved and nothing links to), upsert it with
   `status: retired` and a `retired_reason` saying why (keep its `title`);
   it stays on disk as history and stops governing. Then relink or archive
   (`status: deprecated`) the facts and scenarios it alone owned, and
   relink or delete its tests: `kb_check` blocks them under
   `retired-owner-only`. Leave a requirement that is done and still valid
   `closed`. A
   person may remove the file in Git and run `kibi sync`; agents do not edit
   `.kb/` directly.
4. **After a commit-time refusal** (`Contradiction detected …
   (stage=contradiction_check)`, strict-lane pairing, proposition-complete
   ingestion): the result is `status: error` and nothing was written. The
   authored file, the relationship shards, the pending-source receipt of an
   untracked file and the file times are restored, so `kb_check` (including
   `source-relationship-parity`) stays clean and `kb_status` stays `fresh`;
   verify both, fix the cause (supersede, pair the lane, re-ground), and
   resend the whole payload. A `committed_with_repairs` result is the
   opposite case: the commit stands and only its repair actions are run.
5. **What `dryRun: true` does and does not check.** It runs every
   pre-commit validation and, for a `req`, the commit-time contradiction
   check against a staged, rolled-back copy of the store, so `valid: true`
   means the commit would accept the payload as far as the store can tell.
   It writes nothing, so it cannot report what only a write reveals:
   `DOCUMENT_PATH_REQUIRED` for a new entity with no single writable target,
   filesystem, lock and receipt failures, a concurrent writer, or
   `kb_check`-only rules such as `logic-coverage` and `scenario-feasibility`
   (`entity-context-missing` is returned as a warning).
