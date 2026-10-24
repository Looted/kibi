# Kibi MCP Error Reference

Use this reference when an MCP mutation fails. Fix the payload instead of falling back to prose-only `links` or `text_ref`.

## `must NOT have additional properties`

**Likely cause:** The payload used fields not accepted by `kb_upsert.properties`, often camelCase semantic claim names.

**Common fixes:**

| Invalid | Valid |
| --- | --- |
| `subjectKey` | `subject_key` |
| `propertyKey` | `property_key` |
| `predicateName` | `predicate_name` |
| `predicateArgs` | `predicate_args` |
| `canonicalKey` | `canonical_key` |
| `closedWorld` | `closed_world` |
| `value: true` | `value_type: "bool"` and `value_bool: true` |

If starting from prose, call `kb_model` with `mode: "requirement"` and apply its sequential `applyPlan` instead of guessing field names.

## Invalid `status`, `fact_kind`, `operator`, or `value_type`

Use the enum values shown in the MCP `inputSchema`. For property facts, common values are `fact_kind: "property_value"`, `operator: "eq"`, and `value_type: "bool" | "int" | "number" | "string"`.

A `req-status-vocabulary` finding on a requirement written with a legacy status (`accepted`, `proposed`, `draft`, `deprecated`, `superseded`, `rejected`) gets a `req_status_vocabulary_map` review action in the `kibi migrate` plan, with the suggested status (`accepted` -> `open`) and any semantic-inventory drift the new status would expose. Approve it by id (`--approved-action req-status-vocabulary-map-<REQ>`); a re-derive planned for that drift depends on it.

## Incomplete `property_value` fact

`fact_kind: "property_value"` requires:

- `subject_key`
- `property_key`
- `operator`
- `value_type`
- exactly one of `value_string`, `value_int`, `value_number`, `value_bool`

## Incomplete `predicate` fact

`fact_kind: "predicate"` requires:

- `predicate_name`
- non-empty `predicate_args`
- `canonical_key`

Call `kb_model` with `mode: "predicates"` before hand-writing ontology predicates.

## Incomplete logical claim provenance

`claim_key` is derived from `claim_text`, so a grounding fact (`property_value`, `predicate`, `rule`) only has to send the exact atomic clause as `claim_text`: Kibi fills in the key on `kb_upsert` and on `kibi sync`. A `claim_key` sent with the text must equal the derived key (`kb_model` with `mode: "analyze"` returns it for that clause); a `claim_key` without `claim_text` is rejected. Do not invent or reuse a key for different prose.

An `observation` or `meta` fact is a non-grounding review note, so it quotes the claim it is about in `claim_text` alone and gets no key. The error `/properties must have required property 'claim_key'` came from releases before the key was derived; upgrade, or send the pair `kb_model` returned.

If `kb_check` reports `logic-coverage`, compare the requirement `logic_claims` manifest with its linked `property_value` and `predicate` facts. Ground every missing key, add any omitted linked key to the manifest, and keep ambiguity or ontology gaps explicitly unresolved rather than satisfying the check with an observation.

If `kb_coverage.repairPlan.status` is `partial`, do not execute it as a complete migration. Its `scope.excludedByPagination` count identifies omitted actionable requirements; rerun requirement coverage with `offset: 0` and a large enough `limit`. Apply only `ready` batches, never infer that `blocked` means safe to skip, and rerun coverage after each validated sequential batch because new downstream gaps can become visible as prerequisites are repaired.

## Invalid entity origin

`origin` is an object with a required `kind` (`human`, `agent`, `migration` or `import`) and optional `ref`, `approved_by` and `recorded_at` (ISO 8601). Unknown kinds and unknown fields are rejected by `kb_upsert` and, in Markdown frontmatter, by `kibi sync` (classification `Invalid Entity Origin`). To keep a stored origin, omit `origin` from the upsert instead of copying it.

## Invalid firmness

`firmness` is allowed only on requirements and ADRs and must be `firm`, `default` or `exploratory` (classification `Invalid Firmness` in `kibi sync`). A `kb_upsert` that sets `firmness: firm` without `origin.ref` (or `approval_ref` on a requirement) fails with `Entity validation failed: firmness: firm needs origin.ref ...`: set the ref to the message, review or ticket where a human stated the rule, or use `firmness: default` for a delegated or agent choice. Kibi only checks that a reference is present, so never mark your own choice firm or cite words a person did not say.

## Firm decision edited in place

`kb_upsert` fails with `Entity validation failed: <ID> is a firm decision, so kb_upsert does not change its title, statement, body or firmness in place` when a write changes the claim of a current requirement or ADR whose firmness is `firm` (explicit, or read from a non-agent origin) without citing new human words. `kb_check` reports the same edit made directly on disk as `decision-firm-edited` (compared with `HEAD`). Ask the person who stated the rule. If they agree, either repeat the write with `origin.ref` (or `approval_ref` on a requirement) pointing at their words, or supersede the decision with a new `firmness: firm` one that cites them; otherwise leave it and propose the change. To undo a direct edit, restore the file from `HEAD`. Context sections, tags, status and relationships can be changed without a reference.

## Supersede without a reason

`supersedes-reason-missing` blocks a current requirement or ADR that supersedes another without a `## Why this changed` section of at least 12 words. Add the section to the new entity's body: name the evidence (a failing test, a measured cost, a constraint the old decision missed, a new requirement) and answer the old decision's reasoning. A preference is not evidence; propose it instead of superseding. `decision-firm-superseded` blocks a replacement of a firm decision that is not firm itself: ask the person who stated the rule, and record their agreement as `firmness: firm` with `origin.ref` to their words.

## Proposition-complete ingestion failed on a relationship update

`kb_upsert` on an existing requirement that only adds relationships (for example `specified_by` to a new scenario) keeps the stored proposition ledger: when the payload has no `semantic_*` or `logic_claims` field and its `title` and `text_ref` (if given) equal the stored values, Kibi merges the stored `semantic_text`, `semantic_inventory`, `semantic_inventory_version`, `semantic_source_field`, `semantic_source_hash`, `semantic_clauses` and `logic_claims` (and the stored `text_ref` when the payload omits it) under the payload, and checks the merged requirement. If you still see `semantic_inventory_version must be 'kibi.semantic-inventory.v1' ... received 0`, the payload changed the prose or supplied part of the ledger: either send only `title`, `status` and the relationships, or send the complete ledger returned by `kb_model` with `mode: "analyze"` for the new prose.

## `<REQ> would be written as a current requirement without a complete proposition inventory`

`kb_upsert` judges an update of a stored requirement as its file will read after the write: the stored status, prose and ledger with the payload's fields on top. A payload such as `{"title": "...", "status": "closed"}` on a `draft` requirement that never had an inventory passes on its own fields, but would leave a current requirement whose prose has no inventory, which `kibi sync` rejects with `proposition-complete ingestion failed: semantic_inventory must contain exactly N proposition(s); received 0`. Kibi refuses it at the write instead. Run `kb_model` with `mode: "analyze"`, the requirement's `id` and its complete `semantic_text`, then send the returned inventory contract (`semantic_inventory`, `semantic_inventory_version`, `semantic_source_field`, `semantic_source_hash`, `logic_claims`) in the same `kb_upsert`; propositions you cannot model stay as `ontology_gap` or `missing` entries. To retire the requirement instead, supersede it. `kibi migrate` does not derive an inventory for a requirement that has none; it only re-derives one that drifted.

The same check applies when the store does not hold the requirement but its file exists, for example a file `kibi sync` could not extract because of a legacy `status: implemented`: `kb_upsert` reads that file's front matter as the stored state, so a status-only write on a file with pinned `semantic_text` and no inventory is refused here too, and nothing is written.

## Uncompiled authored source (`source-relationship-parity`, `source_extraction_failed`)

`<file> cannot be compiled, so the entities and relationships it declares are missing from the KB: <error>` means `kibi sync` could not extract an authored `.kb/` file, so `kb_query`, `kb_coverage` and `kb_upsert` do not see what it declares. `kb_check` reports it as a blocking `source-relationship-parity` violation, and `kb_status` reports the stale reason `source_extraction_failed` (and `dirty: true`) until the file compiles. An error on `/status` usually means a legacy requirement status: run `kibi migrate --yes`, which maps `implemented`, `done` and `completed` to `closed` with the tag `implemented`, or set `open`, `in_progress` or `closed` in the file. For any other error, fix the named front matter field (edit the file, or rewrite the entity with `kb_upsert` so the write replaces the failing field), then run `kibi sync`.

`Upsert of <ID> refused: <ID> exists in <file> but is not compiled (<error>), and this write would leave the file uncompilable: <error>` means the write merges into that existing file and the result still would not compile. Send the field that fixes the error (for example a valid `status`). `... exists but kibi sync cannot compile it (...), and its front matter does not parse` means the YAML itself is broken; fix it in the file. A successful write into such a file returns the warning `<ID> was not in the compiled KB; this write updated its authored file <file>...`; run `kibi sync` to compile it.

## Semantic advisor clauses must be verbatim fragments of the requirement prose

`kb_compile_intent` and `kb_model` (`mode: "analyze"`) refuse a `clauses` entry that does not occur in the intent or `text`, naming each such clause. Clauses split the prose; they do not restate it. Copy each clause from the prose unchanged (whitespace layout, a leading list marker and closing punctuation may differ), or omit `clauses` to let Kibi split the prose. To change what the requirement says, change the intent itself.

## `semantic_source_field must be '<field>' for the current requirement prose`

The payload declared no `semantic_source_field`, or one that is not `semantic_text`, `text_ref` or `title`. Kibi then derives the prose field by a fixed rule, `semantic_text` when it is set, else `text_ref`, else `title`, and the message says which field it derived and why (for example "no semantic_source_field was sent; the prose comes from text_ref because semantic_text is unset"). Set `semantic_source_field` to that field and make `semantic_source_hash` the SHA-256 of that field's text, or declare one of the three fields explicitly; a declared field among those three is honored as given, so the expected field never flips between calls that send the same properties.

## Semantic inventory no longer matches the advisor

If `kibi sync` reports `N requirement(s) failed proposition-complete ingestion` after an upgrade, the stored `semantic_inventory` of each listed requirement was written by an older semantic advisor. Run `kibi migrate`: its `semantic_inventory_rederive` actions rewrite the inventories that can be re-derived without losing grounding, and its `semantic_inventory_review` actions carry the re-derived contract for the rest. Fix those in the requirement file itself (sync rejects them, so `kb_upsert` and `kb_delete` cannot reach them), then run `kibi sync`. When a review exists only because some grounding links point at claims that are no longer modeled, the plan also lists a `semantic-inventory-rederive-drop-grounding-<REQ>` action; approve it by id (`kibi migrate --apply-safe --approved-plan-hash <hash> --approved-action <id>`) to write the re-derived contract and remove exactly those links, then run `kibi sync`.

## Apply plan failed: only ready plans may be applied

`kb_apply_plan` applies only a plan whose `status` is `ready`; the message names the plan's actual status and the remedy. A compile plan in `needs_resolution` still has `ontology_gap` or `missing` propositions, or a step its diagnostics name: model each proposition with `kb_model` (`mode: "requirement"` or `"predicates"`), call `kb_compile_intent` again and apply the ready plan it returns, or write the requirement with `kb_upsert` carrying the plan's inventory contract with the unmodeled propositions kept as `ontology_gap` entries. A `blocked` compile plan conflicts with a current requirement: resolve the contradiction (supersede or change the conflicting requirement, or change the intent), then compile again. A bootstrap plan in `needs_context` needs the context it asks for before planning again.

## Unsafe or unverifiable rule fact

`fact_kind: rule` requires a `kibi.logic.v1` `rule_ir`, a deterministic full `rule_hash`, a `semantic_key`, a `rule_schema_id`, and `rule_name`. Submit the typed object through `kb_model` with `mode: "requirement"`; do not provide Prolog source. `rule-safety` rejects function symbols, raw goals, cuts, meta-calls, dynamic predicates, I/O, unsafe/unbound variables, existential rule heads, unstratified negation, incompatible units, and unbounded aggregation. `rule-verifiability` requires `requires_rule` to target a real `rule_schema` and a safe rule fact. Analysis that is timed out or resource-limited is `unresolved`, not proof of consistency.

If validation reports `Logical Claim Provenance Mismatch`, the fact's `claim_key` was copied, invented, or derived from different text. Re-run `kb_model` with `mode: "analyze"` for the exact atomic clause and preserve its returned `claim_key` and canonicalized `claim_text` together.

## Relationship source mismatch

Same-call relationship rows must start from the entity being upserted. To link `REQ-mcp-search-discovery -> TEST-mcp-search-discovery`, create `TEST-mcp-search-discovery` first, then upsert `REQ-mcp-search-discovery` with `verified_by`.

## Invalid relationship tuple

`kb_upsert` (dry run or real) rejects relationship source/target type pairs that are not part of the relationship schema. For example, facts are not directly verified by tests: do not write `verified_by fact -> test` or `validates test -> fact`. Create or update a requirement, link the requirement to the fact with `constrains`, `requires_property`, or `requires_predicate`, and link the requirement or its scenario to the test with `verified_by` / `validates`.

## Strict-lane mismatch

- `constrains` targets `fact_kind: subject`.
- `requires_property` targets `fact_kind: property_value`.
- `requires_predicate` targets `fact_kind: predicate`.
- `requires_rule` targets `fact_kind: rule` whose `rule_schema_id` points to `fact_kind: rule_schema`.

Legacy prose facts may remain readable during migration, but they do not provide the same strict contradiction semantics.

## Contradiction detected

Create an append-only replacement requirement and add `supersedes`, or deprecate the conflicting requirement before writing the new one. Then set the replaced requirement to `status: closed`.

The check runs at commit time (`stage=contradiction_check`), after every validation passed, and `kb_upsert` with `dryRun: true` previews the same check for a `req` against a staged, rolled-back copy of the store, so a dry run refuses what the commit would refuse. A refused commit rolls back the authored file, the relationship shards and, for an untracked file written by an earlier `kb_upsert`, its pending-source receipt, so `kb_check` and `kb_status` stay clean afterwards; verify with both before retrying with the supersession in place.

## Pending source hash drift (`source-relationship-parity`, `SYNC_ERROR`)

`Pending source hash drift blocks sync for .kb/<lane>/<id>.md; expected <hash>, found <hash>` means the pending-source receipt that binds an untracked file written by `kb_upsert` no longer matches the file's bytes (for example after an edit outside Kibi). There is no separate repair tool: rewrite the entity with `kb_upsert` (its current `title` and `status` are enough for an existing entity) and the receipt is republished against the current bytes, or `git add` the file: the next sync retires the receipt of a tracked file without comparing its hash. A `kibi migrate` rewrite (re-derived inventory, source path repair, lifecycle repair) republishes the receipt itself. Before the first compile the entity is not stored yet, so `kb_upsert` judges the payload against the entity's file as it reads now; `git add` the file is the simpler repair there. `Pending source is missing` means the untracked file was deleted: run `kibi branch recover --apply` if that was intended. A refused `kb_upsert` restores the receipt it found, so a commit-time refusal alone does not cause this finding.

## Branch store not compiled (`branch-store-not-compiled`, `branch_store_not_compiled`)

`The KB store for branch <branch> does not exist yet` (or `is empty (generation-1:0: nothing compiled)`) `, while .kb/ holds <n> authored source file(s)` means this branch was never compiled. Kibi keeps one store per branch and never copies another branch's; the `post-checkout` hook `kibi init` installs compiles a new branch, so this appears on a branch created without the hooks. Every other rule would read an empty KB, so `kb_check` reports only this violation and `kb_status` reports it as one blocking stale reason. Run `kibi sync`, or apply the `branch-store-compile` action of the returned `migrationPlan` with `kb_apply_plan`. `kibi branch ensure` alone does not fix it: it creates an empty store. Run `kibi init` once to install the hooks.

## Superseded requirement still open (`superseded-requirement-open`)

`kibi check` blocks a requirement that another requirement `supersedes` while its status is not `closed`. Upsert it with `status: closed`, or run `kibi migrate` (action `close_superseded_requirements`), which edits only the status line. If the requirement still states current intent, delete the `supersedes` link instead. A finding that starts with `Supersession cycle:` names requirements that supersede each other; nothing closes them automatically. Decide which one is current, delete the `supersedes` link that points at it, then close the others.

## Entity has no body context (`entity-context-missing`)

`kibi check` blocks a current `req`, `scenario`, `test`, `adr` or observation/meta `fact` whose body has fewer than 12 words of context, or whose context only restates the title (for a requirement, also `semantic_text`). For a requirement only text under a `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` or `Evidence` heading counts. Add a `## Context` section (requirement) or prose body stating why, who asked, the source and anything that does not fit front matter, and pass it as `document.body` to `kb_upsert`; the upsert result and dryRun warn about the same finding. Never invent a reason the requester did not give: write "Reason not stated". Entities the schema 8 `kibi migrate` acknowledged (tagged `review:context-missing` and listed in `.kb/manifest.json` under `contextAcknowledged`) do not block and are counted by the advisory `entity-context-acknowledged` diagnostic. The tag is reserved for them: on any other entity `kibi check` still blocks with "review:context-missing is reserved for entities acknowledged by the schema 8 migration; add context instead". Do not tag an entity to clear the finding; write who asked, the source and "Reason not stated" in the Context section. Remove the tag once real context is added. The pre-commit `kibi check --staged` blocks the same finding on an entity document the commit adds or edits, unless the entity already had it at the last commit or is acknowledged.

## Component without a design requirement (`policy-ownership`)

Only reported when a package is activated for `kibi.check-policy.v1`, such as `kibi-plugin-ui`. A production symbol in the policy's file set (for `kibi-plugin-ui`, components in `*.tsx`, `*.jsx` and `*.component.ts`, tests and stories excluded) implements no current requirement linked `requires_predicate` to one of the policy's predicates. The finding names the policy rule and the requirements the symbol does implement. Fix it by linking the symbol `implements` to the design requirement it renders, or by modeling one: a requirement grounded in `ui_pattern`, `same_pattern`, `ui_container` or `visual_layout_rule` (see `docs/ui-requirements.md`). A superseded design requirement no longer counts, so a component that only implements one needs the successor. When the component genuinely has no design constraint, tag the symbol `review:ui-unconstrained`. A finding whose entity is the policy package means the policy could not be read (not installed, `kibi.checkPolicy` missing, a path outside the package, or an invalid document); fix the install or the activation rather than removing the rule.

## Pattern marker missing (`policy-markers`)

Only reported under an activated check policy with marker rules. A file implementing a requirement that names a pattern (for `kibi-plugin-ui`, `ui_pattern(subject, pattern)`) no longer contains a marker the KB declares for that pattern (`pattern_marker(pattern, marker)`); the files searched are the symbol's source file plus siblings with the same stem and the policy's extensions (`.html` for `kibi-plugin-ui`). This usually means the component was rewritten to a different pattern. Restore the agreed pattern, or, if the human decided the design changes, supersede the requirement with one naming the new pattern and its markers. If only the marker's spelling changed, update the `pattern_marker` fact; `timeline_dot` and `timeline-dot` already match each other.

## Dangling source (`source-path-dangling`)

An authored `source` frontmatter field must name an existing workspace path (a `#anchor` suffix is fine), an existing entity id, or an http(s) URL. The field is dead data: the compiled `source` is always the entity's own file, and Kibi never writes the field, so `kb_upsert` cannot fix it and an agent must not hand-edit `.kb/`. Run `kibi migrate` instead; its automatic `source_path_rewrite` action repairs the finding. When the value names another knowledge file by its pre-canonical path (`documentation/<lane>/...`, or `<lane>/...` relative to the knowledge root) and that file exists under `.kb/<lane>/`, the finding carries `evidence.rewrite` and the action points the field there. Otherwise the finding carries `evidence.remove` and the action removes the line: `self` when the value names the entity's own file (in any spelling, compared case-insensitively), `dangling` when it names nothing Kibi can map. Only when the edit is not safe, for example a value spanning several lines, does the finding carry `evidence.refused`; `kibi migrate` then plans a `review_source_path_dangling` action, and a person edits the field by hand.

The rule also covers a `text_ref` whose value is one workspace file path (a directory, a file name with an extension, no spaces) that does not exist, typically a path under a retired knowledge folder. Those findings carry `evidence.field: text_ref`. `text_ref` is evidence, so it is never removed: when the file moved under `.kb/`, `source_path_rewrite` points the field there; otherwise (or when the `text_ref` is a requirement's semantic source) the finding carries `evidence.refused`, and a person points it at the evidence's current path or deletes it when the evidence is gone.

## Symbol lacks qualifying coverage (`symbol-coverage`)

A production symbol needs `covered_by` a test that covers one of the requirements it implements. When the requirement has a scenario (`specified_by`), the test must verify the scenario (`validates(Test, Scenario)` or `verified_by(Scenario, Test)`); a test that verifies the requirement directly counts only while the requirement has no scenario. `kibi check` reports every uncovered symbol; `kibi check --staged` reports the same rule for the symbols the commit changes (changed source symbols and symbols whose staged `.kb/symbols.yaml` entry changed), so a commit cannot pass the gate with coverage the full check rejects. Link the test to the scenario, or point `covered_by` at a test that already does.

When the symbol already has `covered_by`, the finding names the missing link instead of asking for `covered_by`: which test does not verify which implemented requirement, and the relationship that would connect them (`verified_by(SCEN-…, TEST-…)` through the requirement's scenario, or `verified_by(REQ-…, TEST-…)` when it has none). When the test is already linked that way, the finding says its `verification_scope` or `verification_perspective` does not match what the requirement requires.

## Coarse symbol link (`symbol-granularity`, `symbol_granularity_violation`)

A symbol with traceability links covers its source file more coarsely than the declarations available there, for example a class symbol `Greeter` while `Greeter.greet` exists. Move the `implements`/`covered_by`/`executable_for` links to the narrow behavioral symbol, or add an allowed `granularity_reason` when the coarse link is intentional. Full `kibi check` reports this for every symbol against its whole working-tree file; `kibi check --staged` reports it as `symbol_granularity_violation` when a staged hunk touches a narrower declaration. `kb_upsert` (dryRun included) refuses the same coarse link when it is written, also when the payload only adds links to a stored symbol, so the debt never reaches the commit; the refused write is a coded error (`SYMBOL_GRANULARITY_VIOLATION` on MCP and in the CLI JSON route). The message lists methods, functions and accessors first, then properties (behavioral in the schema, but usually plain fields), so the first names are the likely places to move the link. When the message says the extractor does not produce the symbol's title, the title names a private class member (`private` or `#private`) or a declaration that was removed, renamed or is not exported: coordinate refresh can never bind it, so re-point the symbol to the public declaration that owns the behavior by changing its `title` with `kb_upsert` (or move its links to an existing symbol for that owner), or delete it. Give it a coarse `granularity_reason` (`module-level-behavior`, `config-artifact`, `extractor-miss`, `test-suite`) only when it intentionally covers the whole file.

## Audit journal or snapshot lock

`Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying` means an older engine still owns the branch's journal lock. Kibi does not terminate unrelated sessions; use `kibi engine status`/`kibi engine stop` for the current workspace, or restart the stale MCP/CLI process, then retry the validated upsert.

A `rdf/lock` file present after an MCP session ended is usually not stale. Calls such as `kb_apply_plan` run in the workspace's detached engine daemon, which keeps the lock while it serves later MCP and CLI sessions and exits after 10 idle minutes (`KIBI_ENGINE_IDLE_TIMEOUT_MS`). `kibi engine status` shows the live daemon; a lock whose process no longer exists is reclaimed when the next engine starts, and `kb_status` then lists a `store_lock_taken_over` notice for 24 hours. Only stop the daemon (`kibi engine stop`) when you need the lock released now.

`KB snapshot is stale; reattach or refresh the runtime before retrying` means another current runtime published the branch after this process attached. Reattach the branch (or restart the runtime) and rerun the read/preflight/mutation sequence.

Timeout diagnostics include `stage=<name>` and the child PID. The stage is one of the bounded commit markers (`runtime`, `lock`, `rdf_mutation`, `contradiction_check`, `entity_audit`, `relationship_audit`, `snapshot_save`, or `audit_sync`); use it to distinguish a stale lock from a filesystem or Prolog failure without relying on entity payload logging.

## Coded tool errors on MCP (`VALIDATION_FAILED` and others)

A tool that rejects its input with a Kibi error code, such as `kb_compile_intent` or `kb_model` mode `analyze` with a `clauses` entry that is not a verbatim fragment of the prose (`VALIDATION_FAILED`), returns `isError: true` with an error envelope in `structuredContent`: `status: "error"` and `error.code`, `error.message`, `error.retryable`. The CLI JSON route prints the same `error` for the same input (exit code 2 for input errors, 1 for operation errors). Branch on `error.code`, fix the input the message names, and call again; `retryable: false` means the same input fails again. The text content repeats the code: `Tool <name> failed: [<code>] <message>`.

## Read stopped at its engine limit (`QUERY_LIMIT_EXCEEDED`)

The read ran under `KIBI_ENGINE_READ_TIME_LIMIT_MS` or `KIBI_ENGINE_READ_INFERENCE_LIMIT` and was stopped before it computed an answer; `error.details.limitExceeded` names the `kind` (`time` or `inferences`) and the `limit`. Nothing was read partially and nothing was written. Narrow the request (a type, id, tag, or smaller page), or raise or unset the limit in the CLI or MCP server environment, then retry.

## Write refused on a detached HEAD

`<operation> writes the branch KB, but HEAD is detached at <sha> ...` means the checkout has no single branch identity (zero or several local branches point at HEAD). Reads still work from the read-only snapshot and carry a `detached_head_read_only` diagnostic. To write, check out a branch (`git switch <branch>` or `git switch -c <branch>`) or set `KIBI_BRANCH` to name the branch explicitly, then retry.

## Plan application journal (`kb_apply_plan`)

`Apply plan failed ...; no change was applied` means the compile plan failed before its single store commit. Its source writes were restored from the journal and the store is unchanged. Fix the cause and apply the same plan again.

`PLAN_APPLY_RECOVERY_REQUIRED` (non-retryable) means a plan application was interrupted and could not be settled yet: the store could not be inspected, or a committed plan's pending-source receipts failed. Run `kb_apply_plan` with the named `recoveryJournalId` once the engine or filesystem is available. Do not re-apply the original plan.

`PARTIAL_COMMIT_REPAIR_REQUIRED` from a plan journal means a journaled file holds neither its journaled before nor after bytes, or the journal is unreadable. Recovery changed nothing. Restore each listed file to its before or after bytes and retry, or reconcile the workspace and store by hand (`kibi sync`) and remove the named journal file.

`MUTATION_ALREADY_COMMITTED` means the plan was already applied. Compile a fresh plan instead.

An error ending in `[settled before this failure: ...]` comes from a mutating call that first completed or rolled back an interrupted plan from its journal, then failed on its own work. The settlement stands; read it to learn which plan was completed or rolled back. A plan compiled before that settlement usually fails its snapshot check and must be compiled again.

## Deletion plan approval (`kb_delete` with `approvedPlanHash`)

`DELETE_PLAN_HASH_MISMATCH` means the `approvedPlanHash` passed to `kb_delete` is not the hash of the deletion plan computed from the current sources: the `ids` differ from the call that returned the plan, or an authored source or relationship shard changed since. Nothing was written. Call `kb_delete` again without `approvedPlanHash`, review the new `deletionPlan`, and approve its `planHash`.

`REQUIREMENT_SUPERSESSION_REQUIRED` from `kb_delete` or `kb_apply_plan` means the plan covers an authored requirement. Requirements are not deleted: upsert a replacement requirement with a `supersedes` relationship and close the old one, as the `supersession_required` result's `nextActions` entry shows.

`VALIDATION_FAILED` from `kb_delete` with `approvedPlanHash` means the approval cannot apply: it was combined with `relationships` or `dryRun: true`, an id was not resolved into the plan (missing, or has dependents), or no id produced an authored-entity plan. Nothing was written.

## Low-confidence requirement modeling downgrade (`kb_model` mode `requirement`)

When confidence is below `0.70`, Kibi emits a non-blocking `fact_kind: observation`. If the prose is normative, retry with explicit `subjectKey`, `propertyKey`, `operator`, and `value` so the tool can produce strict facts.

## Predicate suggestion ontology gap (`kb_model` mode `predicates`)

If no candidate meets `minScore`, Kibi emits a `review:ontology-gap` observation. Keep it as review evidence, or add a project-local `fact_kind: predicate_schema` when the language is recurring domain ontology.

If a candidate exists but returns `binding_status: incomplete`, this is not an ontology gap and its `applyPlan` is intentionally empty. Review the declared argument roles and call the tool again with exact `argumentBindings` for every name in `unbound_arguments`; do not persist the literal marker `unknown`.

If lexical ranking prefers a reviewed false positive, retry with the exact candidate `schema.id` as `schemaId`. Use `polarityHint` only when the prose's surface negation is not denial of the selected predicate. An unavailable `schemaId` returns `resolve_schema_reference` and no write plan; refresh or correct the schema reference rather than recording a false ontology gap.

## Inspecting domain contradiction evidence

`domain-contradictions` violations may include `evidence.witnesses`. Strict-property and ground-predicate witnesses identify both requirements, both source-bound fact claims, and the exact normalized terms. Rule witnesses also include source spans, rule hashes/IR, and a symbolic comparison. A rule witness with `status: unresolved` means overlap could not be proven or excluded; it keeps requirement proof at `analysis_incomplete` and must not be reported as consistency.

## Joint contradiction (`kb-consistency`)

The facts in the violation's core cannot all hold at once, even when every pair of them is compatible, so `domain-contradictions` does not report it. The violation names the core facts, the requirements behind them, and for each fact a model showing the others hold once it is dropped; the certificate is under `evidence.certificate`. Resolve it by changing one of the values or by superseding one of the requirements (a new requirement that `supersedes` it, with the old one set to `status: closed`). Do not edit a firm requirement's value in place.

A certificate the independent checker rejects also blocks: rerun `kibi check`, which regenerates the bundle from the current KB. `kibi check --certificates <file>` rejects a saved bundle once the KB has changed (for example "core names a fact outside its context or repeats one" when a core fact is no longer current); write a fresh one with `--write-certificates`.

`kb-consistency-unresolved` is advisory: the checker could not compare a context (mixed value types or units, an unsupported operator or polarity, validity windows that never overlap). Model the values in one unit and type if they should be comparable; until then the context is unresolved, not consistent.

## Advisory quality diagnostics are present but checks pass

Kibi has a two-lane check contract. Hard correctness failures appear in `violations[]` and fail checks. Auditability findings appear in `qualityDiagnostics[]`; `review`, `info`, and non-blocking `warning` diagnostics are intentionally advisory so they can guide agents without breaking otherwise valid KB operations.

Fix the underlying modeling issue when the diagnostic points to real drift, but do not move advisory findings into `links` or prose-only workarounds to silence them. Use the suggested MCP workflow instead: `kb_search` → `kb_query`, update narrower requirements/scenarios/tests/symbols/facts through `kb_upsert`, and rerun `kb_check`.

Telemetry diagnostics are also advisory in `kb_check`, but `kibi usage-metrics --require-acceptance` converts their versioned report into an explicit process gate. Common IDs and repairs are:

- `repeated_mutation_failures`: stop retrying, query endpoints, validate a reduced exact payload, repair runtime health, and retry once.
- `mutation_validation_bypassed`: run `kb_upsert` with `dryRun: true` (catalog operation `kb_validate_upsert`) for the exact payload within one hour before sequential `kb_upsert`.
- `semantic_advisor_bypassed`: rerun `kb_model` with `mode: "analyze"` (catalog operation `kb_semantic_advisor`) for the same requirement and current source hash before writing it.
- `lookup_before_first_edit_bypassed`: a host session edited a requirement-linked file before any `kb_search` or `kb_query`. Before the first edit of such a file, ask `kb_search` about the change (or `kb_query` with `sourceFile`) and read the requirements it names. The evidence comes from host plugin hook rows, which are written only in diagnostic mode.
- `e2e_receipt_freshness_low`: query the affected requirements/tests, run `kibi prove` for the covering integrations, let receipts append idempotently with preserved history, and rerun complete coverage.
- `proof_gap_recovery_stalled`: apply reviewed ready repair batches and demonstrate a lower complete-scope gap count.
- `source_lookup_zero_result_rate_high`: inspect and refresh the cited source links before repeating focused lookups.
- `telemetry_completeness_low`, `telemetry_evidence_stale`, or `telemetry_acceptance_incomplete`: capture current complete diagnostic events; do not waive missing evidence as success.

## Bootstrap write validation

`BOOTSTRAP_PLAN_INVALID` refuses an approved plan before any bootstrap write or journal is created. Re-plan; do not recover the invalid plan. Candidates suppressed as `invalid_write` include the validation message and become cited requirement-authoring follow-ups.

`BOOTSTRAP_PLAN_REJECTED` marks a deterministic failure after application began. Inspect `actionResults` for the actions that committed, then request a corrected plan from the current state. The terminal journal cannot be replayed; `kibi status` lists incomplete bootstrap applications. IO interruptions and derived-effect repairs continue to use `recoveryJournalId`.

## Legacy storage migration blocked

`kibi migrate` prints `Blocked: ...`, `kibi doctor` fails `Canonical storage`, and the plan's `schema-config-upgrade` action (`legacy_storage_migration`) is `blocked` for an `operator` when a legacy knowledge file outside `.kb/` cannot be moved. All three report the same resolution:

- `... is a stale subset of .kb/symbols.yaml`: every symbol of the legacy manifest is already in `.kb/symbols.yaml`. Remove the legacy copy with `git rm`.
- `... is a generated coordinates file`: keep `.kb/symbol-coordinates.yaml` and remove the legacy copy; `kibi sync --refresh-symbol-coordinates` regenerates coordinates.
- `... names no symbols manifest`: the legacy config places its lanes under another folder and Kibi cannot tell which symbols manifest is current. Set `paths.symbols` in `.kb/config.json`, or remove the stale copy.
- `Destination ... already exists with different content`: compare both copies and keep the current one.

Then run `kibi migrate --yes`. A legacy copy identical to its `.kb/` file is not a blocker: `kibi migrate --yes` removes it.

## Untracked knowledge sources (`untracked_knowledge_sources`)

When `kibi check` reports `source-relationship-parity` violations whose evidence names `untrackedSources`, the migration plan collapses them into one `untracked-knowledge-sources` review action listing the files. The relationships are missing because Git does not track those files and they have no pending-source receipt. Stage them (`git add`), then run `kibi sync`. Files moved by `kibi migrate` get a receipt, so sync compiles them before they are staged.

## Invalid dry run (`UPSERT_DRY_RUN_INVALID`)

`kb_upsert` with `dryRun: true` (CLI `kibi upsert` with `"dryRun": true`) on a payload the write would refuse returns an error envelope with code `UPSERT_DRY_RUN_INVALID` (MCP `isError: true`, CLI exit code 1). Nothing was written. The message and `data.errors` carry the validation errors; fix them and run the dry run again before the write.

## Migration plan refusal

`MIGRATION_PLAN_REFUSED` (`kb_apply_plan` / `kibi apply-plan` with a `kibi.migration-plan.v2`, `data.outcome: refused`) means no action was applied and every failed action was refused before it changed anything: a proof-integration create plan whose `.kb/proof/integrations.json` already exists, a planned source or fact that changed since planning, or an action with no automatic executor. The message carries the refused action's `detail`. Nothing needs reconciling; request a new plan (for the proof-integration case, `kibi proof inspect --update <id> --json`). `data.outcome: reconciliation_required` is different: an action failed without being refused, so inspect its effect before retrying.

`over_limit` lists each discovered candidate excluded by `maxCandidates`, after deduplication and existing-entity suppression. Declared intent claims are never capped and do not use the `maxCandidates` budget; typed requirements are selected ahead of provider observations, and provider facts that state no claim (provenance stubs, `fact_kind: meta` tagged `bootstrap:provenance-stub`) are selected last. Each `over_limit` row says whether it is a stub (`provenanceStub`), and the diagnostic counts them ("N of them provenance stubs that state no claim"): raise the limit only when a candidate with a claim is over it, never for stubs. `duplicate_entity` marks a candidate that would rewrite an entity another planned candidate already writes with different content, and a candidate whose requirement grounds on planned facts with mismatched `claim_key`s is suppressed as `invalid_write` before apply. A `Knowledge source …` diagnostic reports each declared source's claims as planned, already in the KB, filtered out (`filtered_by_entity_type`, `below_min_confidence`), or not planned, and names why each not-planned claim was left out: `suppressed_by_activation` (the activation mode plans no declared claims; compile them with `kb_compile_intent`), another `suppressedCandidates` row, a `sourceOnlySignals` follow-up, or only a diagnostic; a plan whose authoritative source has none of its claims planned, existing or filtered stays `needs_context`. `extraction_failed` names a source the planner could not extract, and an existing-ID read failure blocks plan binding. An `entity_exists` row with `matchedBy: "restatement"` means the claim restates current requirement `matchedId` (its normalized statement or excerpt equals that requirement's title, semantic text or one of its sentences): it is counted as already in the KB and not planned. If the claim says something the requirement does not, reword the claim to state the difference, or change the requirement with `kb_compile_intent` (mode `update`). A diagnostic "Intent claim at … closely restates current requirement …" marks a planned claim that overlaps one by 0.8 or more without matching it; review it before approving the plan.
