# kibi-cli

## 2.10.0

### Minor Changes

- be5d25e: Bootstrap plans no longer write subject keys that Kibi's own `subject-key-shape` rule flags. Declare the component a knowledge source or an intent claim is about (`component: "recorder"`) and the plan uses keys such as `recorder.beginning_to_record_while_idle`; a claim Kibi cannot place is reported in the plan diagnostics and left as an authoring follow-up instead. Intent claims can also carry the `rationale` the source or the human gave, which becomes the requirement's `rationale` and `## Context`.

  `bootstrapContext.knowledgeSources[].component`, `intentClaims[].component` and `intentClaims[].rationale` are new optional fields bound into the plan hash only when declared. Subject keys keep an already dotted subject, use a one-word subject as the component with the constrained property as the aspect, and otherwise prefix the declared component; repository Markdown takes its component from the file or directory name. The kibi-bootstrap skill (3.6.0) asks the human for the reason behind a requirement whose source states none, and sets scenario `expects` only when the scenario links `assumes` facts, so draft scenarios tagged `needs-human-review` no longer raise `scenario-feasibility-unknown`. The kibi-usage skill (2.6.0) and `docs/modeling-cheatsheet.md` match.

- be5d25e: A `kb_apply_plan` call with a plan but no `approvedPlanHash` (or a malformed or mismatched one) now fails the call itself over MCP, also with `async: true`. Before, MCP accepted it, returned a job receipt, and the error appeared only when polling `kb_job_status`. `kb_delete` likewise rejects a call that names both or neither of `ids` and `relationships`, as the CLI already did.

  The MCP JSON Schema to Zod converter now enforces a `oneOf` whose branches are only `required`/`not`/`anyOf`/`allOf` key guards (exactly one branch must match) with the same condition matcher as `if`/`then`; the published input schema gains no top-level `oneOf`. In async mode the server runs the new `preflightApplyPlan` (exported from the CLI operations and kibi-runtime) before returning the receipt: it checks the approved hash, the plan shape and canonical hash, and for a bootstrap plan the branch, KB, workspace and source snapshots. The job repeats every check under the workspace lock.

- be5d25e: `kb_model` with `mode: "predicates"` now tells you what to do with a requirement that is already grounded, instead of answering `already_grounded` for all of them. A grounded claim with no fitting schema gets `record_ontology_gap` and the `review:ontology-gap` observation plan again, one whose schema needs exact values gets `provide_argument_bindings` with the missing arguments, and one with a complete predicate gets the new `replace_grounding` action with its `replacementPlan`. After a bootstrap, which grounds every requirement, the ontology-gap lane is no longer silently skipped.

  `recommendedAction` drops `already_grounded` and adds `replace_grounding`; `existingGrounding` remains the "already grounded" signal. An already grounded claim still gets no predicate `applyPlan` or `relationshipPlan` (a second grounding link fails the proposition-complete rule), but the ontology-gap observation plan and `recommendedPredicateSchema` are returned because an observation is not a grounding relationship. The warning that points at `replacementPlan` appears only when a replacement plan exists. kibi-usage 2.6.0 and kibi-bootstrap 3.6.0 describe the new actions; `docs/mcp-reference.md` documents them.

## 2.9.0

### Minor Changes

- b3eef89: `kibi check` now blocks a requirement whose advisor ledger still has unmodeled (`missing`) propositions when it `relates_to` a requirement that is modeled with strict property or ground predicate facts. Until now such a requirement passed clean: `domain-contradictions` compares grounded facts only, so a new requirement that quietly described different behavior for the same subject was never compared with the modeled one it linked to. The finding names the modeled subject and property keys (or predicate keys) and asks for the missing propositions to be modeled against them, or for a `supersedes` decision.

  New canonical rule `related-requirement-unmodeled` (Prolog, `check_related_requirement_unmodeled/1`) is registered in `rule-registry.json` and runs by default. It follows `relates_to` in either direction, counts only `status: missing` inventory entries, and reports nothing for requirements without a ledger (strict-readiness lane), for ledgers whose assertive propositions are modeled or explicitly classified, for neighbours that model nothing, and once the older requirement is superseded.

### Patch Changes

- Updated dependencies [b3eef89]
  - kibi-core@0.17.0

## 2.8.0

### Minor Changes

- 393f492: Large bootstrap plans no longer fall over when they take longer than the agent's MCP client is willing to wait. `kb_apply_plan` reports progress after every bootstrap action, so clients that reset their timeout on progress keep waiting, and `async: true` returns a `kibi.job.v1` receipt to poll with `kb_job_status` instead of holding the request open. If an apply is still cut off mid-action, `kb_apply_plan` with the journal's `recoveryJournalId` resumes it without hand-editing the journal and reclaims a source lock left behind by the dead process.

  `OperationContext` and `RuntimeOptions` gain an optional `onProgress` reporter (`OperationProgress`, `ProgressReporter` are exported from `kibi-runtime`). The bootstrap executor reports after each applied action; the MCP server forwards reports as `notifications/progress` when the request carries `_meta.progressToken`, and each report also pushes back the server's `KIBI_MCP_TOOL_TIMEOUT_MS`, which then bounds inactivity rather than the whole apply. `kb_apply_plan` accepts `async` (MCP only; it falls back to a synchronous apply when `kb_job_status` is not enabled) and its output contract admits the job receipt. Bootstrap recovery now accepts drift since the last checkpoint only when the journal is still `applying` with an active action that has no result: that action is re-applied, the result notes it, and the journal records it under `interruptedActions`; any other drift is still refused. `acquireWorkspaceMutationLock` takes a `reclaimDeadHolder` option; `kb_apply_plan` grants it only for a bootstrap recovery whose journal is `applying`, moves a dead holder's lock aside atomically, records it under `lockReclaims` in the journal, and keeps failing closed for live, unverifiable, corrupt or legacy owners. Bundled skills `kibi-bootstrap` 3.5.0 and `kibi-usage` 2.5.0 describe progress, async apply and journal recovery, and say never to edit `.kb/recovery`.

- 393f492: `kb_model` with `mode: "predicates"` no longer proposes a second grounding for a claim the requirement already grounds, which used to fail the proposition-complete rule on every link. It now answers `already_grounded` with the existing links and, when a predicate fits, an ordered `replacementPlan` that swaps the grounding; every result also names the planned predicate fact id to link in `relationshipTarget`. Upsert validation errors now name every unknown property and point entity prose placed in `properties` (`body`, `text`, `description`, …) to `document.body`.

  Predicate suggestion reads the requirement's `requires_property`, `requires_predicate` and `requires_rule` targets and their `claim_key` when `requirementId` is given; a match yields an empty `applyPlan`, no `relationshipPlan`, `existingGrounding`, and a `replacementPlan` of predicate-fact upsert, `kb_delete` of the old relationship, and a relationship-only requirement upsert. The output contract adds `already_grounded` and `review_nonlogical` to `recommendedAction`, plus `relationshipTarget`, `existingGrounding` and `replacementPlan`. The relationship plan instructions name the planned fact id. Root-level `additionalProperties` errors list all unknown keys and keep the `must NOT have additional properties` text. The kibi-bootstrap scenario example now carries a `document.body`, and `docs/modeling-cheatsheet.md` shows a scenario upsert.

## 2.7.0

### Minor Changes

- b350869: Requirements, scenarios, tests, ADRs and observations now have to say why they exist. `kibi check` blocks a current entity whose body has no real context, `kb_compile_intent` requires a `context` for a new requirement, and bootstrap keeps the quoted source excerpt in the entity instead of only on the approval screen. Existing knowledge bases upgrade to schema 8 with `kibi migrate --yes`, which keeps every body byte-identical and only tags entities that lack context `review:context-missing`, recording their ids in `.kb/manifest.json`; the tag is honored only for those ids, so an agent cannot clear the check by tagging an entity itself. Run `kibi sync` afterwards.

  Entity bodies are split into sections by Markdown headings; `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` headings count as context. A requirement counts only context headings, while scenarios, tests, ADRs and observation or meta facts count all prose. Context needs at least 12 words and a token-set Jaccard similarity below 0.8 against the title (and, for a requirement, `semantic_text`); symbols, flags, events and other fact kinds are exempt. New canonical rule `entity-context-missing` and advisory `entity-context-acknowledged` are registered, and `kb_upsert` (including dryRun) warns about the same finding. `requirementSemanticText` now excludes context sections, and every requirement authoring path writes `semantic_text` explicitly; the schema 8 migration pins it for existing requirements with the previous derivation so claim spans and hashes do not move. `kb_compile_intent` gains `context`, `sourceExcerpt` and `sourceReference` and renders statement, `## Context` and `## Source`; on update it replaces the statement and keeps the existing context sections byte for byte unless new context or source is supplied. `kb_plan_bootstrap` requires `excerpt` for `intent` and `observation` claims and persists it with the source title and reference in the created body. Search snippets come from the first context prose. Bundled skills `kibi-usage` 2.4.0 and `kibi-bootstrap` 3.4.0 document the per-type body contract and say never to invent a reason.

### Patch Changes

- Updated dependencies [b350869]
  - kibi-core@0.16.0

## 2.6.1

### Patch Changes

- 7f08632: Bootstrap no longer drops conditional claims ("If microphone access fails, the editor must ...") or obligations that mention a referent ("... any draft state that refers to it") as `invalid_write`; they become ready requirement candidates. Linking a scenario to an existing requirement with `kb_upsert` no longer requires resending its whole semantic inventory, and a review observation can quote the claim it is about without a `claim_key`. The bundled skills now show how to answer `provide_argument_bindings` from `kb_model` predicates and how to write scenarios from acceptance criteria.

  Technical summary: requirement steps built by `kb_plan_bootstrap`, the `kb_model` requirement path and typed logic plans take each inventory role from the semantic advisor (`advisorPropositionRole`), so the write-time proposition-complete check accepts what Kibi itself generated. The advisor classifies a clause as `definition` only when "means / is defined as / refers to / is called" is the main predicate of a sentence that asserts no obligation; inventories stored with the earlier `definition` role for such clauses still validate. `kb_upsert` on an existing `req` whose payload carries no `semantic_*` or `logic_claims` field and keeps the stored `title` and `text_ref` merges the stored ledger (and the stored `text_ref` when the payload omits it) before validation and writing; a payload that supplies ledger fields or changes the prose is checked as sent. The entity schema, the `kb_upsert` input schema and the Prolog shape check now let an `observation` or `meta` fact carry `claim_text` without `claim_key`; every other fact still needs both. `kibi-usage` 2.3.2 adds a predicate-binding retry example and a review observation payload; `kibi-bootstrap` 3.3.1 makes step 11 write scenarios from acceptance criteria with `assumes` links.

- 21b889a: The pre-commit hook now stops a commit that makes the knowledge base contradict itself. Before, `kibi check --staged` (what the hook runs) only checked symbol traceability, so a commit could add a success scenario that a current requirement forbids, such as a free order checking out under "checkout only when the cart total is positive", while a full `kibi check` on the same tree failed. A violation that was already committed still does not block unrelated commits.

  When the staged change touches entity documents or relationship shards under `.kb/`, `kibi check --staged` now runs the `domain-contradictions`, `scenario-feasibility` and `exception-claim-keys` rules on a temporary KB projected from the staged tree. Code symbols are left out of that projection, since these rules never read them, which keeps the added hook time to seconds on a large KB. Only violations missing from the base commit's tree block; the base tree is analyzed only when the staged tree has violations. The staged projection also carries a scenario's `expects` outcome, which it previously dropped, so feasibility rules saw no success scenarios.

- Updated dependencies [7f08632]
  - kibi-core@0.15.2

## 2.6.0

### Minor Changes

- ec26130: Bootstrap now keeps what the onboarding interview leaves unsettled. Previously every declared claim was treated as intended behavior, and contradictions between sources or open questions had no place in the plan, so they stayed in the agent's own notes and were lost after apply. Now a claim can be marked as an observation or an open question, and conflicts between claims can be declared. Each is kept in the KB as a cited review fact instead of becoming a requirement.

  `kb_plan_bootstrap` accepts `bootstrapContext.intentClaims[].kind` (`intent` by default, `observation`, `open_question`) and `bootstrapContext.conflicts[]` (`claimReferences` of two to ten `{ sourceId, reference }` pairs plus a `note`). Observation and open-question claims become `fact_kind: observation` candidates with the claim's citation evidence and `text_ref: <sourceId>:<reference>`; open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict naming an undeclared claim is reported in `diagnostics`. Kinds and conflicts are part of `declaredContext` and the plan hash (the default `intent` kind is omitted, so existing plans keep their hash), and the facts go through the same plan-time write validation as every other candidate. The `kibi-bootstrap` skill (3.2.3) updates the harvest, declare and approval steps.

- 44b2d0d: After bootstrap, agents now keep going instead of stopping at a knowledge base that holds only cited requirements. Previously the `kibi-bootstrap` skill ended with "hand off to the normal Kibi workflow" and no instructions, and its rule against direct `kb_upsert` left claims the plan could not write with no way to author them. Now a "deepen" step tells the agent what to author next, in the normal workflow and with the human informed.

  The bundled `kibi-bootstrap` skill is now 3.3.0. A new step 11 ("Deepen") runs after apply and close-out. It loads `kibi-usage` and hands every claim suppressed as `invalid_write` or listed in `sourceOnlySignals` to `kb_model` and `kb_upsert` with its statement and `sourceId:reference` citation. It proposes a scenario from acceptance criteria (`specified_by`) for each persisted requirement, runs `kb_model` with `mode: "predicates"` on each one, and records any undeclared conflict or open question as a `review:conflict` or `review:open-question` observation. The safety boundary now states that the direct-`kb_upsert` prohibition covers the bootstrap plan's own writes, not this post-bootstrap authoring. Step 5 sends unplanned claims to step 11, and the report step is renumbered 12.

### Patch Changes

- 094fcae: Bootstrap now links your declared intent to the code even when you declare many claims. Previously declared intent claims used up the shared `maxCandidates` budget, so with 50 or more claims every symbol, test and repository document Kibi found was suppressed as `over_limit`, and the plan to approve listed hundreds of suppression rows. Now claims sit outside the budget, generic Markdown stays out of claim-driven plans unless you ask for it, and suppressions are summarized as one count per reason.

  `kb_plan_bootstrap` applies `maxCandidates` (default 50) only to discovered candidates, independent of how many declared `intentClaims` are planned, and reports one `N discovered candidate(s) exceeded maxCandidates` diagnostic instead of the old "discovered candidates get no slots" note. `includeGenericMarkdown` defaults to `false` when `bootstrapContext` declares `intentClaims` (a diagnostic states it) and to `true` otherwise; an explicit value always wins, and the input schema no longer advertises a fixed default. `tldr` and a new `Suppressed candidates by reason` diagnostic aggregate `suppressedCandidates` per reason; the full rows are unchanged. The `kibi-bootstrap` skill (3.2.2) updates step 5 accordingly.

## 2.5.2

### Patch Changes

- 564b171: Bootstrap plans no longer drop the intent claims you declared from tracker, wiki or spec sources when the repository has many candidates. Previously the default 50-candidate cap could silently discard every claim from one source, and two markdown lines that restated one rule could leave an approved plan half-applied. Now every declared claim is planned, each source reports how many of its claims were planned, and a plan that plans none of an authoritative source's claims asks for context instead of reporting ready.

  `kb_plan_bootstrap` applies `maxCandidates` only to discovered candidates. Candidates that would rewrite an already-planned entity with different content are suppressed as `duplicate_entity`, and the write-time `claim_key` grounding check now also runs at plan time against planned writes, suppressing mismatches as `invalid_write`. The plan adds one `Knowledge source …` diagnostic per declared source. The `kibi-bootstrap` skill (3.2.1) tells agents to read those diagnostics and no longer advises against `maxCandidates`.

- 1cddf4d: Approved bootstrap plans now apply when the current KB uses a journal generation and revision. A change to that revision still rejects the plan before writing.

  Accept the existing journal snapshot format in bootstrap plan validation while retaining canonical hash, workspace, and live snapshot checks.

- 271ed4d: Running `kibi init` now completes an existing empty or partially initialized knowledge directory so bootstrap can proceed. Repeated initialization preserves authored knowledge, lifecycle metadata, symbols, and existing schema files.

  Reconcile missing canonical directories, branch storage, ignore entries, and schema files instead of skipping setup whenever `.kb` exists. Refuse substituted directory paths and copy missing schema files without overwriting existing destinations.

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

- 2c6ce25: `kb_search` with `sourceLocations` no longer reads complete entities for every entity in the given files. Results and rankings are unchanged; a file covered by many tests with long proof receipt histories now costs a fraction of the engine output it used to.

  Source-located intent candidates use the projected search-candidate rows through the new `kb_list_search_candidates/6` (type, source filter, limit, offset), which applies the same source filter as `kb_query_entities/8`. The separate full-entity source lookup used when a host lacks paged entity queries is removed, so every host loads the same candidate set.

- Updated dependencies [2a2b2db]
- Updated dependencies [2c6ce25]
  - kibi-core@0.15.1
  - kibi-plugin-builtin@0.4.2
  - kibi-plugin-sdk@0.4.1
  - kibi-swipl@1.0.1

## 2.5.1

### Patch Changes

- Agents now pick up the `kibi-bootstrap` skill for onboarding work beyond seeding a new knowledge base: reviewing a plan or preview, judging approval readiness, diagnosing a blocked or failed bootstrap, and applying an approved plan. The skill starts every task with `kb_status`, routes review and repair tasks to a read-only preview, and checks before applying that the plan matches the approved one field for field, including `suppressedCandidates`. In paired SkillOpt runs, 10 cells per variant, the new skill scored 95 against 70 for the previous one. It applied approved plans that the previous skill failed to apply, and it had no security failures where the previous skill had two.

  Skill `kibi-bootstrap` 3.2.0 rewrites the frontmatter `description` and the body. Every other frontmatter field and every resource stays the same. The candidate was drafted, evaluated and confirmed on a fresh cohort with the SkillOpt campaign workflow, using the Claude Code target host.

## 2.5.0

### Minor Changes

- f4c81c4: `kb_apply_plan` now applies a compile plan all-or-nothing. If any step fails, including a step after the first, the store and the workspace are left as they were and the same plan can be applied again; you no longer get a half-applied plan that needs manual repair. If the process dies mid-application, the next `kb_apply_plan`, `kb_upsert` or `kb_delete` call completes or rolls back the interrupted plan from its journal and reports which. `kb_upsert` with `dryRun: true` now runs exactly the validation a real write runs (including strict-lane pairing and supersedes direction, which it used to skip), so it rejects what the write would reject.
  - Compile plans write a durable journal before the first write: `plan-apply-<planHash[0:16]>.json` in the branch store directory, or `.kb/recovery/plan-apply/<branchKey>/` until the store manifest exists. It records the plan hash, exact before/after bytes and hashes of every workspace file the plan changes (its `sourceWrites` plus the relationship shards its steps append, rendered in memory by the new `renderShardWithRelationship`), every store upsert, and a fingerprint of the touched store entities. Plans without source writes are journaled too.
  - Files publish with temp-file + fsync + rename + directory fsync (`FilesystemPort.fsync` is new and optional; `nodeFilesystem` implements it). All steps then commit in one `kb_commit_upsert_batch` transaction, which is the only commit point. Steps no longer run one by one through `executeUpsert`.
  - Any failure before the commit restores every file from the journal and aborts. Error text says `no change was applied`, and the journal ends `rolled_back`. A commit failure is decided from the store fingerprint, not the transport. A store that reports failure but shows the batch committed returns `committed_with_repairs` with `STORE_COMMIT_REPORTED_FAILURE`. A store that cannot be inspected keeps the journal and throws the new non-retryable `PLAN_APPLY_RECOVERY_REQUIRED`.
  - Recovery runs at the start of `kb_apply_plan`, and of `kb_upsert`/`kb_delete` when they take the workspace mutation lock. It also runs through `kb_apply_plan` `recoveryJournalId: "plan-apply-…"`. Journal states:
    - `prepared`: rolled back.
    - `store_committing`: decided by the fingerprint.
    - `store_committed`: completed.
    - `committed` / `rolled_back`: idempotent no-op.

    Results report `outcome: "replayed" | "rolled_back"` and `validationSummary.recoveredJournals`; upsert warnings and delete text also report the recovery, and a call that settles a journal and then fails on its own work appends `[settled before this failure: …]` to its error text (typed errors keep their code and retryability). Before changing anything, recovery checks that every journaled file is at its before or after hash. Otherwise it changes nothing and throws `PARTIAL_COMMIT_REPAIR_REQUIRED`. The journalless `PARTIAL_COMMIT_REPAIR_REQUIRED` path for compile plans is gone.

  - A pending-source receipt failure after the commit now returns `committed_with_repairs` (`PENDING_SOURCE_RECEIPT_FAILED`) instead of throwing `SOURCE_COMMIT_REPAIR_REQUIRED`. Later writes fail with `PLAN_APPLY_RECOVERY_REQUIRED` until the journal is recovered.
  - Behavior change: `executeValidateUpsert` (`kb_upsert` `dryRun: true`, CLI `validate-upsert`) uses `validateUpsertForCommit` whenever a store is attached. The response shape is unchanged. The dry run now reads the store for existing relationships, strict-lane pairing and supersedes history. Without a store it keeps the store-independent checks.
  - Entity-deletion and bootstrap plans keep their existing journals.

- 89870c1: Bootstrap now checks its write actions before review and application, so ordinary require/forbid claims can be applied without malformed facts or semantic-inventory failures. Invalid and ungroundable claims remain cited authoring follow-ups; product intent receives priority over repository observations, and excluded or unreadable candidates are reported. Deterministic failures stop in a terminal journal with committed actions listed and guidance to re-plan; interrupted writes still recover.

  Encode polarity as an `eq` boolean `true` comparison with a require/forbid modifier in the shared strict builder, retaining existing stable IDs. Add writer-schema and semantic-inventory preflight, per-claim extraction diagnostics, task-list normalization, selection accounting, and terminal failure reporting through CLI/MCP status and result envelopes.

  Migration: KB schema 7 makes `strict-fact-shape` a blocking canonical check. Run `kibi migrate --yes`, then `kibi sync`. The migration rewrites legacy polarity-only property facts to the typed boolean encoding while preserving IDs, polarity, relationships, and document bodies. Other malformed strict facts require explicit correction; they are not treated as proof.

- ebb2491: Entities created by `kb_compile_intent` plans now survive `kibi sync --rebuild`. Before this, `kb_apply_plan` committed plan entities only to the branch store, so rebuilding the store from the workspace silently dropped them and their relationships. Applying a plan now writes each entity to its authored document, exactly as `kb_upsert` does, and code files named in `sourceLocations` are no longer overwritten with a requirement document.
  - `kb_compile_intent` sets `document.path` on every non-symbol step of a `ready` plan (the canonical path `kb_upsert` would choose) and returns `sourceWrites: []`. The requirement's document is the first `sourceLocations` entry only when it is a `.md`/`.mdx` file outside `.kb/`; code locations are evidence only. A step that fails entity validation or path resolution makes the plan `needs_resolution` with `A plan step cannot be applied as written: …`.
  - `kb_apply_plan` renders each step's document with the newly exported `renderSourceDocument` at apply time, journals it with the new file origin `entity-document`, publishes documents before relationship shards, and commits each entity with that document as its `source`. `changedPaths` lists every document written. Plan source writes that target the same path keep their exact bytes.

- 9ab84a4: Conditional requirements are now checked against scenarios. Write "checkout may happen only when the cart total is positive" (or "checkout must not happen unless ...") and `kb_compile_intent` compiles it to a typed rule; a checkout scenario that assumes a zero cart total is then infeasible and blocks proof, exactly as a property requirement would. A requirement only governs scenarios in its scope and inside the validity window of its facts, an approved exception can waive a single clause, and a conditional Kibi cannot translate stays an open gap instead of being stored as a note that looks modeled.
  - Rule-lane feasibility: a current requirement's `requires_rule` rule whose body reads subject properties (`namespace:name(Entity, Value)`) contributes constraints in the same form as `requires_property` facts. A `forbid`/`deny` rule with one condition on one property contributes the negated condition; a `permit`/`oblige` rule of kind `constraint` contributes each condition. A rule restricts only scenarios that perform its action (`specified_by` the requirement or an exception to it, or assuming a predicate fact naming the action). Other restricting rules are decided on their own (entailed blocks, refuted is irrelevant, otherwise unknown). `logic_rule_property_form/2` folds comparison exceptions into the body and reads property keys from every nested atom.
  - Validity windows: requirement constraints apply over their grounding fact's `valid_from`/`valid_to` (a rule IR's `validFrom`/`validTo` take precedence). The scenario's time is the intersection of its assumed facts' windows; a bounded constraint at an unspecified or partly overlapping time is undetermined.
  - New outcome `not_applicable` (`disjoint_scope`, `outside_validity`) when no current requirement governs any assumption, and new unknown reasons `undecided_rule` and `undetermined_validity`, reported by `scenario-feasibility-unknown` and the proof ladder's `unknownFeasibility`.
  - New optional requirement field `exempts_claims` (claim keys): an approved exception then waives only the constraints grounded by facts carrying those keys. New canonical rule `exception-claim-keys` requires `exempts_claims` to name claims of a requirement the exception `exempts`.
  - New advisory rule `numeric-string-value`: a `property_value` fact storing a plain decimal as `value_type: string` where the comparison is numeric (ordering operator, or an `int`/`number` peer fact) silently drops out of contradiction and feasibility checks; the suggestion gives the typed replacement.
  - Authoring: the semantic advisor, `kb_compile_intent` and `kb_model` (`mode: "requirement"`) route "only when", "only if" and "must not ... unless" clauses with one comparison on one subject property to a `forbid` rule with that exception (`requires_rule`, confidence 0.8). A conditional they cannot translate is an `ontology_gap` proposition with no observation and no strict property; `kb_model` returns an `unresolved_conditional_clause` warning. Below-threshold `kb_model` observations are tagged `review:ontology-gap` and no longer carry a claim key, since they do not ground the clause. Requirement inventory roles follow the advisor's proposition roles.
  - `kb_compile_intent` scenario and test drafts are now applicable: draft prose moves from an entity property (rejected by the entity schema, which made the what-if check and `kb_apply_plan` fail) to the step's `document.body`, `verified_by` links ride on the scenario step with tests ordered first, and the drafts' `specified_by` links merge into the requirement step.
  - Rule facts that `kb_compile_intent` and `kb_model` create are titled `Rule: <clause>` instead of `rule rule SEM-…`.

- 352d5a0: Kibi's contradiction and feasibility verdicts no longer overclaim. Two rules over a predicate that can hold several values (several readings per sensor) are now `unresolved` instead of `disjoint`, identical rules whose condition can never hold are `disjoint` rather than a `contradiction`, a rule body with a comparison Kibi cannot read never yields a `contradiction`, and integer properties are compared as integers, so `> 0` conflicts with `< 1`. A success scenario is now also blocked when its assumptions only conflict with a requirement in combination (`>= 5` and `!= 5` against `<= 5`), an exception requirement only exempts a scenario once a human approved it, and a success scenario Kibi cannot check is flagged as unknown instead of silently passing. `kb_apply_plan` refuses a plan before its first write when any step would fail the same validation `kb_upsert` runs.
  - New optional `predicate_schema` field `key_arguments` (argument names that determine the rest). Rule comparison identifies two atoms of a predicate only through it; without it, opposing rules stay `unresolved`. Comparisons of a variable with itself are decided exactly, and `int`/`integer` rule variables range over the integers.
  - Identical (alpha-renamed) opposing rules are a `contradiction` only when their shared condition provably holds: every comparison translated, the functional closure consistent, no negation, disjunction, count or temporal relation, and the constraints satisfiable. A condition that cannot hold (`X > 0, X < 0`, `X < X`, two values of a keyed predicate) makes them `disjoint`; one Kibi cannot read keeps them `unresolved`.
  - A rule variable shared by both rules counts as an integer for a `disjoint` verdict only when every declaration of it is `int`/`integer` (`N: int, N > 0` against `N: number, N < 1` is no longer `disjoint`); a `contradiction` witness must satisfy every declaration.
  - New advisory rule `rule-key-arguments-missing`: for an opposing rule pair that is `unresolved` only because a condition predicate declares no `key_arguments`, it names the predicate (`namespace:name/arity`) and the key positions (argument names when a schema exists) that would decide the pair.
  - `values_conflict/5` is domain-aware: `int` pairs use integer bounds; mixed `int`/`number` pairs stay real. A `number` keeps real semantics after unit canonicalization even when its value is integral, so `number > 0` and `number < 1` requirements no longer contradict.
  - New optional requirement fields `approved_by` and `approval_ref`. `scenario-feasibility` only accepts an exception with a non-empty `approved_by`; otherwise the violation says the exception exists but is not approved.
  - Scenario feasibility compares unit-canonicalized constraints per property and scope. Besides one assumption against one requirement fact, it reports a joint witness when the assumptions hold on their own but not together with the governing requirement constraints; the witness names a minimal set of requirements, assumption facts and requirement facts. Integer semantics apply only when every constraint in the set is `int`. The blocking rule, the proof ladder and the what-if analysis read the same witnesses; what-if scenario witnesses now carry `assumedFacts` and `requirementFacts` lists (previously `assumedFact` and `requirementFact`).
  - Success scenarios get an explicit outcome (`infeasible`, `feasible`, `feasible_by_exception`, `unknown`). `feasible` now requires every assumption to be compared with every governing constraint and the whole conjunction to be satisfiable. Unknown reasons are `no_assumptions`, `contradictory_assumptions`, `unmatched_assumption`, `incomparable_assumption` (type, unit or operator mismatch) and `conflicting_requirements`; they are reported by the new advisory rule `scenario-feasibility-unknown` and as the `unknown_scenario_feasibility` proof advisory, without changing proof status.
  - Opposing rule pairs are compared once per requirement pair; REQ-A→FACT-Z vs REQ-Z→FACT-A was previously never compared.
  - New `what_if_analysis/2` compares the current and staged KB (contradictions and infeasible scenarios) and returns `introduced`, `removed` and `unchanged` witnesses. `kb_compile_intent` blocks on any introduced conflict or infeasibility and returns the full witnesses plus the split.
  - `kb_apply_plan` runs every step through the extracted `kb_upsert` validation chain (`validateUpsertForCommit`: schema, proof receipts, relationship sources and targets, strict-lane pairing, supersedes direction, proposition-complete ingestion, grounding claim keys, predicate argument vocabulary) before the first write, treating entities and relationships created by earlier steps as present, and refuses a plan that introduces a contradiction or infeasible scenario.

- d25a626: Kibi now answers questions on a CI checkout or any detached commit, compiles a cold knowledge base minutes faster, and can stop a runaway read before it blocks other agents. On a bare SHA, search, query, status, check, coverage and graph read a snapshot of that checkout and say so in every answer, while writes are refused with the command that fixes it. A cold `kibi sync` of the Kibi repository went from about 4 min 23 s to 19 s, and `--refresh-symbol-coordinates` from about 5 min 55 s to 26 s, with byte-identical results.
  - Detached HEAD with zero or several local branches at HEAD: read-only operations (CLI routes, human commands, MCP tools) attach a read-only snapshot store (`kibi-internal/detached-head-snapshot`) compiled incrementally from the checkout's tracked sources, and add a `detached_head_read_only` warning diagnostic with the commit, branches at HEAD, store path and `writes: "refused"`. Write operations and `kibi sync` refuse with an actionable message (`git switch <branch>`, `git switch -c <branch>`, or `KIBI_BRANCH`). One branch at HEAD still attaches that branch exactly; no branch KB is ever guessed or written. `kibi engine stop/status` address the snapshot daemon, and `kibi gc` keeps the snapshot while it is in use.
  - Sync: source-owned entity lookups before retracts run in batches of 200 instead of one engine round trip per path candidate; the Prolog client wakes on the answer frame instead of a 50 ms poll; TypeScript coordinate enrichment adds every source file before the first export check, so the type checker program is built once instead of once per file.
  - Engine read limits: `KIBI_ENGINE_READ_TIME_LIMIT_MS` and `KIBI_ENGINE_READ_INFERENCE_LIMIT` (opt-in, unset by default) bound each read-only engine request with `call_with_time_limit/2` and `call_with_inference_limit/3`. A read that hits its limit fails with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded` (`kind`, `limit`) on the CLI and MCP envelopes, never with a partial answer; write requests, module loads and sync compilation are never bounded, while the read-only queries a write operation such as `kb_upsert` runs before writing count as reads and can stop it before anything is written.
  - A CLI JSON route whose runtime cannot open (a detached HEAD refusing a write, no branch to attach) now prints an `OPERATION_FAILED` error envelope on stdout, not just a message on stderr.

- a037b53: Every entity can now record who wrote it and who approved it, and `kibi migrate` brings existing knowledge bases to KB schema 6. Requirements your agent writes through `kb_upsert` are marked as agent-authored, and new advisory checks list exceptions nobody approved, exception approvals only an agent recorded, agent-written requirements no person has reviewed, and requirements that do not say why they exist; Kibi cannot verify a person's approval, so these checks show what is still waiting for one. `kibi check` now blocks superseded requirements that are still open and `source` fields that point at nothing, and `kibi migrate` closes the requirements and repairs the source fields for you (Kibi always compiles `source` from the entity's own file, so it removes leftover values that name that file or nothing), leaving only supersession cycles and source fields it cannot edit safely for review. When an upgraded semantic advisor reads existing prose differently, `kibi sync` lists every affected requirement at once and `kibi migrate` re-derives their inventories without dropping grounding.
  - New optional `origin` field on every entity type (optional on symbols): `{kind: human | agent | migration | import, ref?, approved_by?, recorded_at?}`. It is validated in the Markdown extractor, the symbol manifest, the Prolog schema (`entities.pl`, `validation.pl`), the generated entity JSON schema and the `kb_upsert` input schema, and stored as a JSON object like `proof_contract`. Unknown kinds and unknown fields are rejected.
  - `kb_upsert` and `kb_apply_plan` record `{kind: agent, recorded_at: <write time>}` on a new entity written without `origin`, and never change a stored origin when `origin` is omitted. An entity without an origin stays without one when updated. A supplied origin is written as given, with `recorded_at` filled in when missing.
  - New advisory check rules (non-blocking `qualityDiagnostics`, run by default): `exception-unapproved` (an exception that `exempts` a requirement but has no `approved_by`, so it exempts nothing), `exception-approval-self-attested` (an agent-authored exception with `approved_by` but no `origin.approved_by` or `approval_ref`) and `agent-requirement-unapproved` (info; agent-authored current requirements without `origin.approved_by`, at most 25 per check plus one summary finding).
  - `LATEST_KB_SCHEMA_VERSION` is 6; `kibi init` starts new knowledge bases at 6. The older/invalid schema warnings now point at `kibi migrate`.
  - `kibi migrate` plans new actions. `entity_origin_backfill` (automatic) stamps `origin: {kind: migration, ref: "kibi migrate v5->v6", recorded_at}` as the last frontmatter key of every authored entity without one, leaving every other byte unchanged. `semantic_inventory_rederive` (automatic, at any schema version) rewrites a drifted inventory with the current advisor: a claim whose `claim_key` and `claim_text` still match keeps its status and grounding, and a new or reclassified claim becomes unresolved, never modeled. `logic_claims` and `semantic_source_hash` are rewritten consistently, and the action re-checks its planned contract hash before writing. `semantic_inventory_review` lists inventories that cannot be re-derived safely, with the exact `kibi model --input -` command. `migration-sync` recompiles the rewritten sources.
  - Review actions with stable ids for the decisions schema 6 leaves to a person: `review_exception_unapproved`, `review_exception_approval_self_attested`, one `review_predicate_key_arguments` per predicate named by `rule-key-arguments-missing`, one `review_scenario_feasibility_unknown` per scenario, and one `review_agent_requirements_unapproved` queue for the requirements `agent-requirement-unapproved` lists. Blocking violations stay review actions as before.
  - The schema upgrade action depends on the source-rewriting actions, so approving it approves what it does. `kibi migrate` no longer plans quality actions from a branch store that was never synced (it marks the `quality` domain incomplete instead of listing every authored relationship as missing), and plans check findings for a schema 5 store before the upgrade.
  - `kibi migrate --yes` and `--dry-run` perform or preview the same backfill and re-derivations. The audit record gains `entityOriginBackfill`. Both paths are idempotent. A pre-existing quirk is fixed: the symbol-granularity step is no longer reported (or counted in the audit) when the upgrade did not include it.
  - `kibi sync` checks every requirement before failing on proposition-complete ingestion and lists all failing files in one error, with a pointer to `kibi migrate`.
  - New blocking check rules: `superseded-requirement-open` (a requirement another requirement `supersedes` must have `status: closed`; supersession cycles are reported once per cycle, naming every member and edge) and `source-path-dangling` (an authored `source` frontmatter field must name an existing workspace path, with any `#anchor` ignored, an existing entity id, or an http(s) URL; a missing `source` is fine).
  - `kibi migrate` repairs both at any schema version. `close_superseded_requirements` (automatic) sets `status: closed` on every superseded requirement that is not closed, editing only the status line. `source_path_rewrite` (automatic) repairs every authored `source` value that is redundant or dead; the authored field is dead data, since the compiled `source` is always the entity's own file and Kibi never writes the field. A value naming another knowledge file by its pre-canonical path (`documentation/<lane>/...`, or `<lane>/...` relative to the knowledge root) is pointed at that file under `.kb/` (evidence `rewrites: {entityId, file, from, to}`). A value naming the entity's own file (pre-canonical or `.kb/` spelling, `./` and `#anchor` ignored, compared case-insensitively) and a dangling value Kibi cannot map are removed (evidence `removals: {entityId, file, from, reason: self | dangling}`). Other existing workspace paths, http(s) URLs and entity ids are left alone. A removal deletes only the source line through the new `withoutTopLevelField` helper, which refuses multi-line values and any edit that would change another key; such a value gets a `review_source_path_dangling` action, its only remaining use. `kibi check` maps each `source-path-dangling` finding to the same automatic action, and its suggestion now says that `kibi migrate` removes or rewrites the value. Supersession cycles stay `review_supersession_cycle` actions. `kibi migrate --yes` and `--dry-run` perform or preview the same repairs, and the audit record gains `supersededRequirementsClosed`, `sourcePathsRewritten` and `sourcePathsRemoved`.
  - New advisory check rules: `symbol-owner-superseded` (symbols whose every owning requirement is superseded or deprecated; at most 25 per check plus a summary), `adr-unlinked` (accepted ADRs nothing links with), `adr-proposed` (info; ADRs still proposed) and `requirement-rationale-missing` (human- or agent-authored requirements with no `rationale`, no `## Rationale`/`## Why` section and no linked ADR; at most 25 per check plus a summary). Each maps to a migration review action (`review_symbol_owner_superseded`, `review_adr_unlinked`, `review_adr_proposed`, `review_requirement_rationale_missing`). `subject-key-identity` also reports one subject or claim minted as several active facts, and `subject-key-shape` also reports property keys that number a clause.
  - `kibi migrate --apply-safe --format json` and every `--input` JSON route print only the JSON result on stdout. Progress from the commands they run along the way (sync, branch ensure, migrate) now goes to stderr instead of landing ahead of the JSON.
  - New optional requirement field `rationale` (a non-empty string): why the requirement exists. It is explanation only and never part of the checked meaning or the semantic fingerprint.

  ## Migrating
  1. Update `kibi-core`, `kibi-cli` and `kibi-mcp` together.
  2. Run `kibi migrate --format json > plan.json` and review it. Expect one `entity_origin_backfill` action (its evidence counts the entities per type), one `semantic_inventory_rederive` per drifted requirement, one `close_superseded_requirements` action listing the superseded requirements that are still open, one `source_path_rewrite` action listing the source values it will rewrite or remove, and review actions for anything you must decide. A KB already at schema 6 still gets the two lifecycle actions, because their findings now block `kibi check`.
  3. Apply the automatic actions: `kibi migrate --apply-safe --approved-plan-hash "$(jq -r .planHash plan.json)"`. This stamps origins, re-derives inventories, closes superseded requirements, repairs redundant or dead `source` fields, writes schema 6 to `.kb/manifest.json` and syncs. `kibi migrate --yes` does the same without a plan.
  4. Run `kibi migrate --format json` again for the remaining review actions. For each `review_exception_unapproved`, either record who approved the exception (`approved_by`, plus `approval_ref`) or remove its `exempts` link. For each `semantic_inventory_review`, follow the listed `kibi model` and `kb_upsert` steps. For each `review_predicate_key_arguments`, declare `key_arguments` only if the predicate really is single-valued per key. For each `review_supersession_cycle`, decide which requirement is current, delete the `supersedes` link that points at it, and close the others. A `review_source_path_dangling` appears only for a `source` field Kibi cannot edit safely (one spanning several lines, for example); have a person remove it by hand, or replace it with the single line the action names. The advisory queues (`review_symbol_owner_superseded`, `review_adr_unlinked`, `review_adr_proposed`, `review_requirement_rationale_missing`) do not block and can be worked through over time.
  5. Commit the rewritten `.kb/` files. The origin backfill touches every entity file once; rerunning `kibi migrate` changes nothing.

- f8fff87: The telemetry acceptance and remediation reports now show whether agents look requirements up before they change requirement-linked code. A new `lookup_before_first_edit` metric gives, per host session, the share of sessions that ran `kb_search` or `kb_query` (through MCP or the CLI) before their first edit of a file whose symbols implement a requirement. Sessions that edited first appear in the report with the file and its exact `.kb/usage.log` line. The data comes from opt-in hook rows that every Kibi host plugin now writes when `KIBI_DIAGNOSTIC_MODE` is set; nothing is recorded otherwise.
  - `kibi usage-metrics` / `kb_check` telemetry acceptance: new metric `lookup_before_first_edit` (threshold `>=` policy `lookupBeforeFirstEditMinimum`, default 1) with evidence `unguidedEditPaths` and `lookupOperations`. It is `not_applicable` when no host hook recorded a requirement-linked edit, so logs without hook rows are judged as before. A failed metric adds the advisory diagnostic `lookup_before_first_edit_bypassed` (rank 35).
  - `kibi usage-remediation`: one event item per session whose first linked edit had no earlier lookup, pointing at that hook row.
  - `parseTelemetryUsageLog` still returns only Kibi operation rows; hook rows stay attached to the returned array (read them with `partitionTelemetryUsage`). Remediation `logLine` values now count hook rows and blank lines, so they match the file.
  - `kibi-agent-core/hook-usage-log`: shared `appendHookUsage` / `appendHookUsageRows`, `kbUsageTrace` and `editTraces`. Hook rows (`interface: "hook"`) carry `host`, `session_id`, `hook_action` (`kb_usage` or `edited`), `kb_operation`, `path`, `path_kind` and `requirement_ids`. `hostKbOperation` recognizes MCP tool names and `kibi <route>` shell commands; `extractEditedPaths` reads `apply_patch` headers.
  - Claude Code: `edited` rows now carry the file's `requirement_ids`, and every row names its `host`. Cursor (`postToolUse`), Codex and ZCode (`PostToolUse`) and OpenCode (`tool.execute.after`) now write the same `kb_usage` and `edited` rows.

- 1012d1c: The Kibi MCP server now offers 16 tools instead of 23, so agents load less tool text and pick the right call more often. Skills, prose modeling and upsert validation each moved behind one tool, and the remote SPARQL and job-polling tools are off unless you turn them on. CLI routes are unchanged.
  - `kb_skills` with `action: "list" | "load" | "read"` replaces `kb_skills_list`, `kb_skills_load` and `kb_skills_read`.
  - `kb_model` with `mode: "analyze" | "requirement" | "predicates"` replaces `kb_semantic_advisor`, `kb_model_requirement` and `kb_suggest_predicates`; inputs are unchanged and results carry the routed payload plus `mode`.
  - `kb_upsert` with `dryRun: true` replaces `kb_validate_upsert`: it validates and returns the advisor receipt without writing and reports both write effects as skipped. `kb_upsert` checks its input schema first, so a payload with an unknown field or a wrong enum value now fails with an input error naming the field instead of a `valid: false` receipt; the CLI `validate-upsert` route keeps the lenient preview.
  - `kb_sparql_remote` and `kb_job_status` register only when `KIBI_MCP_OPTIONAL_TOOLS` names them (comma-separated, or `all`). Without `kb_job_status`, `kb_check` with `async: true` runs synchronously.
  - The operation catalog gains composite `kb_skills` (CLI `kibi skill`) and `kb_model` (CLI `kibi model`); the narrower operations and their CLI routes remain. Usage telemetry records the routed operation name, so acceptance metrics are unchanged.
  - Semantic advisor warnings and predicate diagnostics name `kb_model (mode requirement)` and `kb_model (mode predicates)` instead of the removed tool names.
  - Migration: replace calls to the removed tool names as above. The frozen `tools/list` fixtures change accordingly.

- 68298a6: Proof receipts no longer pile up: every `kibi prove` keeps only the receipts that can still decide proof, and the new `kibi proof compact` trims stores written before this release without changing any coverage decision. One failing step in a `command` proof integration now fails only the tests that own it when the command reports per-test results, and the `kibi prove` summary names the failing step. Freshness is computed from repository-relative paths and file contents, so CI and a local checkout of the same commit agree on what is proven.
  - Receipt compaction (`kibi.proof-receipt-compaction.v1`) runs on every ingest (`kibi prove`, `kb_ingest_proof`). It keeps the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot. Kept receipts are the originals in their original order; ingest refuses any compaction that would not be an ordered subsequence. Per-test ingest results report `compacted`, the number of receipts dropped.
  - `kibi proof compact [--test <id>] [--dry-run] [--json]` applies the same policy once to an existing store against the live snapshot and each test's current binding. Only the `proof_receipts` frontmatter block is rewritten; invalid histories are reported as skipped and left untouched. `kibi proof prune` now patches the same block instead of re-rendering the whole document.
  - `command` integrations receive `KIBI_PROOF_TEST_REPORT`. A `kibi.proof-test-report.v1` written there (`tests[].test_id`, `outcome`, `steps[]` with `step_index`, `command`, `outcome`, `exit_code`) partitions the run: each test is ingested against an artifact built from its own steps, and partition artifacts are kept next to the whole-run artifact as `<integration>.<outcome>.json`. A missing, malformed or incomplete report, or a failing process whose report blames no test, keeps the previous whole-run evaluation. Each `runs[]` entry of the summary carries `attribution` (`per_test` or `aggregate`), `attributionReason` and `failedSteps`.
  - The workspace snapshot keys each path in Unicode NFC. Receipt bindings locate the test document and each symbol's `sourceFile` through a normalized repository-relative path; a `sourceFile` outside the repository contributes the fixed `outside-workspace` marker instead of local file content. Ingest and coverage share one binding computation (`currentReceiptBindingHash`). Existing snapshots and bindings for ASCII, in-repository paths are unchanged.

- 1012d1c: Scenarios can now say what outcome they expect and what they assume, and Kibi checks that against your requirements. A scenario that expects success while assuming a value a current requirement forbids (for example a zero-quota call when calls need remaining quota) is reported by `kb_check` and blocks proof of the requirements it specifies. An intended exception is recorded as an approved exception requirement instead of weakening or editing the rule.
  - New scenario property `expects` (`success`, `rejection`, `error`), new relationships `assumes` (scenario → `property_value` fact) and `exempts` (exception req → base req).
  - New canonical `kb_check` rule `scenario-feasibility` with witnesses naming the scenario, requirement and both facts. An exception applies when a current requirement `exempts` the base requirement and is `specified_by` the scenario.
  - The proof ladder's scenario stage reports `infeasibleScenarios`, sets status `blocked`, and adds the `infeasible_scenario` gap; coverage repair plans map it to the scenario phase.
  - Scenarios without `assumes`, or that expect rejection or error, are not checked; no violation is not proof of feasibility.

- 1012d1c: `kb_search` now answers questions. Ask it "how should Kibi handle a detached HEAD?" and it returns the current requirements that govern the topic, what they require to stay true, the decisions behind them and what verifies them, with superseded requirements listed separately so they are never read as current policy. Each governing requirement also says what the existing checks report about it (contradictions, infeasible scenarios, approved exceptions and what is still undecided), and the answer names the KB snapshot it came from. A warm `kibi search`, CLI start-up included, now takes about 2 seconds instead of 4 to 6 on the KBs we measured (Kibi's own and a 110-requirement application KB).
  - The default `rankingMode` is `intent-v1`; pass `rankingMode: "legacy"` for the previous lexical ranking. Question words, including the frame of "what governs X?" and "what must stay true when X?", are ignored, terms are stemmed and weighted by rarity, and superseded, deprecated or rejected entities are ranked lower with a `demoted:` reason. Results flag `ambiguous` when the top matches are too close to call and report `truncated`.
  - New `answer` input (default true) adds `data.answer` (`kibi.search-answer.v1`): `governing` requirements with `via`, linked `facts`, `scenarios`, `tests` (direct or reached through a scenario, marked by `via`) and `adrs`; `rationale`; `notGoverning` with `supersededBy`; `observations`; a `note` that absence is not evidence. It follows `supersedes` chains to the current requirement and stays under 16 KB, clipping titles and dropping lower-ranked entries when needed.
  - Each governing requirement carries a `verdict` (`contradiction`, `infeasible`, `unknown` or `none`) with the domain-contradiction and scenario-feasibility `witnesses` that name it, `exceptions` (requirements that `exempts` it, with `approvedBy`) and `unknowns` (unresolved rule overlaps, scenarios of unknown feasibility, ambiguous or ontology-gap clauses, a missing clause ledger, or checks that could not run). `rationale` ADRs carry their `source` path and a decision `excerpt`. The answer-level `scope` gives `branch`, `snapshotId` and `syncedAt`. Under the byte ceiling, excerpts are dropped before any governing requirement and a verdict keeps its status when its witnesses are dropped.
  - kibi-core: `discovery:search_answer_verdicts_json/2` computes those verdicts for the named requirements only (no whole-KB scan), reading functional-predicate declarations once per call instead of once per compared rule pair; `status:status_scope_dict/1` reports the attached snapshot id and sync time without a freshness scan.
  - Latency: the answer layer fetches edges, entity rows and verdicts in a handful of batched engine queries instead of one round trip per hop and per linked entity, graph neighbours of the ranked matches load in one query, Markdown bodies are read once per search, and each candidate is tokenized once across both ranking passes.
  - Graph links in the answer are discovery, not proof, and a `none` verdict means no check named the requirement; use `kb_check` and `kb_coverage` for full consistency and proof status.

- 1012d1c: Kibi no longer says "no conflict" when it could not tell. Numeric requirements are compared exactly, so "the total must be greater than 0" now conflicts with "the total is 0", and a requirement whose clauses are not all modeled is reported as an incomplete analysis instead of a clean pass. Rules written as typed logic are compared three-valued: contradiction, disjoint or unresolved.
  - New `intervals.pl` decides one-variable numeric constraints exactly, including strict `gt`/`lt` bounds; `values_conflict/5` uses it for every operator pair.
  - The proof ladder's contradiction stage returns `status: unresolved`, `outcome: analysis_incomplete` (reason `unresolved_propositions`) when the semantic inventory has unresolved propositions.
  - `kb_model_requirement` and the strict-claim schema accept `gt` and `lt`.
  - The modeling round trip keeps what it modeled: `kb_compile_intent` writes the full semantic inventory (`semantic_clauses`, `semantic_inventory`, inventory hash and `logic_claims`) onto the requirement step, runs a rolled-back what-if contradiction check over the whole plan, and `kb_apply_plan` repeats that check before any write. "may … only" clauses are classified as normative.

### Patch Changes

- 1012d1c: Kibi keeps answering from the right place when you work in a git worktree, a detached checkout, or on a machine without Prolog. Host launchers no longer pin the MCP server to the first workspace, so per-call workspace routing keeps working, and a missing Prolog runtime points at `kibi doctor` instead of failing opaquely.
  - Claude Code, Codex, Cursor and Z Code launchers set `KIBI_MCP_ATTACH_ROOT` instead of `KIBI_WORKSPACE`; the server starts in that directory without disabling routing. `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT` and `KIBI_ROOT` still pin.
  - A detached HEAD whose commit is the tip of exactly one local branch attaches that branch's KB.
  - `kb_status` reports `swipl_*` error codes with a `kibi doctor` remediation when the Prolog runtime cannot be resolved.
  - CI and publish check that the committed Claude hook bundle matches its source.

- Updated dependencies [89870c1]
- Updated dependencies [9ab84a4]
- Updated dependencies [352d5a0]
- Updated dependencies [d25a626]
- Updated dependencies [a037b53]
- Updated dependencies [1012d1c]
- Updated dependencies [1012d1c]
- Updated dependencies [1012d1c]
  - kibi-core@0.15.0
  - kibi-plugin-builtin@0.4.1

## 2.4.0

### Minor Changes

- f93dcdd: Bootstrap no longer learns only from the code. The agent now starts with a short interview: it asks where product intent already lives (issue trackers such as Jira or YouTrack, wikis, specs, decision logs), which sources are authoritative or stale, and reads them through its own connectors. The bootstrap plan records those sources and the intent claims harvested from them, so each requirement taken from a ticket or page cites it and the citation is part of the approved plan hash. Kibi still never contacts those sources itself.
  - feat(cli): `kb_plan_bootstrap` / `plan-bootstrap` accept `bootstrapContext.knowledgeSources` (id, kind, title, locator, authority, optional connector) and `bootstrapContext.intentClaims` (statement, sourceId, reference, optional excerpt). Both are normalized into `declaredContext` and bound into `planHash`. Grounded claims from authoritative or supporting sources become `req` candidates with `sourceKind: intent_claim`, citation evidence, and `text_ref: <sourceId>:<reference>`. Ungroundable claims become authoring follow-ups, stale sources are suppressed with `stale_knowledge_source`, and claims citing undeclared sources are reported as non-blocking diagnostics. A `needs_context` plan without declared sources asks for them.
  - feat(skills): `kibi-bootstrap` 3.1.0 leads with the source interview before planning; the MCP `/kibi-bootstrap` prompt and the Cursor and ZCode commands follow it.
  - docs: README, landing page, quick start, and install guide lead with a copy-paste agent setup prompt; manual installation moves behind a toggle.

- cf2dba8: Branches that each add symbols no longer have to hand-resolve `.kb/symbols.yaml`. The new `kibi merge-driver` command plugs into Git as a merge driver and merges Kibi's symbol manifest and relationship shards by record id, so concurrent additions merge cleanly while genuine disagreements still stop with conflict markers. A copyable GitHub Actions workflow applies the same merge to open pull requests whenever the default branch moves.
  - feat(cli): add `kibi merge-driver <base> <current> <other>` (Git `%O %A %B`), a three-way id-keyed merge for `.kb/symbols.yaml` and `.kb/relationships/*.yaml` that keeps both sides' additions, applies one-sided edits and deletions, unions concurrent relationship/link additions, and falls back to `git merge-file` markers with exit 1 on a real conflict.
  - docs: add `docs/examples/github/kibi-kb-merge.yml` and the "Merge conflicts in Kibi manifests" section of the GitHub integration guide.

### Patch Changes

- 22857bf: Adding or editing a symbol that lives in a decorated Python file no longer fails. With the Tree-sitter plugin active, `kb_upsert` aborted with "Cannot refresh incomplete source analysis … Python decorators are not evaluated" and rolled the write back, even though `kibi sync --refresh-symbol-coordinates` handled the same file. Upserts now bind the declaration the same way sync does, and coverage repair plans report those symbols as refreshable instead of failing.

  When the Kibi MCP server keeps running after Kibi is upgraded or reinstalled, its tools used to fail with a bare "Cannot find module …" error. The error now says the server is running from files that are no longer installed and must be restarted, and that the project CLI works meanwhile.
  - kibi-cli: targeted symbol coordinate refresh (`kb_upsert`) and `inspectCoordinateRepairs` pass `allowPythonDecoratorCoordinates`, matching `sync --refresh-symbol-coordinates`.
  - kibi-mcp: legacy `kb_symbols_refresh` helpers pass the same flag; tool failures caused by missing modules carry a restart hint.

- 5a217be: One switch now turns on usage telemetry everywhere. Until now, the CLI ignored `KIBI_DIAGNOSTIC_MODE` and only listened to its own `KIBI_CLI_DIAGNOSTIC_MODE`. An operator who opted in for the MCP server therefore still recorded nothing from agents that call Kibi through the CLI. CLI rows also lacked the host, version, and checkout fields that MCP rows carry, so the two surfaces could not be compared.
  - Honor `KIBI_DIAGNOSTIC_MODE` (`1` or `true`) in the CLI JSON routes; keep `KIBI_CLI_DIAGNOSTIC_MODE` as the older spelling.
  - Stamp `host`, `package_version`, and `workspace_root` on CLI usage rows; `host` comes from `KIBI_HOST`/`KIBI_MCP_HOST` or a Claude Code shell, else `unknown`.
  - Skip `interface: "hook"` rows in `parseTelemetryUsageLog`, so acceptance, `usage-metrics`, and `usage-remediation` only see Kibi operations.
  - Strip the telemetry opt-in from sandboxed test CLIs unless a test sets it explicitly.

## 2.3.0

### Minor Changes

- 7aa1471: Kibi can now run without a hand-installed SWI-Prolog. It looks for an explicit `KIBI_SWIPL` executable first, then the tested SWI-Prolog build shipped in the new `kibi-swipl` platform packages, and only then `swipl` on `PATH` (9.0 or newer). `KIBI_SWIPL=system` skips the bundle. `kibi doctor` now reports which runtime was chosen (source, path, version), checks that every required library loads, and explains which platform package to add when the bundle is missing. A running Kibi engine that was started with a different SWI-Prolog is restarted instead of reused. Release builds now ship the tested SWI-Prolog for Linux x64, Linux arm64, macOS arm64, and macOS x64 inside the `kibi-swipl-<platform>` packages, and an install that skips optional dependencies still succeeds and explains which package to add.
  - kibi-cli: add `resolveSwipl()` (env, bundled with manifest and SHA-256 verification, PATH), a per-process cache, and `SWI_HOME_DIR` for bundled builds in both `PrologProcess` spawn paths.
  - kibi-cli: engine handshake and requests carry the resolved `<bin>@<version>`; the daemon rejects mismatches and clients replace a mismatched daemon.
  - kibi-cli: `doctor` SWI-Prolog check uses the resolver and loads all required libraries.
  - kibi-runtime: depend on `kibi-swipl`; keep it and the platform packages external in both bundles.
  - kibi-cursor: the worktree resolver accepts `KIBI_SWIPL` or a bundled `kibi-swipl-*` binary in the candidate's installed packages.
  - Release: the publish workflow builds the SWI-Prolog archives in its own run, verifies each SHA-256 sidecar, pinned provenance, and binary checksum, materializes symlinks (npm drops them), packs the four platform packages, and installs the packed tarballs with npm on runners with no SWI-Prolog before publishing; a separate dry-run workflow packs without any publish path.
  - New packages `kibi-swipl` and `kibi-swipl-<platform>` start at 1.0.0 outside this changeset and version together through a changesets fixed group.

- db5376c: Projects can now opt into impact reviews that bind a change to its exact source, knowledge decisions and trusted analysis policy. Kibi validates both staged changes and a complete pull-request diff, rejects stale review evidence, and lets agents prepare an unauthored review template through the CLI or MCP instead of hand-assembling one. Every decision and reviewer field stays for an agent to write; preparation never approves or proves anything.
  - Add versioned impact policy and review schemas, immutable review fingerprints, reviewed Python decorator coordinate migration and the trusted aggregate `check-diff` command.
  - Add the read-only `prepare-impact-review --input` CLI route and `kb_prepare_impact_review` MCP operation; regenerate the bundled operation-access catalog for the agent integrations.
  - Keep the sample CI workflow inactive until it is adopted on a protected target.

- db5376c: Kibi can now analyze source in Python, Go, Rust and a broader set of common programming and configuration languages, offline, while JavaScript and TypeScript keep working as before. Staged checks read source and authored knowledge from one immutable Git tree, inspect both sides of every change, and keep incomplete analysis explicit instead of treating it as proof. Large files now return an explicit analysis failure instead of a second validation error.
  - Add the asynchronous `kibi.symbol-extractor.v2` contract with validated UTF-16 ranges, bounded inputs and host-assigned provenance, plus a ts-morph v2 adapter.
  - Add the optional `kibi-plugin-treesitter` package with pinned WASM grammars, queries, licenses and an approved-analyzer closure verified before import.
  - Capture staged and explicit-diff snapshots from Git objects; merge duplicate symbol-manifest records deterministically and fail conflicting authored fields with `SOURCE_DUPLICATE_CONFLICT`.
  - Add opt-in, bounded parser-phase and Prolog round-trip timing observations that never enter result schemas.

- 8622782: An impact review prepared on one machine now still validates in CI, and the MCP server and the CLI agree on whether it is current. Checks only block on incomplete source analysis the author can act on: the committed side of a change never blocks, and a known analyzer limitation such as a Rust macro or a Python decorator matters only where it overlaps the changed lines. Syntax, parse, timeout and integrity problems in the staged file still block. Long-running hosts no longer grow memory with every analyzed file, and Tree-sitter analysis reuses warm workers instead of starting one per file.
  - Identify the impact evaluator by its contract version and the canonical JSON of the schemas it consumes, instead of hashing the installed file tree and `process.version`. Identify the builtin analyzer runtime by its package identity rather than its installed tree.
  - `kibi-runtime` bundles the CLI operations again (`kibi-cli` is a build-time dependency only); it no longer installs `kibi-cli`.
  - Add one shared analysis gate (`analysisObligation`) used by staged checks, impact-review preparation and validation, and impact reports.
  - Classify source paths from a single extension table in `source-classification`, with parity tests against the Tree-sitter catalog and the builtin extractor.
  - Remove analyzed files from the ts-morph project after each v1 and v2 analysis.
  - Add an optional `timeoutMs` budget to `SymbolExtractorV2AnalyzeInput`; the host sets it slightly below its own deadline, so providers report their own timeout. Tree-sitter uses a bounded, persistent worker pool with grammars loaded once per worker, and the host analyzes up to four changed files at a time.

### Patch Changes

- 58083a1: Kibi can use workspaces reached through native filesystem aliases, including macOS temporary paths, without rejecting valid source writes or confusing engine identity. Long temporary paths use a private shorter engine socket path instead of failing to start. GitHub scaffolding preserves the actual README filename on case-insensitive filesystems. Source writes still reject traversal and symlinks that escape the workspace.
  - kibi-cli: canonicalize existing filesystem ancestors before authored-path containment checks and engine identity comparison; reject dangling symlinks.
  - kibi-cli and kibi-runtime: choose an owned deterministic runtime directory whose complete Unix socket path fits the platform byte limit.
  - kibi-cli: select README candidates by actual directory-entry spelling while preserving priority and broken-symlink checks.

- a260a34: Kibi's CLI pre-release tests now check Git-hook behavior using the Git executable available on each runner. The init error test runs in its own Git workspace, so a host checkout cannot change the result. This keeps the release check meaningful across supported build environments; installed CLI behavior is unchanged.
  - kibi-cli tests: resolve the actual Git executable for the generated-manifest hook fixture.
  - kibi-cli tests: isolate the mocked init branch error from the ambient checkout.

- 3d78159: Setting up Kibi no longer starts with installing SWI-Prolog. The documentation now says that Linux (x64 and arm64, glibc 2.28 or newer) and macOS (Apple silicon and Intel) need nothing beyond Node.js 22, explains the lookup order and the `KIBI_SWIPL` and `KIBI_SWIPL=system` overrides, and shows how `kibi doctor` reports which SWI-Prolog is in use and what to do when an install skipped the bundled runtime (`--omit=optional`, pnpm `supportedArchitectures`). Manual instructions stay for Alpine and native Windows. The GitHub Pages report workflows that `kibi init` can write no longer install SWI-Prolog by hand, because `npm ci` brings the bundled runtime with it.
  - kibi-cli: drop the `apt-get install swi-prolog` step from the shipped `kibi-report.yml` and `kibi-badge.yml` workflow templates.
  - kibi-cursor, kibi-claude: README and plugin manifest prerequisites say SWI-Prolog is bundled on supported platforms and only needed on `PATH` elsewhere.
  - Kibi's own CI and proof now run the pipeline-built bundled SWI-Prolog (one job keeps a system install with `KIBI_SWIPL=system`), and the release dry run follows the README quick start with the packed tarballs on four platforms; neither ships in a package.

- Updated dependencies [db5376c]
- Updated dependencies [555cf95]
- Updated dependencies [8622782]
- Updated dependencies [db5376c]
  - kibi-plugin-sdk@0.4.0
  - kibi-plugin-builtin@0.4.0
  - kibi-core@0.14.1

## 2.2.0

### Minor Changes

- f7c2d56: A full proof campaign spends much less time repeating the same packed test and rewriting the knowledge base once per receipt. Contracts that declare the identical command now share one execution, and the receipt campaign commits in batches instead of flushing the journal after every test. Selecting which tests to prove no longer loads every receipt history up front.

  Receipt source documents stay protected through the batched commit, and a failed batch restores every uncommitted document while preserving earlier committed batches.
  - Run each distinct proof-step command once and record that attempt on every contract that declared it.
  - Honor `KIBI_PROOF_STEP_CONCURRENCY` (default 1) when distinct commands can run together.
  - Reuse one snapshot-keyed compilation of the packed end-to-end suite across proof steps.
  - Commit proof-receipt upserts with `kb_commit_upsert_batch/2`, one transaction and one journal flush per batch of 25.
  - Select proof campaigns in bounded pages containing only test ids, contracts, and bindings; receipt histories remain unloaded.
  - Hold the workspace source lock through receipt publication and batched Prolog commits, and restore every uncommitted receipt source on failure.

- 2723322: Proof receipts now go stale when the code they vouch for changes. In the default per-contract binding mode, a receipt was meant to stay fresh only until its test's code or the production code behind it changed. In practice the code scope was always empty, so editing production code never marked any receipt stale. Receipts now bind to the current source of the test's own contracted code and of every production symbol linked `covered_by` the test. Edits to unrelated files still leave them fresh.

  **Upgrade note:** this changes every receipt's binding hash, so all existing receipts become stale once after upgrading. Run `kibi prove` (for example `kibi prove --all`) to record fresh evidence. Keep `covered_by` links accurate, since they now decide which production code each receipt covers.
  - The code scope is the contract's `required_proofs` symbols, any `proof_bindings` symbols, and all symbols linked `covered_by` the test. Receipt ingest and coverage derive it through one shared function (`operations/proof/code-scope.ts`), so they always agree.
  - Scope hashes use each symbol's current source-file content, not the coordinate artifact. The coordinate overlay discarded `sourceHash`, which is why the scope was empty, and it also dropped entries after any edit. A deleted source file hashes as `missing`.
  - Ingest loads `covered_by` links outside its per-test binding `try`/`catch`, so an engine failure fails the ingest instead of writing receipts without a binding hash.
  - File hashes and the manifest's symbol-to-source mapping are cached by modification time and size.

- f01838e: Search works again on a mature knowledge base, including searches grounded to a changed source file, and it no longer spends a large share of an agent's context on results it has not chosen yet. Search used to ask Prolog for up to 100,000 full entity records regardless of the requested limit, so on this repository even `limit: 5` failed outright with a bounded-output error. Results now come back as summaries by default, which cut a five-hit response from 154 KB to 3 KB while keeping ranking, ordering, and totals identical.
  - Page indexed candidate retrieval in bounded chunks instead of one unbounded read, fixing the `ENOBUFS` failures without changing the candidate set or ranking.
  - Use paged source-file queries for intent searches with source locations instead of falling back to an unbounded full-KB read.
  - Add `fields` to `kb_search`: `summary` (default) returns identifying metadata plus score, reasons, and snippet; `full` returns complete entity bodies as before.
  - Teach the bundled `kibi-usage` skill when to select intent-v1 ranking with grounded facets or source locations, and when a literal lexical query is still the right choice.
  - Fix an unhandled `EPIPE` between tests when an engine socket write lost its peer.

- 0128b56: Kibi now helps agents keep one shared vocabulary instead of letting every requirement invent its own. `kibi check` warns when two unrelated requirements state the same obligation. Units are compared in canonical form, so "30 min" matches "1800 s", and each warning names the exact facts involved. It also flags subject keys copied from a requirement ID, subject keys that don't follow `component.aspect`, predicates whose arguments read like prose, and entity files whose name doesn't match their ID. All of these are non-blocking warnings or info notes, so existing knowledge bases keep passing.

  When you model a new requirement, Kibi now ranks the subjects that already exist and either reuses one or explicitly declares a new one. It also flags claims that look like possible duplicates. An intentional restatement can be recorded with the new `restates` relationship. Skills and docs now recommend naming entities by the behavior they govern (`REQ-cli-gc`) instead of a sequence number (`REQ-042`). Existing numbered IDs stay valid.

  Predicate schemas can now declare the allowed values for an argument, plus the old spellings that map onto them. New facts must use those values. `kibi check` reports predicate facts that don't match any schema, and `kibi migrate` can fix the mechanical cases after you approve the plan hash. It moves a fact to the only namespace whose schema matches, and rewrites old spellings to the declared value. Everything that needs judgment stays a review item.
  - core: new `semantic_quality.pl` (`entity-id-style`, `domain-redundancy`, `domain-implication`, `subject-key-identity`, `subject-key-shape`, `ontology-quality`) and `units.pl`. Unit canonicalization is used for comparison only, and unknown or ambiguous units such as `KB` are never equated. Adds the `restates` req→req relationship and an optional `diagnosticSeverity` in the rule registry. Adds `:- encoding(utf8)` to modules that contain non-ASCII text.
  - cli/mcp: `restates` is wired through the extractors, schemas, and mutation paths. `entity-id-style` warnings are reported on `kb_upsert` creates and on staged added or renamed entity files. `kb_model_requirement` returns `vocabularyAlignment` (subject decision, candidates, redundancy candidates, stamps, `fallbackUsed`). Ontology-quality thresholds can be set with `KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO` / `KIBI_ONTOLOGY_QUALITY_MIN_FACTS`. `kb_compile_intent` create mode now keeps a caller-supplied `requirementId`. `kibi check --staged` now also prints its pass line when metadata-only staged changes have only advisory findings, matching the staged-symbol path.
  - cli/mcp: `predicate_schema` facts accept `argument_constants` and `argument_aliases`, stored like `rule_ir` as JSON. `kb_upsert` / `kb_validate_upsert` reject malformed vocabularies and predicate facts that use undeclared values or aliases. `kb_suggest_predicates` binds aliases to their constant and leaves undeclared values unbound. The new advisory TypeScript rule `predicate-schema-conformance` checks predicate facts against project schemas and the built-in catalog. Its mechanical repairs become automatic `predicate_schema_alignment` migration actions that carry the exact `kb_upsert` input and re-read the fact before writing.
  - core: `ontology-quality` findings name the prose-like arguments.
  - plugin-sdk: new `kibi.vocabulary-alignment.v1` capability (`rankSubjects`, `compareClaims`) with result validators.
  - plugin-builtin: deterministic offline provider (IDF-weighted subject ranking and negation- and quantity-aware claim similarity).
  - plugin-jev: Jev-backed provider. It runs in replace, augment, or shadow mode with builtin fallback, and makes network calls only when it is activated for `kb_model_requirement`. `kb_check` never calls a provider.
  - runtime and agent adapters: regenerated skill mirrors with the naming guidance and `restates` direction docs.

### Patch Changes

- 173ed66: `kibi coverage`, `kibi proof impact`, and requirement health reports no longer break with "Predicate or file not found" once a project's proof receipt history grows large. Per-contract proof binding used to load every test together with its full receipt history in a single answer. Past the 8 MiB output cap, that answer terminated the engine's Prolog session, and later queries quietly ran in throwaway processes without the attached KB. The engine now reads only the small per-test data it needs, and it restarts and reattaches its session if a query ever overflows or times out. Failures are reported instead of being hidden behind stale results.
  - Engine daemon: a lost interactive SWI session (output overflow, timeout, crash) is recycled before the next request. Recycling restarts the process, reattaches the branch store, and reloads the preloaded and client-loaded modules. The overflowing request still fails with the explicit ENOBUFS error.
  - `PrologProcess`: once started, a lost process never falls back to one-shot execution; queries raise `PrologProcessTerminatedError` with the cause. New `oneShotMode`/`needsRestart()` accessors and an injectable `maxOutputBytes` cap.
  - `runOperationJsonQuery`: isolated (one-shot or unstarted) ports report `oneShotMode` and receive the combined module-load + call goal.
  - `perContractTestBindings`: reads the paged `kb_query_proof_contracts` projection (now carrying `source`) and propagates engine failures instead of silently returning `null`.
  - `kb_query_proof_contracts` (kibi-core) matches both the in-session `kb:Key` and the reloaded `urn-kibi:Key` property URIs. Before this, a reloaded store projected no tests.
  - Receipt-bearing bulk loads now page: proof ingest candidate selection, `kibi proof prune`, legacy receipt migration, and the full-KB quality projection (no unbounded all-entities probe).

- e5ab646: `kibi status` and every CLI command start faster on large knowledge bases. On
  this repository, `kibi status` for a fresh KB drops from about 3 seconds to
  about 1.7, and a command that needs neither schema validation nor symbol
  extraction starts about 0.5 seconds sooner.
  - `kb_status_json` skips the full-entity stale-reason scan when the KB is
    fresh, because a fresh verdict already rules out every stale reason.
  - `kibi-plugin-builtin` loads ts-morph (the TypeScript compiler) on first
    symbol analysis instead of at import time.
  - The CLI compiles its entity and relationship JSON schemas on first use.

- 10acf1b: `kibi init` now distinguishes a genuine non-repository directory from directories where Git refused operationally (dubious ownership, unreadable `.git`, permission or timeout failures). The latter are refused with Git's own diagnostic before any workspace write, even when `KIBI_BRANCH` is set, instead of silently falling back to standalone workspace creation. Hook reporting for a configured `core.hooksPath` is now neutral about what happened: installation claims come only from the per-hook outcomes, so all-skipped runs no longer print "hooks were installed".
- 7ae80fb: Git hooks now install and diagnose at the path Git actually executes, so Kibi
  enforcement works from linked worktrees and repository subdirectories. Kibi
  also refuses hook directories that escape through a symlink and reports skipped
  hooks honestly, without implying that a hook was installed.

  `kibi init` no longer assumes `.git` is a directory: it asks Git for the
  effective hooks directory (`git rev-parse --git-path hooks`), so running init
  inside a linked worktree installs into the repository-common hooks directory
  (previously it crashed with `ENOTDIR`), and running init from a subdirectory
  creates `.kb/` at the repository root instead of a stray nested copy. The
  containment guard resolves real paths, including the nearest existing ancestor
  when the final hooks directory does not exist, while allowing Git's default
  common-directory layout. `kibi doctor` diagnoses the same effective directory,
  so it no longer reports hooks as missing inside worktrees where they are
  active, and it states the configured `core.hooksPath` when one redirects
  enforcement. Hook installation reports per-hook outcomes; only installed and
  updated hooks appear in the success summary, and an all-skipped run says that
  no hooks were installed.

  Technical summary: `resolveGitRepositoryContext` resolves worktree root, Git
  dir, common dir, effective hooks dir, and config origin; real-path containment
  also checks a missing directory's nearest existing ancestor; `installGitHooks`
  returns per-hook outcomes; init derives `.kb`, gitignore, symbols manifest, and
  hook targets from the resolved context; doctor checks that same directory.

- 6c72dd8: When a Kibi write is rejected, the result no longer claims it wrote to the KB or the workspace. Agents that read the `effects` list to decide whether to re-check or retry now see `failed` (with the error code) when an operation ran and stopped, and `not_applicable` when the input was rejected before anything ran. A `kb_delete` call that only returns a deletion plan now reports its writes as not applicable too, because `kb_apply_plan` performs them.

  Deleting an entity file that was created but not yet staged in Git no longer breaks later syncs. Before this fix, the leftover recovery receipt made every `kibi sync` fail with "Pending source is missing" until the branch KB was recovered. Adding or removing a symbol through `kb_upsert` or a deletion plan also no longer re-wraps unrelated long titles in `.kb/symbols.yaml`, which used to leave noisy diffs that the next coordinate refresh reverted.
  - cli: `toKibiResult` derives effect statuses from the envelope outcome. Error envelopes report declared effects as `failed` (carrying `error.code`) or, with `attempted: false`, as `not_applicable`; explicit `effectFailures` still take precedence. The CLI protocol marks input-validation errors as not attempted, and the MCP timeout envelope inherits the same rule.
  - cli: payloads can list `skippedEffects`, which the envelope reports as `not_applicable`; `kb_delete` sets it on plan-only results and its output contract declares the field.
  - cli: `kb_apply_plan` retires the pending-source receipt of every source it deletes (new `retirePendingSourceReceipt`), on first apply, replay, and journal recovery alike.
  - cli: authored YAML round-trips (symbol manifest, Markdown frontmatter, relationship shards) serialize with unlimited line width, matching sync and coordinate-refresh output.

- 0d161a7: Kibi no longer fails to save anything when a workspace sits deep in a directory tree. In a repository whose path was around 150 characters or longer, every `kb_upsert` and other write died with "invalid term_t … out of range" and no hint about the cause. Writes now work at any path length. Two smaller rough edges are fixed as well: `kibi init` no longer blames `core.hooksPath` when it refuses a hooks directory that escapes the repository through a symlink, and the "Pending source is missing" error now says how to recover.
  - kibi-core: SWI-Prolog's `rdf_db` cannot write a journal for a graph whose URI is roughly 230 characters or longer. Journaled stores whose `file://` graph URI would exceed 200 characters now use a short digest-based `urn:kibi:store:<sha1>` graph URI; shorter paths keep their existing URI, so existing stores are unaffected.
  - kibi-cli: `init` reports "The Git hooks directory resolves outside this repository" unless `core.hooksPath` is actually configured.
  - kibi-cli: `Pending source is missing` errors (sync and discovery) point to `kibi branch recover --apply` for deliberately deleted sources.

- 6513324: Proof reporting does far less work, and large coverage reports can no longer overflow the engine. On this repository, evaluating requirement proof coverage against the live snapshot took about 132M Prolog inferences per run. It now takes about 43M on a cold engine and about 15M on a warm one. That's the evaluation behind `kibi coverage`, `kibi proof impact`, the proof baseline check, and the requirement health report. Whole-KB coverage reports are now read in small pages. The unpaged report was already 5.7 MB of the engine's 8 MiB output cap and grew with every requirement and proof run. Report contents are unchanged.
  - kibi-core: `kb_entity/3` memoizes each entity's decoded property list per graph and `rdf_generation/1`. The memo is invalidated by any RDF change, including inside transactions and on rollback. Coverage previously re-materialized and re-decoded every property, receipt histories included, about 100k times per report.
  - kibi-core: receipt-history parsing and receipt-shape validation are memoized by content (`variant_sha1/2`) and bounded to 4,096 entries. They previously re-parsed and re-validated every stored receipt on every evaluation.
  - kibi-core: `kb_ensure_indexes` skips its full type-triple recount while its inputs (graph, RDF generation, legacy fact count, index entity count) are unchanged.
  - kibi-core: `coverage_report_json` memoizes the sorted report for the exact arguments and store generation, so follow-up pages only paginate and encode.
  - kibi-core: status resolves the attached workspace root once per KB path instead of once per entity source.
  - kibi-cli: `executeCoverage` reads reports in pages of `COVERAGE_ROW_PAGE_SIZE` (10) rows via `readCoveragePages`.

- 25f11b1: The badge that `kibi init --github` adds to your README now links to the published explanation of the `% proven` metric at https://looted.github.io/kibi/ instead of the GitHub rendering of the Markdown source. The Kibi documentation site moved to the root of that domain, with the requirement-health report still under `/kibi-report/`. The Cursor and OpenCode package READMEs also link to the published guides, so the links work when you read them on npm.
  - cli: `KIBI_METRIC_DOCS_URL` points at `https://looted.github.io/kibi/guide/github-integration.html#what-the-badge-means`.
  - cursor, opencode: README setup and troubleshooting links point at the published guide pages instead of repository-relative or GitHub blob URLs.
  - repo tooling (not published): the docs site builds into the GitHub Pages root and renders `llms.txt` as one H2 link list per catalog group from the shared page metadata.

- 35cd120: Searching without a type filter works again on large knowledge bases. On this
  repository, every untyped `kb_search`, lexical or intent-v1, still failed with
  "Query exceeded bounded Prolog output capacity (ENOBUFS)". A single page of 500
  requirements and facts with large semantic inventories can exceed the output
  bound on its own. Search now shrinks the page when that happens instead of
  failing.
  - `loadSearchCandidates` halves the page size and retries the same offset when
    a page overflows the bounded Prolog output. It keeps the smaller size for the
    rest of the scan and rethrows only when a single entity overflows on its own
    or the error is not an overflow.

- 2633bdb: kb_search no longer fails on large knowledge bases. On repositories with thousands of entities, search previously died with "Query exceeded bounded Prolog output capacity (ENOBUFS)" because it requested every candidate entity in a single query. Search candidates are now fetched in bounded pages (500 per query) before ranking, in both legacy and intent-v1 ranking modes, so each response stays well under the output bound in practice and the observed large-KB failure is fixed. The page size bounds response size per query; it is not a byte-level guarantee for arbitrarily large individual entity payloads.
  - Add `loadSearchCandidates` paged fetcher in `discovery-entities.ts` and use it from `executeSearch` and intent-search candidate loading.
  - Call the port's `searchEntities` through the port itself so the method receiver is preserved for `PrologPort` implementations that are not pre-bound (e.g. `EngineClient`, whose `searchEntities` depends on `this`).
  - Cover the paging contract with behavior tests (multi-page aggregation, candidate cap, empty-page termination, receiver preservation).

- 9e17968: `kb_search`, `kb_query`, intent search, and bootstrap planning no longer fail with `ENOBUFS` once a project's proof receipt history grows large. Several discovery paths asked the engine for every candidate entity with all its properties, test receipt histories included, in a single answer. On this repository that answer is 8–14 MiB, past the engine's 8 MiB output cap, so even a `limit: 1` search for an existing requirement failed. Results and ranking are unchanged. Search candidates now carry only the fields ranking needs, and complete entities are loaded only for the page actually returned.
  - kibi-core: `kb_search_entities` returns projected candidate rows (identity, title, status, tags, source and coordinates, text fields). Receipt histories, proof contracts, and other large structured properties stay in the store. New `kb_list_search_candidates/5` (projected, paged listing) and `kb_entity_ids/1` (IDs without properties).
  - kibi-cli: `kb_search` with `fields: "full"` reloads only the returned page's complete entities by ID. Ports without the engine's indexed methods run the same bounded Prolog search through `query` instead of loading every entity.
  - kibi-cli: `kb_query` pages are fetched in bounded chunks (`ENTITY_QUERY_CHUNK_SIZE`, 25 rows) through the engine and through the non-engine fallback, which no longer materializes every matching entity before paginating.
  - kibi-cli: intent search's semantic scan uses the projected listing (same candidate bound), bootstrap generation enumerates IDs only, and symbol repair plans page the symbol inventory.

- c969e4c: Kibi now notices when the branch KB was compiled by a different Kibi CLI build. An older build can silently drop properties it does not know, and because sync skips unchanged files, a newer CLI never re-imported them while `kibi status` still said "fresh". Status now reports the store as stale with a `compiler_changed` reason, and the next `kibi sync` re-imports every source once.

  `kibi doctor` now tells you when your installed Git hooks were written by a different Kibi version, for example a pre-commit hook that predates the generated-manifest gate. Such a hook keeps running, so nothing looked wrong, but it silently skipped newer checks.

  Deleting an entity that has outgoing relationships no longer leaves those relationships behind in `.kb/relationships/` shards. The deletion plan now removes them together with the entity, so `kibi check` no longer reports source-relationship parity violations after an approved delete.
  - cli: sync stamps `compilerFingerprint` (a hash of the bundled entity property schema) into `sync-cache.json` and discards a cache stamped under a different contract. `kibi status` / `kb_status` add a `compiler_changed` stale reason (remediation `kibi sync`) and report `syncState: "stale"` until then.
  - cli: `kibi doctor` adds a "Kibi-managed hook sections" check that fails when an installed kibi-managed section in the effective hooks directory differs from the running CLI's template (remediation `kibi init`). The installer and the check share one template list.
  - cli: entity deletion plans (`kb_delete` → `kb_apply_plan`) add hash-bound source writes that remove the deleted entities' outgoing rows from relationship shards, via the new pure `renderShardWithout` shared with relationship deletion.
  - repo tooling (not published): `bun run proof:baseline:semantic` compares the proof baseline without re-proving by setting aside stale-evidence gaps, and `bun run proof:replay` replays the CI proof job from `proof.yml` in a clean clone.

- 1fa56e3: Upserting a symbol now repairs a duplicated symbol record. A rebase that keeps
  both sides of `.kb/symbols.yaml` can leave the same symbol ID in the manifest
  twice, each copy with different requirement and test links. Only one copy
  reached the knowledge base, and `kb_upsert` updated the first copy while the
  second kept shadowing it, so the duplicate could never be fixed through Kibi.
  - The symbol manifest writer folds every record with the upserted ID into the
    first one: it keeps the union of their relationships and fills fields the
    first copy lacks, then removes the other copies.
  - Deleting a symbol removes every copy, not just the first.
  - Repaired the three duplicated records already on `develop`
    (`SYM-ReceiptCodeScopeEntry`, `SYM-resolveBoundSymbolScope`,
    `SYM-COVERAGE_SHARDS`), which now carry the combined links of both copies.

- f01838e: Usage telemetry now records what a call actually returned. Since mid-August every MCP tool result was logged with a count of zero, so a search that returned 190 hits looked identical to one that found nothing, and acceptance reports drew conclusions from fabricated data. Result and violation counts are now read correctly, and a payload that genuinely cannot be parsed is recorded as unknown rather than as an empty result, so a broken logger can no longer look like a healthy but empty knowledge base.
  - Add `normalizeResultPayload` to the result-envelope module and use it in both the MCP and CLI diagnostic loggers, resolving the `{ structuredContent }` wrapper and the bare `kibiProtocol` envelope through one contract.
  - Record `result_count` and `violation_count` as `null` with a `count unavailable` summary when no payload is readable, and omit `zero_results` in that case.
  - Restore `protocol_version`, `result_version`, `result_status`, and `effect_failures` on MCP rows, and fix the mirrored CLI case where a wrapped envelope logged protocol fields but lost the count.
  - Treat unreadable counts as `insufficient_evidence` in the source-lookup acceptance metric instead of silently counting them as non-zero hits.
  - Cover the boundary with an end-to-end test through the real MCP tool registration and logger path; the previous helper-level tests passed throughout the outage.

- Updated dependencies [173ed66]
- Updated dependencies [f7c2d56]
- Updated dependencies [e5ab646]
- Updated dependencies [0d161a7]
- Updated dependencies [6513324]
- Updated dependencies [9e17968]
- Updated dependencies [0128b56]
  - kibi-core@0.14.0
  - kibi-plugin-builtin@0.3.0
  - kibi-plugin-sdk@0.3.0

## 2.1.0

### Minor Changes

- e6be0cc: Optional Jev plugins can now be configured from the environment after a normal `package.json` activation, and `kibi doctor` shows which capability plugins that activation selected.

  `TYPESAFE_API_KEY` remains the only credential and is never read from `package.json`. `KIBI_JEV_MODEL` selects the model (default `jev-latest`; a blank value is ignored). `KIBI_JEV_TIMEOUT_MS` sets a positive timeout up to 120000 milliseconds and fails with a clear provider error when the value is malformed. Explicit constructor options still win. Advisor and compile-intent results include plugin version, mode, external/network/metered flags, fallback, and the effective model when the classifier discloses one. Shadow comparisons stay out of the canonical result.
  - Resolve Jev model and timeout from the environment with programmatic precedence
  - Preserve optional `semanticClassifier.model` on provenance stamps
  - Report parsed `kibi.plugins` from `kibi doctor` without importing plugin packages

  ***

- c77b371: Proof coverage reaches every requirement that has honest end-to-end evidence: fourteen new packed end-to-end tests wire previously unproven scenarios (status freshness, conservative proof reporting, snapshot relevance, MCP model-requirement and freshness, schema version, strict modeling, plan-hash enforcement, OpenCode enforcement, briefing removal, Prolog/SPARQL adoption, check-gate enforcement, evaluator gold runs, batch diagnostics) into the proof ladder, and requirements that are historically retired can now actually opt out of E2E proof.
  - `kb_check` with `async: true` returns a `kibi.job.v1` receipt whose shape is declared in the tool's output contract, so hosts no longer reject the response schema mismatch on large KBs.
  - Authored `proof_exempt` / `proof_exempt_reason` frontmatter on requirement documents is now extracted and persisted; previously the exemption was silently dropped on sync.
  - The MCP JSON-Schema-to-Zod bridge converts `anyOf` unions faithfully for declared output contracts (input `oneOf` guards keep their intentional lenient behavior).
  - Proof-entity maintenance: stale `SYM-proof-runner` obligation removed from the journaled-engine harness contract, and `REQ-*` inline annotations repointed to the modeled verification-evidence requirement.
  - New proof obligations: `TEST-e2e-*` packed scenarios, `TEST-kibi-change-to-proof-evaluation-live` gold-corpus run, and `TEST-e2e-root-batch-diagnostics`; `runBatch` is exported from the curated suite runner for diagnostic reuse.

- f33a665: Proof failures now name the exact requirement, symbol, and why each `covered_by` candidate did not qualify, without changing what counts as proven. Agents can inspect a requirement with `kibi proof explain` and compare current proof state to the committed `proof/baseline.json` snapshot with `kibi proof impact`, instead of reverse-engineering Prolog or guessing from aggregate counts.
  - Keep `kibi.requirement-proof.v3` and add additive production-symbol `explanations` plus TEST `testResolutions` on the same Proof.
  - Ratchet `proof/baseline.json` to v2 with compact requirement fingerprints; aggregate counts stay the ratchet.
  - Add `kibi proof explain` and `kibi proof impact` as Proof projections, mixed-role leftovers in `symbol-traceability`, and advisory `proof-contract-symbols`.
  - Document the proof-regression workflow in `kibi-usage` 2.1.3.

- 5e8c9ef: Commits now stop early when the staged source snapshot would regenerate different Kibi symbol manifests. The error names the affected manifest and gives a safe refresh and selective staging path, so a long proof run does not end with a dirty snapshot caused by generated files.
  - Add `kibi check-generated --staged` with exact Git-index materialization, byte comparison, and index-race rejection.
  - Run the gate in pre-commit and strict-proof CI before `prove --all`; keep proof freshness and baseline rules unchanged.

### Patch Changes

- b375e8f: This maintenance update brings the affected package code and tests into line with Kibi's Biome checks while preserving runtime behavior. It also replaces MCP non-null assertions with receiver-preserving method calls.
  - Format affected files, sort imports, and remove unnecessary template literals.
  - Preserve EngineClient `this` when forwarding optional Prolog methods.

- 783cc75: Capability plugins now participate at the real CLI/MCP call sites while default installs keep the same builtin-only behavior.

  Symbol analysis prefers the capability registry when available, ontology matching can compose activated packs for suggest-predicates, and external semantic classifiers run only from `kb_semantic_advisor` and `kb_compile_intent`. `kb_model_requirement` stays a modeling operation and does not call an external classifier. Sync/check/upsert/status/proof paths stay on deterministic builtin analysis. Distribution lists, pack scripts, and docs cover the new plugin packages; Jev remains opt-in.

- 58a9181: `kibi doctor` now fails when a capability plugin is activated in `package.json` but the package is not a declared dependency. Previously the check could report `declared=no` and still pass, even though loading that plugin is rejected.

  Add the package to `dependencies`, `devDependencies`, or `optionalDependencies`, or remove the `kibi.plugins` entry. The check still only reads `package.json` and does not import the plugin.
  - Fail the Capability plugins doctor check when any configured row has `declared=no`
  - Keep the existing row text and add an actionable remediation

- 783cc75: Capability plugins can now be loaded safely from a project's package.json without changing default behavior when none are configured.

  Kibi hosts a lazy, injectable capability-plugin registry shared by CLI and MCP. Builtin providers always register; optional packages load only when a capability is first used, with replace/augment/shadow mode rules and an allowlist that keeps external semantic classifiers out of sync/check/upsert/status/proof paths.
  - Add `packages/cli/src/plugins` host loader/registry, composition helpers, and source-analysis service
  - Wire `OperationContext.ensurePlugins` through CLI and MCP runtimes
  - Pass operation context through MCP semantic-advisor / model-requirement / suggest-predicates registration
  - Depend on `kibi-plugin-sdk` `^0.1.0` and re-export the registry from `kibi-runtime`

- e6571b4: External classifiers stay limited to the two allowlisted operations, ontology matches keep their claim keys through host composition, and CLI predicate rule tables now re-export the builtin pack so advisor and modeling cannot drift. Lane selection from the builtin classifier also accepts host snake_case signal shapes, which unblocks typecheck/build for capability-plugin call sites.
  - fix(builtin): chooseLane accepts kind-only LaneSignal (unblocks analysis-receipt typecheck)
  - feat(cli): stamp claimKey on composed ontology match candidates
  - refactor(cli): re-export predicate rule tables from kibi-plugin-builtin
  - chore(builtin): export rule sets + package.json subpath

- 142d7ee: Semantic advisor and compile-intent responses that include capability-plugin provenance no longer fail host output validation. Agents and CLI clients can read `capabilityPlugins` stamps on successful envelopes instead of hitting `PROTOCOL_VALIDATION_FAILED`.
  - fix(cli): declare optional `capabilityPlugins` on kb_semantic_advisor and kb_compile_intent output contracts
  - test(cli): protocol regression for plugin-bearing semantic-advisor envelopes

- 39a6d3a: Unit coverage can now run a single shard locally, and subprocess `check` tests no longer share the hanging CLI commands process.

  `check.test.ts` was consuming the full 25-minute `cli.commands` bound under Bun 1.4 coverage with no further output. Those suites run in `cli.check-command`, sandbox `execSync`/`spawnSync` now time out after 60s by default, and `bun run test:coverage:unit -- --shards=cli.check-command` (or `KIBI_COVERAGE_SHARDS`) reproduces the CI coverage step without a full matrix.

- 86ec793: Unit coverage no longer lets doctor command tests poison the shared CLI commands shard.

  Under Bun 1.4 with coverage, doctor SWI-Prolog checks could hang on a dangling engine and then make later `spawnSync(/bin/sh)` calls time out across the rest of `cli.commands`. Doctor suites now run in their own `cli.doctor` shard so commands coverage can finish and produce LCOV.

- b466319: Unit coverage isolates remaining sync command tests so they cannot hang the shared CLI commands shard.

  Under Bun 1.4 with coverage, `sync-coverage` was timing out `git add` via `spawnSync` and then cascading 120s failures through migrate and check-remaining until the 25-minute process bound. Those files now run in their own `cli.sync-coverage` shard.

- 5420c44: CI unit-coverage no longer hangs the shared commands shard on `sync.test.ts`, and Bun 1.4 live-socket write-EPIPE no longer fails the shared engine-remaining shard. Daemon socket refusal/serve coverage runs in its own isolate process.
  - Isolate `sync.test.ts` into `cli.sync-command` coverage shard
  - Move live/stale/daemon socket path tests into `cli.engine-live-socket` isolate
  - Remap live-socket EPIPE by `code`/`errno` in the daemon probe

- 783cc75: Coordinate enrichment, granularity candidate collection, and private-member helpers now live in `kibi-plugin-builtin`, so the CLI can analyze TypeScript/JavaScript symbols without depending on `ts-morph` directly. Hosts that only install `kibi-cli` still get the same enrichment and staged-symbol behavior through the builtin plugin.
  - Export `enrichSymbolCoordinatesWithTsMorph`, `collectGranularityCandidates`, `onlyCandidate`, and `isPrivateClassMember` from `kibi-plugin-builtin`
  - Thin-wrap those helpers from CLI `symbols-ts`, `symbol-granularity`, and `symbol-extract`
  - Drop `ts-morph` from `kibi-cli` runtime dependencies (kept as a test-only devDependency for AST spies)

- 217b044: Provider secrets now resolve the same way in every harness: existing process env wins, then project `.env.kibi` (or `KIBI_ENV_FILE`), then `~/.config/kibi/env`, with legacy `.env` only filling gaps (labeled `legacy_env`). Blank values are unset. `kibi doctor` stays import-free: package/capability/mode/declared for any plugin, plus static first-party Jev secret/model diagnostics from the real bootstrap attribution — never by re-reading files without the pre-bootstrap process snapshot, and never by executing plugin code.
  - Shared `bootstrapKibiEnvironment` with remembered process-key snapshot, blank-as-unset, and `legacy_env`
  - Doctor uses `resolveKibiWorkspaceRoot` + bootstrap `sources`; no `loadPluginPackage` / dynamic import
  - MCP `resolveWorkspaceRoot` delegates to the same canonical resolver
  - Re-export bootstrap helpers from `kibi-runtime`

- 86ec793: `kb_check` and impact analysis no longer load the capability plugin registry for symbol extraction.

  Maintenance paths stay on deterministic builtin ts-morph analysis. External replace/augment/shadow extractors only participate when a caller passes an explicit registry (for example symbol repair). This matches the documented v1 contract that sync/check/status/proof must not invoke external plugins.

- 16919be: MCP discovery no longer dies when one tool hits the host timeout. Timed-out reads cancel in-flight work without tearing down the shared engine, so parallel `kb_status` / `kb_search` / `kb_query` calls stop cascading into `Kibi engine connection closed`. Healthy `kb_status` reuses the session engine. Discovery tools that opt into `agentVisibleStructuredData` embed JSON in `content` for hosts that hide `structuredContent`.
  - MCP: abort-only on read tool timeouts; reset Prolog only for wedged mutations
  - MCP: `adaptProlog` forwards AbortSignal to EngineClient query/status/save paths
  - CLI: EngineClient settles pending RPCs once (abort vs response race-safe); cancel marks are per-connection
  - CLI: `executeStatus` prefers `ensureProlog` / session port; pass AbortSignal through status/query/search
  - MCP: opt-in `agentVisibleStructuredData` for kb_query/kb_search/kb_status only (preserves non-text content parts)
  - Documented engine limit: cancel skips queued requests but cannot interrupt an already-running Prolog goal

- 8985874: Capability plugins now fail closed on unsafe resolution, poisoned loads, and silent classifier errors, and Jev records the model it actually called.

  Project config rejects duplicate package activation and duplicate replace providers. Package entry resolution uses Node/Bun as the source of truth and refuses entries that escape the package root, including via symlinks. A failed plugin import no longer poisons later retries in the same registry. Semantic classifier failures are returned as diagnostics instead of being swallowed, and Jev includes its configured model id in those diagnostics.
  - Validate duplicate plugin activation, secrets, and provider ids
  - Confine resolved plugin entries to the realpath'd package root
  - Evict rejected loadedPackages promises
  - Typed classifier attempt outcomes with diagnostics
  - Configurable Jev model (default `jev-latest`) on errors and requests

- db07d8f: Proof diagnostics now agree with the Prolog decision: a structural type-shape unit contract is shown as qualifying, `kibi proof impact` compares against the Git HEAD baseline and exits 0 after a successful report, and mixed-role symbols fail the strict proof integrity gate.
  - Mode-aware candidate evaluation in Prolog; receipt fallback uses `test_receipt_evidence(Context, TestId, Evidence)`.
  - `proof impact` reads `HEAD:proof/baseline.json` with no worktree fallback; diagnostic exit 0.
  - Strict proof workflow and baseline checker include canonical `symbol-traceability`.

- 7de8890: `kibi proof migrate-legacy` now detects legacy `verification_receipts` blocks in the authored test documents, not only in compiled entities left over from older stores. Because current sync no longer extracts the legacy lane, the compiled-store check alone could never fire on a workspace synced by a current release, leaving the exact stale blocks the command exists to remove untouched. The migration still runs only for tests that already carry a `proof_contract`, keeps pruning compiled legacy lanes where they exist, and reports the same summary output.
- e697943: Native ZCode proof runs now preserve the exact test case, integration, and command provenance needed to explain verification results. This makes each ZCode behavior receipt independently traceable instead of treating the adapter suite as one aggregate pass. The CLI also rejects incomplete or mismatched native evidence rather than accepting an ambiguous result.
  - Enforce native result and binding validation for self-emitting proof integrations.
  - Record the configured `zcode-native` command and producer fingerprint in proof artifacts.

- Updated dependencies [b375e8f]
- Updated dependencies [e6571b4]
- Updated dependencies [783cc75]
- Updated dependencies [e6be0cc]
- Updated dependencies [783cc75]
- Updated dependencies [8985874]
- Updated dependencies [783cc75]
- Updated dependencies [db07d8f]
- Updated dependencies [f33a665]
  - kibi-plugin-builtin@0.2.0
  - kibi-plugin-sdk@0.2.0
  - kibi-core@0.13.0

## 2.0.0

### Major Changes

- 812c201: Kibi's proof layer is now runner-neutral: any test runner, script, or harness can prove requirements, and Playwright is no longer built into the proof model.
  - `kibi prove` replaces `kibi verify` as the single command to run configured proof producers and record evidence. Proof contracts (`kibi.proof-contract.v1`) declare explicit obligations (`symbol_id` + `target`) executed by a configured integration in `.kb/proof/integrations.json`; `kibi proof inspect` discovers test infrastructure deterministically; one producer run can satisfy many test contracts, and re-ingestion is idempotent.
  - Evidence moves to the `kibi.proof-run.v1` artifact (typed environment, run-level outcome, factual attempt history with `native_case`/`aggregate_run` provenance) evaluated into `kibi.proof-receipt.v1` receipts bound to the live snapshot, contract hash, and effective execution fingerprint. Command proof is the universal fallback, so every project can prove requirements without a first-party framework adapter; strict first-attempt policy never upgrades unknown attempt history into passing evidence.
  - Breaking removals: `kibi verify`, `kb_ingest_verification`, `kibi.playwright-run.v1`, `verification_contract`/`verification_receipts` entity fields (replaced by `proof_contract`/`proof_bindings`/`proof_receipts`), the `required_case_symbols`×`required_projects` Cartesian contract, and `retries` fields. Migrate by re-running `kibi prove` after bootstrap configures proof for your repository.

  DRY: hard cutover to the proof-evidence protocol across CLI, MCP, runtime skills, Prolog proof evaluation, coverage/repair/report surfaces, agent skills, and repository self-proof (packed e2e steps now execute through `kibi prove --all`).

### Minor Changes

- 4b8594f: Proof runs are now self-identifying, failures are attributable, and integration selection finally matches real repositories. `kibi prove` sets `KIBI_PROOF_RUN=1` in every producer child process, so runner configs that must behave differently under proof (disabling retries, for example) can branch on a stable marker instead of guessing from output-path variables — this fixes silent contract violations like proof runs executing with Playwright retries enabled. When a run fails, gap reasons now name the failing member results instead of an opaque "run did not pass", so one slow scenario no longer hides why four domain contracts were refused. `--integration` accepts multiple comma-separated ids, `--integration-except` skips integrations without `--all`, and a selector that matches nothing is now a loud error instead of a silent no-op.

  Two long-standing consumer sharp edges are fixed: the symbol compiler lock is stolen immediately when its recorded holder pid is provably dead instead of blocking writes for the full timeout, and `kb_suggest_predicates` now defers to the semantic advisor's nonlogical classification (`review_nonlogical`) instead of emitting predicate suggestions for rationale, example, or subjective prose.

  The built-in predicate catalog grows ten consumer-escalated families — fail-closed authorization, deployment preconditions, data-migration sequencing, diagnostic visibility, mutation authority, request deduplication, async boundaries, canonical identifiers, responsive breakpoints, and operational pauses — and retrieval ranking no longer lets an exact-pattern miss veto strong lexical and semantic evidence, so claims like "must complete in < 500ms", "read canonical data only", and "renderer-neutral persistence" now ground to precise predicates.

  Technical summary: `commandEnvironment` exports `KIBI_PROOF_RUN`; `evaluateContractAgainstRun` adds failing-member attribution to run-failure gap reasons; `prove` selectors parse comma-separated id sets with fail-fast empty matching; `acquireSymbolCompilerLock` steals well-formed locks with dead holder pids; `suggest-predicates` routes all-nonlogical inputs to `review_nonlogical`; `rankSchema` treats exact-score 0 as a miss rather than a veto; `resource_constraint`, `failure_behavior`, `migration_boundary_rule`, and `abstraction_boundary_rule` gain retrieval cues and intent rules; `predicate-catalog-5.ts` and `predicate-usage-hints-4.ts` add the ten new families.

- 198d083: Per-contract receipt binding is now the default. Every prove campaign writes receipts with a binding hash (contract + receipt-stripped test document + bound-symbol source hashes), and coverage matches receipts by that binding — so editing an unrelated file, requirement, or piece of symbol metadata no longer invalidates the repository's proof evidence, and editing one test's contract, document, or its bound production code stales exactly that test. Set `KIBI_PROOF_BINDING_MODE=strict-snapshot` to opt out and restore whole-snapshot matching. Receipts written before this change keep their snapshot semantics until each contract is re-proven, so no existing evidence is invalidated by the flip itself.

  Technical summary: `reporting.ts` exports `currentProofBindingMode` (default `per_contract`, `strict-snapshot` opt-out) and the coverage executor hands the Prolog stage the per-test binding dict by default; the strict equality / ratchet baseline semantics are unchanged by this slice.

- e09882a: The KB check-rule catalog now has a single source of truth. Adding or renaming a validation rule previously required editing three places in lockstep (the TypeScript rule registry, the kb_check input schema, and the Prolog check dispatch) and a missed edit could silently produce a clean-looking check that ran nothing. All rule names, descriptions, enforcement classes, and Prolog predicate mappings are now defined once in `packages/core/schema/rule-registry.json`; a generator emits the TypeScript registry, the kb_check input enum, and the Prolog registry facts, and CI fails when the generated files drift. Selecting an unknown rule name in Prolog now fails loudly with a typed error instead of returning an empty result, and `strict-readiness` — already documented and implemented but missing from the input schema — is now a selectable kb_check rule.
- a379c9a: Proof campaigns stop poisoning themselves, and the failure modes that used to cost days of source archaeology now tell you what they need. Receipt ingest no longer canonicalizes the whole test document: `kibi prove --all` splices only the `proof_receipts` block into each test file, so hand-authored frontmatter (inline tags, non-millisecond timestamps) keeps its bytes and the workspace snapshot hash stays stable across a campaign — the mid-run "changed the tracked workspace during proof execution" refusals caused by ingest's own reformatting are gone. When a refusal does fire, the error now lists which paths moved (snapshot-relevant first, capped at ten with a "+N more"), so you can see what kibi thinks changed instead of diffing by hand.

  New proof maintenance commands close the receipt long tail: `kibi proof prune --keep <n>` (default 1) shrinks duplicate passed receipts — re-proving the same snapshot appends one block per run, and consumers used to dedupe them by hand — while `kibi proof migrate-legacy` removes legacy `verification_receipts` frontmatter blocks from tests that already carry a `proof_contract`, both via surgical document patches. `kibi coverage --by req` gains `--status <statuses>` (comma-separated `proven|missing|unresolved|not_applicable`) to enumerate one proof-status slice; `not_applicable` rows include their typed applicability reason.

  Sync and symbol sharp edges get the missing diagnostics. `sync --refresh-symbol-coordinates` now prints failed symbol ids with typed reasons ("add symbol_role and granularity_reason … to enable the whole-file coarse fallback") instead of a bare `failed=47`, its success line names the artifact it actually wrote (`.kb/symbol-coordinates.yaml`, not `symbols.yaml`), and the generated `symbols.yaml` header documents the granularity gate that decides when the coarse fallback applies. Upsert rejects symbol `sourceFile` values pointing into `.kb/` (their coordinates never merge into the engine, so coverage would report `missing_symbol_coordinates` forever) and rejects `proof_exempt` without a reason. Sync, finally, warns when a missing relationship target matches an untracked `.kb` document — "stage it with `git add` and sync again" instead of a misleading "target entity does not exist" — and Prolog query timeouts now carry the wedged-engine remediation ("run `kibi engine stop`, then `kibi sync --rebuild` if needed").

  Technical summary: `ingest-proof.ts` writes a receipt-only `sourceDocumentOverride` through `executeUpsert`/`writeSourceForUpsert` (new `receipt-document.ts` splices frontmatter blocks byte-safely); `prove.ts` appends `describeWorkspaceDrift` to snapshot refusals; new `operations/proof/prune-receipts.ts` and `migrate-legacy-receipts.ts` with an `allowReceiptsPrune` carve-out in the append-only validation; `reporting.ts`/`coverage.ts`/`cli-register-reporting.ts` add the `statuses` input and `--status` flag hitting `coverage_report_json/11`; `manifest.ts` collects failures with `coarseAnchorFailureReason` and documents the gate in `SYMBOLS_MANIFEST_COMMENT_BLOCK`; `validation.ts` adds `.kb/`-sourceFile and exemption-pairing rejection; new `sync/untracked-targets.ts` powers the persistence tip; `prolog.ts` extends the timeout diagnostic.

- 11ba1ef: The lock stewardship loop closes. `kibi engine janitor` now sweeps stale engine artifacts: branch-store lock journals whose recorded holder is provably dead are cleaned (journal + rdf lock), a live daemon stranded by a removed worktree is stopped and cleaned, and — with `--all` — runtime-directory sockets left by dead daemons anywhere on the machine are removed. The command reports by default and executes with `--apply`, printing one line per finding (holder pid, workspace, holder state, action). `kibi status` now surfaces a `store_lock_stale` stale reason when the current workspace's branch store carries a dead-holder journal, so the state is visible before it wedges an operation.

  This slice also completes the self-healing loop: the engine daemon's own attach path now performs the same classify-break-retry takeover as the CLI runtime, so a store locked by a crashed engine heals no matter which surface hits it first. Hardening from the code review: attach failures preserve the original error inside the structured context (a permissions problem is no longer re-branded as a lock with an unknown holder), the workspace watchdog requires two consecutive misses before stopping a daemon, and duplicated owner parsing/dead helpers were consolidated.

  Technical summary: `prolog/janitor.ts` adds `sweepStoreLock`/`sweepWorkspaceStoreLocks`/`sweepRuntimeSockets`/`runJanitor` with journal classification via the shared boot-id-aware holder check; `engine.ts` wires `retryAttachAfterBreakingStaleLock` (moved from cli-runtime to `prolog/store-lock.ts`) into the daemon attach and hardens the watchdog; `kb.pl` preserves the original attach error in `kb_store_locked/3` and journals unconditionally with a boot-id read fallback; `discovery-executors.ts` surfaces the `store_lock_stale` stale reason; new `engine janitor` subcommand with report/apply modes and seven behavior tests.

- 7de82d4: Proof receipts learn what they actually depend on. Opting in with `KIBI_PROOF_BINDING_MODE=per-contract`, each receipt now records a `binding_hash` — a digest of the test's proof contract plus its receipt-stripped authored document — and stays valid while that pair is unchanged, even as unrelated files, requirements, or symbol metadata change around it. A KB-only edit (a new covered_by link, a coordinate refresh) no longer invalidates every receipt in the repository, ending the re-prove-everything treadmill: only the tests whose own contract or document changed go stale, and a scoped `kibi prove --requirement …` refreshes exactly those. The default remains today's strict whole-snapshot binding; per-contract mode is strictly opt-in until it bakes in, and receipts written by older builds keep their snapshot semantics.

  Technical summary: `proof-fingerprint.ts` adds `receiptBindingHash` (contract hash + sha256 over the receipt-stripped document, versioned domain tag); `ingest-proof.ts` writes the optional `binding_hash` field at ingest; `proof-receipt.ts` accepts it as optional in schema and shape validation; `requirement_proof.pl` gains `requirement_proof_context/6` (binding mode + TestBindings dict) with `receipt_for_current_mode/4` selecting receipts by binding hash and falling back to snapshot matching for receipts without a binding hash; `discovery.pl` exposes `coverage_report_json/12` threading the mode and dict through; the coverage spec executor computes the bindings dict only when the opt-in env is set.

- f71e7eb: Per-contract receipt bindings now cover production code, not just the test's own inputs. When `KIBI_PROOF_BINDING_MODE=per-contract` is set, a receipt's binding hash additionally includes the coordinate-recorded source hashes of every symbol the test binds via `proof_bindings` — sorted for stability, so formatting-only reordering changes nothing while any real edit to a bound symbol's source file produces a new hash. Editing the production code behind one test now stales exactly that test's receipts; all other tests keep their valid evidence. No Prolog-side change: the binding hash stays an opaque value the coverage stage compares.

  Technical summary: `extractors/manifest.ts` adds `resolveBoundSymbolScope` (proof-bound symbol ids to their `sourceHash` values from the coordinate overlay, canonical ordering); `proof-fingerprint.ts` extends `receiptBindingHash` with the optional code scope (typed `ReceiptCodeScopeEntry[]`); `ingest-proof.ts` and the coverage spec executor resolve the scope from `.kb/symbols.yaml` for the bound symbol ids; two new behavior tests cover scope sensitivity and order invariance.

- 70b954d: Proof campaigns stop repacking the world. `kibi prove` now shares one packed-tarball cache area across all contracts in a campaign: the first packed contract packs the workspace packages and bootstraps the shared installation once, and every later contract process reuses it — on this project's own suite that replaces roughly eighty repeated `npm pack` and install cycles with one, cutting a full prove run from about three hours to well under two. The cache is keyed by the campaign's workspace snapshot, so artifacts from a different code state can never be reused.

  The mechanism itself is runner-agnostic and lives in the packed-test harness, not in prove: any test runner or CI job that executes the packed suites can opt in by setting `KIBI_E2E_PACK_CACHE_KEY` to its own provenance identifier (a run id, a commit sha, a release tag) and optionally `KIBI_E2E_PACK_CACHE_ROOT` to a shared volume. Cache areas are namespaced per repository and per key, published atomically so concurrent runners never observe a half-populated area, and are never deleted by test processes — prune old areas with the new `scripts/prune-e2e-pack-cache.mjs [--keep <n>] [--root <dir>]`. Explicit `KIBI_TEST_TARBALLS` and `KIBI_E2E_PREFIX` configurations keep their exact current behavior and always take precedence over the shared cache.

  Technical summary: `documentation/tests/e2e/packed/helpers.ts` adds the documented env contract, `resolveSharedPackCache`/`claimSharedPackCache`/`publishSharedPackCache` with single-flight atomic-rename publication, staging redirection of npm pack and the shared install, and namespace isolation by repository path; `prove.ts` seeds `KIBI_E2E_PACK_CACHE_KEY` from the proof snapshot; new behavior tests cover reuse, precedence, race resolution, key sanitization, and incomplete-area rejection.

- a6dddfc: Concurrent source mutations are now safe by default. Every `kb_upsert`, `kb_delete`, and `kb_apply_plan` that authors tracked source files takes a cooperative workspace lock (`.kb/recovery/source-authoring.lock`) spanning validation, source publication, the compiled commit, and rollback, so two agents editing the same repository can no longer interleave a read-modify-write cycle and silently lose an update. The lock is taken with a single atomic directory creation: a live holder simply makes peers wait (then fail with a retryable timeout), while a dead, missing, or corrupt holder fails closed with a non-retryable recovery-required error instead of being silently taken over — an operator verifies and clears the lock manually. After a mutation commits, a failure while releasing the lock or publishing receipts is reported as a committed, non-retryable state rather than an error that invites a duplicate retry, and source snapshots ignore the lock lane so holding it never marks a workspace dirty.

  Technical summary: new `operations/mutation/workspace-mutation-lock.ts` (atomic mkdir acquisition, PID-liveness fail-closed observation, bounded reread of a briefly missing owner across the mkdir→publish and unlink→rmdir windows without automatic reclaim, token-checked release, `SOURCE_MUTATION_LOCK_TIMEOUT`/`SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED`/`SOURCE_MUTATION_LOCK_RELEASE_FAILED` errors with `retryable` classification on `OperationError`); `OperationContext.sourceMutationLockHeld` prevents recursive acquisition and orders the source lock before the existing symbol-compiler lock; commit milestones (`onCommitted`, `saga.committed`) classify postcommit receipt/status failures; committed mutations report generic postcommit failures as non-retryable `SOURCE_MUTATION_POST_COMMIT_FAILED` (symbol-lock release: `SYMBOL_COMPILER_LOCK_RELEASE_FAILED`); journalless compile plans expose non-retryable `PARTIAL_COMMIT_REPAIR_REQUIRED` after an early committed step, and postcommit pending-receipt failures surface `SOURCE_COMMIT_REPAIR_REQUIRED` with the recovery journal; source-publication helpers roll back and clean unique temp files when a later fallible step or a rename fails.

- 87e7613: Staged checks now account for every path in the Git index, so Python, shell, YAML, Dockerfiles, Markdown, JSON, and other readable text changes no longer disappear behind a misleading “No staged files found” result. These formats receive advisory ownership and impact review, while binary files, unsupported encodings, symlinks, and submodules are listed with clear skipped reasons.

  Preserve the existing JavaScript and TypeScript enforcement contract, read staged and deleted content from Git, resolve file ownership only from committed plus staged Kibi evidence, and emit a single structured JSON envelope with per-file coverage for every staged-check outcome.

- c4c3832: "Access denied or KB locked" finally says who is holding the lock and heals itself when the holder is dead. Kibi engines now record an ownership journal (pid, workspace, boot id, started-at) at the branch-store root while they are attached, published atomically so concurrent readers never see a partial write. When a later attach fails because the store is locked, the error carries the holder's identity, and — when the holder is provably dead (a crashed or killed engine, a `git worktree remove --force`, a reboot) — Kibi breaks the stale lock automatically, reports the takeover, and continues instead of wedging every later operation behind an opaque permission error. Live holders are surfaced by name with the exact remediation ("close that session, or run `kibi engine stop` for its workspace") instead of a generic message.

  Engine daemons also stop outliving their workspace: a daemon whose workspace root disappears is now detected within thirty seconds and shuts down cleanly, releasing the store lock — the orphaned-daemon lock jam no longer requires manual `rdf/lock` cleanup.

  Technical summary: `kb.pl` writes `.kibi-lock-owner.json` on attach (removes it on `kb_detach`) and throws `permission_error(attach, kb_store, …)` with a `kb_store_locked(OwnerJson, LockDir)` context when `rdf_attach_db` cannot take the lock; the CLI error decoder parses that context into a typed `storeLocked` record; the CLI runtime attach path consults a new lock-stewardship module (`prolog/store-lock.ts`) that classifies holders via `kill(pid,0)` plus a Linux boot-id check (defending against PID reuse across reboots) and breaks locks only for provably dead holders; `engine.ts` adds a workspace watchdog interval that shuts the daemon down when its workspace root vanishes.

- 4153ada: The symbol-classification vocabulary — granularity reasons, coarse reasons, symbol roles, role inference, and traceability relationship types — now has a single source: `packages/core/schema/symbol-classification.json`, generated into both the TypeScript constants and Prolog facts (`bun run symbols:generate`, drift-checked by `symbols:check` in CI alongside the schema and rule registries). The user-facing suggestions that used to restate the vocabulary by hand now read from the generated lists, which fixes real drift: the mixed-symbol-role advisory listed only four of the five allowed granularity reasons (it omitted `test-suite`), while the manifest gate and sync failure message listed only the coarse set. The manifest header comment is generated from the same list. No behavior change beyond the corrected suggestion text.

  Technical summary: `packages/core/schema/symbol-classification.json` is the source; `scripts/generate-symbol-classification.mjs` emits `symbol-granularity.generated.ts` (constants, role-inference map, prose lists) and `symbol_classification.pl` (facts); `symbol-granularity.ts` re-exports the generated vocabulary and drives `inferSymbolRole` from the generated role-inference map; `sync/manifest.ts`, `impact/diagnostics.ts`, and `operations/mutation/symbol-granularity.ts` consume the generated prose lists.

### Patch Changes

- d53e77a: Compile-intent plans now keep each proof-bearing test attached to the scenario IDs it actually verifies, so multiple scenarios cannot silently inherit positional associations. Draft tests default to ancillary integration and internal verification until an author explicitly declares end-to-end consumer evidence, and duplicate or unknown associations remain unresolved.

  The change-to-proof evaluator exercises the compile API against an isolated Prolog fixture with independently seeded requirements and contradiction facts. Its search cases exercise the production ranker over fixed fixture entities, including supplied source context and unrelated-source abstention; they do not claim full KB-backed retrieval or independent source discovery.

- 8b49574: The published CLI now loads the HTML report stylesheet with a Node-compatible `import.meta.url` path, so `kibi-cli` builds under `tsc`. Type-only telemetry, proof, apply-plan, and engine contracts live in `.d.ts` files, which the existing coverage ignore already excludes.
  - Replace Bun-only `import.meta.dir` in the HTML report
  - Rename extracted type modules to `.d.ts` so the unit-coverage manifest does not require them

- 3de05e9: Unit coverage can now reach leftover CLI, OpenCode, MCP, and SkillOpt
  branches without changing product behavior. Helpers that were previously
  private (package version, pending relationship recovery, relationship-delete
  migration, advisory empty-event policy, daemon and CLI entrypoints, comment
  suggestion reset, source-hash warnings) are testable, and a vanished
  relationship shard after a successful commit is reported as a repair instead
  of being silently skipped.
  - Export small CLI, OpenCode, MCP, and SkillOpt test seams and report vanished relationship shards.
  - Keep migration `--yes` and legacy-delete blocks unchanged.

- 7dfd0a5: The journaled engine daemon now starts under Node, not only Bun. Hosts that spawn `engine-daemon.js` with Node 22.14 and earlier never set `import.meta.main`, so the process exited immediately and clients waited until timeout. The entry check now compares `argv[1]` to the module URL so `kibi` and unit tests can attach to a live daemon again.
- 0fba134: Reconnect to the live branch generation before journaled sync mutations. A daemon left attached to a replaced store is stopped and restarted so relationship deletes and cache recovery no longer require `--rebuild`.
- d53e77a: When a workspace disappears while Kibi is running, the detached engine now notices and shuts down so later commands do not inherit a stale lock or socket. Proof runs also reject packed suites that finish without executing a runnable test, which keeps reported verification aligned with work that actually ran.
  - Add a bounded watchdog override for integration fixtures.
  - Require a complete, non-empty TAP result from packed proof runs.

- 121a83c: Type-only CLI contracts now live in dedicated type modules so unit coverage measures executable logic instead of interface declarations. Public imports stay the same. Agents and CI still see the same runtime behavior.
  - Move telemetry, proof-protocol, apply-plan, and engine types into sibling `*-types.ts` files
  - Re-export those types from the original modules so public paths do not change

- e6cd1f1: Kibi now explains when a symbol needs an authored anchor before its coordinates can be refreshed. Python methods such as `Service.decide` no longer silently repeat an ineffective automatic repair, while symbols that extraction can locate still receive automatic refresh guidance.
  - Count text-heuristic coordinate misses as failures, including non-JS/TS sources.
  - Inspect current extraction and explicit coarse anchors before classifying requirement and symbol coordinate repairs as automatic.
  - Cover repeated refreshes, authored coarse-anchor recovery, mixed repair batches, and supported text/AST extraction.
  - Restore the CLI test helper exit code explicitly so expected error-path assertions do not leave a failing process status.

- 940bda8: Git hooks installed by `kibi init` now work when kibi is installed as a project dependency, not only globally. Previously the hooks invoked bare `kibi`, but git does not put `node_modules/.bin` on a hook's `PATH`, so in projects with a local install every hook failed with `kibi: not found` — and the pre-commit hook blocked all commits. Hooks now resolve the binary at run time (PATH first, then `node_modules/.bin` walking up from the repository root, covering monorepo workspace roots) and print actionable guidance if kibi cannot be found. `kibi doctor` detects hooks from older templates and recommends re-running `kibi init`; existing repositories should re-run `kibi init` once to regenerate their hooks.

  Technical details: the four hook templates in `init-helpers.ts` share a `KIBI_BIN` resolver prelude (POSIX sh, no external commands); `doctor` hook validation accepts both resolved (`"$KIBI_BIN" ...`) and legacy (bare `kibi ...`) invocations, flagging the latter as legacy; unit tests gained behavioral coverage executing the generated pre-commit with a restricted `PATH` against a stubbed local install, a parent-directory install, and an unresolvable install.

- acde181: `kibi init --github` now recognizes GitHub remotes that include HTTPS
  credentials, such as `https://x-access-token:…@github.com/owner/repo`. CI
  and Cloud Agent checkouts rewrite remotes that way, so the README badge
  URL is written instead of being skipped as an unknown repository.
  - Accept optional userinfo on HTTPS GitHub remotes in `parseGitHubRemote`.

- ebe2d36: The HTML health report now loads its stylesheet from a static CSS file instead of inlining hundreds of CSS lines in TypeScript. The rendered report looks the same for operators. Unit coverage no longer treats those stylesheet lines as executable TypeScript, so the number reflects real report logic.
  - Extract report CSS to `html-report.css` with brand token placeholders
  - Copy the stylesheet into `dist/report` during the `kibi-cli` build

- b1682f1: Agents receive clearer guidance for repairing the actual supplied mutation request and preserving approved predicate bindings. The scoped additions retain the existing workflow while separating payload recovery from conditional relational modeling.
  - Update `kibi-usage` to 2.1.2 in CLI/runtime sources and the generated Codex/Cursor distributions.
  - Preserve the other three skills and all existing resource content.
  - Retain production-adoption safeguards; development comparisons are not held-out evidence.

- 63c1fa6: The engine janitor is now more careful about what it cleans. A live engine holding a branch-store lock is only stopped when its workspace is verifiably gone — a lock journal that merely lacks the workspace path is now reported and left alone instead of being treated as a stranded daemon. The socket sweep no longer aborts when a daemon removes its pid file mid-scan, and the janitor now detects and cleans legacy ownership journals kept beside the rdf lock, matching the attach-takeover path. `kibi engine janitor --format json` reports `cleaned` honestly (0 in report-only mode) alongside a new `cleanable` count. `kibi status` stale-lock detection now uses the same boot-id-aware classification as the janitor, so a live pid recorded under a previous boot is correctly reported as stale, and corrupt ownership journals no longer hide the original attach error carried by `kb_store_locked/3` diagnostics.

  Technical summary: `sweepStoreLock` requires positive workspace-removal evidence for `kill-and-clean` and reuses `breakStoreLock` for its artifact sweep (adding the legacy beside-lock journal location); `sweepRuntimeSockets` guards the pid-file read against TOCTOU races with the daemons being swept; journal reading is consolidated into a new `readStoreLockOwner` in `prolog/store-lock.ts`, and `classifyStoreLockHolder` is now shared by the janitor, the `kibi status` stale reason, and the attach-takeover path so all three reach the same verdict; `parseStoreLockedContext` threads `originalError` through the corrupt-journal branch. Nine new behavior tests cover the fixed paths.

- dd6bab9: Temporary KB validation now keeps one persistent Prolog session for the full staged-check flow, so entities and relationships written early in the flow remain visible to later queries. This prevents staged proof checks from losing their in-memory state between writes and reads.

  Technical summary: request `oneShot: false` from the temporary KB Prolog factory and cover staged write visibility across multiple queries.

- b7d12c2: Prolog errors now cross the runtime boundary as structured terms instead of flattened text. When a KB mutation fails — a stale snapshot, a locked audit journal, a contradiction, a missing entity, or an invalid relationship — the CLI classifies the actual Prolog error term rather than pattern-matching SWI-Prolog's human-readable output, so error messages can no longer be misclassified by coincidental words in diagnostics. The public query results additionally carry a typed `errorRecord` field (code, entity id, relationship triple, contradiction conflicts) that surfaces like MCP can rely on, and user-facing error text is unchanged.
- ef0462c: The Kibi engine no longer waits out its full query timeout when the underlying SWI-Prolog child dies unexpectedly. Previously, if the interactive `swipl` process was killed by an external signal (for example the kernel OOM killer), the engine kept treating the dead child as healthy — `exitCode` stays null on signal deaths and `killed` only reflects Node-initiated kills — so in-flight queries hung for the entire 120-second timeout, fixture imports retried three times against a wedged daemon, and shutdown could stall behind the same dead-process query. Signal-killed children are now detected at startup and before/during every query, failing fast with a clear error instead of a silent multi-minute hang.

  Technical summary: `PrologProcess.waitForReady`, `isProcessUsable`, and `isRunning` now also check `child.signalCode`; the query-timeout diagnostic message includes the terminating signal.

- b1682f1: Kibi CLI now preserves quoted Prolog text and large structured responses when reading optimization evidence. This prevents Unicode, escape sequences, nested metadata, and pipe-delivered JSON from being silently corrupted or truncated during SkillOpt evaluations.
  - Harden Prolog response parsing and atom/string escaping.
  - Normalize entity endpoints at graph and quality-evidence callers.
  - Use bounded paginated entity projection when full KB quality reads exceed the Prolog transport capacity.
  - Wait for stdout backpressure before completing JSON CLI operations.

- a3878e9: Unit coverage can now execute leftover defensive branches in CLI, MCP, and
  OpenCode without lowering Codecov gates. Previously unreachable catch,
  tie-break, workspace-escape, and package-walk paths are exported as small
  helpers and covered by in-process remaining-coverage tests.
  - Export leftover defensive helpers and add remaining-coverage tests.
  - Keep migration `--yes` and delete `migrationRequired` blocks unchanged.

- 9ea635e: Proof workflows no longer wedge tests that collect a lot of receipt history. Running `kibi prove` many times on the same contracted test could push its receipt history past the 50-entry storage cap, leaving the test entity permanently invalid — `kibi check` flagged it, and no mutation could repair it because receipts are append-only. Proof ingest now rotates the oldest receipts at the cap, so the newest evidence is always kept and the test stays valid; the append-only rule still forbids rewriting or shrinking history, and only permits the exact cap-rotation shape ingest produces.
  - Rotation only triggers when appending would exceed the cap, drops the minimum number of oldest entries, and preserves the 49 newest historical receipts verbatim.
  - Receipt-history append-only validation accepts only that exact rotation shape; pruning without appending, multi-receipt replacement, and below-cap trimming remain rejected.

- 5999143: Agent-facing skill docs now use the current status field names, so agents following the freshness and E2E receipt workflows look for fields that actually exist in `kb_status` output instead of stale ones.
  - Bundled `kibi-freshness` and `kibi-usage` skills (all agent mirrors) now reference `proofSnapshotChanges` and `proofSnapshot` (previously `verificationSnapshotChanges`/`verificationSnapshot` from the pre-proof-architecture status schema).
  - The skillopt-eval harness reads `proofSnapshot*` status fields and its held-out eval prompts name the current fields, so "dirty editor path" evidence gathering works against live status output again.

  Dry: completes the `verificationSnapshot*` → `proofSnapshot*` rename from the proof architecture change in the surfaces that earlier commit missed.

- af143b5: Upsert mutation rollback is now a declared compensation list instead of hand-tracked state. The upsert operation touches several workspace surfaces (authored document, relationship shards, generated symbol coordinates, compiled KB); when a commit fails, undoing those surfaces previously relied on a dozen local variables and duplicated rollback blocks inside the error handler. The steps now register named rollbacks as they succeed and one rollback pass walks them in reverse — with the same guarantees (hash-guarded shard restore, never clobbering concurrent writers, no rollback after the compiled commit). A failed rollback of the authored document now also aggregates its error with the original failure instead of hiding it.
- b482a40: `kibi check --staged` now tells you what to fix, not just that you failed. The `symbols_manifest_stale` and `kibi_impact_evidence_missing` errors carry `Detail:` lines that name, per staged file, how many symbols the extractor finds, how many the staged evidence covers, and exactly which symbols are missing from `.kb/symbols.yaml` — with their definition lines. When uncovered symbols are the cause, the `Suggestion:` now leads with authoring the missing manifest entries (`kibi upsert`, with `implements`/`covered_by` links) before the coordinates refresh; when the evidence has merely drifted, it keeps the refresh-coordinates guidance. The same detail is available to tooling in the `evidence` field of the JSON output's `qualityDiagnostics`.

  Technical summary: `assessStagedSymbolsManifest` returns per-file `fileDetails` (expected/covered counts, missing titles with lines, extra titles, capped at six names with an `… and N more` marker); the diff threads through `KibiImpactSymbolsManifest` into `collectStagedKibiDiagnostics`, which renders `Detail:` lines and selects the cause-appropriate suggestion; the `symbols_manifest_stale` resolution contract and `docs/cli-reference.md` staged-impact-evidence section were updated to match.

- 964ffee: Status and bootstrap activation no longer crash when a host (or a leaked test mock) omits the source-file list. `kibi status` now treats a missing glob result as "no source files" and still reports store and bootstrap posture.
- d53e77a: CLI proof ingestion now handles common JUnit and TAP reports more reliably,
  including nested cases, retries, plans, bailouts, and malformed input. Querying
  an entity and using the returned fields in a later update now preserves quoted,
  newline, and backslash content exactly, so semantic evidence remains bound to
  the authored source. Proof maintenance commands also exercise real source and
  graph persistence across interruption and reload boundaries.
  Repeated identical requirement sentences now share one logical proposition while
  the authored source text and source hash remain unchanged, so advisor output can
  cross the upsert boundary without manufacturing duplicate claim identities.
  Relationship deletes now update authored Markdown relationship declarations even
  when a live compiled edge and relationship shard exist, preventing the next sync
  from resurrecting an explicitly deleted edge. Source symbol analysis also
  recognizes members of exported class expressions such as `FileBridge`.
  - Use maintained SAX XML parsing with strict failure diagnostics for malformed,
    conflicting, or ambiguous native reports.
  - Validate TAP subtest plans and hierarchy identities before producing evidence.
  - Decode typed Prolog string literals before returning entities from discovery.
  - Canonicalize repeated semantic advisor claims to the first source occurrence
    before building the unique logic-claim manifest.
  - Add end-to-end maintenance and interruption coverage for persisted proof data.
  - Patch authored Markdown relationship declarations before compiled retraction
    and fail closed when that source cannot be read.
  - Resolve coordinates for exported class-expression methods, properties, and
    accessors without losing qualified symbol identity.
  - Compare mixed granular/coarse symbol manifests by exempting only exact
    declarations with canonical coarse reasons, while continuing to block stale
    granular coordinates, unknown reasons, and newly extracted exports.
  - Validate existing bindings against staged source bytes, including body-only
    changes, and scope HEAD caching to each assessment. Accept identical validated
    declaration spans from multiple logical owners without hiding stale duplicates.

- 4a60507: Source discovery no longer crashes when a host or leaked test mock returns a non-array file list from the markdown glob. Sync treats that as “no documents found” and continues pending-receipt and manifest checks instead of throwing.
- e499c83: Developers and CI now measure line coverage for CLI commands that used to
  look untested because the suite only spawned the `kibi` binary. The daemon
  entry is the same program; tests can call it without going through
  `process.argv`. Coverage numbers reflect those modules instead of silently
  omitting them.
  - Export `runEngineDaemonCli` from `engine-daemon.ts` and add in-process command tests.

- Updated dependencies [d53e77a]
- Updated dependencies [e09882a]
- Updated dependencies [a379c9a]
- Updated dependencies [11ba1ef]
- Updated dependencies [7de82d4]
- Updated dependencies [30dbb06]
- Updated dependencies [c4c3832]
  - kibi-core@0.12.0

## 1.0.1

### Patch Changes

- 20ddeb2: Thin-repository bootstrap plans no longer report a false binding diagnostic
  for layout evidence rows that name directories (for example a bare `src`
  entry), so an otherwise-ready plan is no longer wrongly blocked from apply.
  Agents bootstrapping a fresh, initialized-but-unseeded workspace can now move
  from `kb_plan_bootstrap` straight to `kb_apply_plan` without hitting
  "only ready plans may be applied" on a plan that was actually eligible.
  - Bootstrap plan binding skips non-file evidence paths when hashing per-source
    evidence; directories carry no document content and no longer surface as
    `Bootstrap evidence source is unavailable` diagnostics.

## 1.0.0

### Major Changes

- 9e6fb3f: Kibi now uses one opinionated project contract: all Kibi-managed knowledge lives under `.kb/`, check enforcement is owned by the installed Kibi version, and projects can no longer weaken health by disabling rules or relocating entity paths in `.kb/config.json`. Existing repositories must run `kibi migrate --yes` to move legacy `documentation/...` knowledge into the canonical layout and adopt `.kb/manifest.json`.

  Advisory modeling checks still run by default, but they report as non-blocking quality diagnostics instead of failing `kibi check`. Migration rewrites the old blanket `.kb/` gitignore stanza so authored lanes are trackable, and a malformed leftover `config.json` blocks the one-way cutover instead of guessing default paths.
  - Remove user-configurable entity paths and persistent `checks.rules` overrides; retire `.kb/config.json` after migration.
  - Introduce `.kb/manifest.json` for Kibi-owned lifecycle metadata (schema version, semantic backfill state).
  - Add one-way legacy storage migration (`documentation/` and custom configured paths → `.kb/<lane>/`).
  - Split check results by enforcement class: canonical → blocking violations; advisory → quality diagnostics; migration → explicit `--rules` only. Default execution is derived from the class (no separate `runsByDefault` flag).
  - Normalize legacy Kibi `.gitignore` fences during init and migrate; treat `.kb/migrations/` as derived runtime state.
  - Fail closed when leftover `.kb/config.json` cannot be parsed.
  - Update init, sync, hooks, staged evidence, doctor, migration-plan, and integration packages for canonical paths.
  - Generate the requirement-health report on pull requests as a `kibi-pr-report` artifact; keep GitHub Pages deployment on the default branch only.
  - OpenCode treats canonical `.kb/` entity lanes as knowledge that requires evidence; only derived runtime trees (and leftover `config.json`) are ignored.
  - Cursor and Codex hook path policy treat canonical `.kb/` lanes as tracked knowledge, not opaque compiled-store paths.
  - Pending relationship shards are not treated as symbols manifests during source discovery.

- 4c75e4d: Kibi onboarding now separates repository initialization from teaching Kibi about an existing codebase. After `kibi init`, an agent can run the `kibi-bootstrap` workflow to produce a reviewable, hash-bound plan and apply the exact approved plan safely. The old autopilot and init-kibi public names are removed so new users see one clear bootstrap path.
  - Replace `kb_autopilot_generate`/`autopilot-generate` with `kb_plan_bootstrap`/`plan-bootstrap`.
  - Add `kibi.bootstrap-plan.v1` validation, deterministic approval hashes, dependency ordering, stale-plan checks, and typed bootstrap recovery through `kb_apply_plan`.
  - Synchronize the four canonical skill mirrors and update client adapters, docs, fixtures, and SkillOpt cases.

### Minor Changes

- a2acea9: Kibi now has a source-first, exact-Git runtime contract for first-party
  adapters. CLI JSON and MCP structured results share a versioned envelope with
  effect and repair information, while branch stores are hashed and explicitly
  identity-bound. The mutation path can author tracked source documents and
  canonical relationship shards without staging or committing them.
  - Add the `kibi-runtime` first-party integration package.
  - Add exact branch-store manifests, explicit legacy migration/quarantine, and
    typed result/effect contracts.
  - Add source-first document writes, relationship-shard updates, and deletion
    approval plans.

- 33262f8: Kibi can now turn its conservative proof model into a polished requirement-health site that people can open, screenshot, share, or publish from CI. Run `kibi report --open` for the local dashboard, or publish the self-contained output directory directly to GitHub Pages without a separate frontend build.
  - Add the human-facing `kibi report` command with configurable output, tag filtering, complete-scope enforcement, and default-browser launch support.
  - Render proof percentage, health metrics, snapshot warnings, searchable requirement-stage cards, receipt freshness, contradiction witnesses, and unowned-code counts in one offline HTML file.
  - Publish the `develop` branch report as a GitHub Actions artifact, and document local use plus a GitHub Pages deployment workflow.

- 15b5825: Projects can now publish a Kibi requirement-health badge together with the full HTML report on GitHub Pages. Copy the documented workflow into `.github/workflows`, or run `kibi init --github` to scaffold those same files. Clicking the README badge opens the matching report.
  - Add canonical GitHub Actions workflows for badge+report and an explicit badge-only opt-out.
  - Scaffold the documented integration with `kibi init --github` without overwriting customized workflows or duplicating badges.
  - Document the manual copy/paste flow in the README and `docs/github-integration.md`.

- 1ca62af: Kibi's public requirement-health report now makes its proof claims inspectable and trustworthy after the page has been sitting on disk or GitHub Pages. Proven no longer shares a card with blocking proof gaps, evidence ages stay honest in a static file, and the report header identifies the repository, branch, and commit when that metadata is available.
  - Classify extra verification-receipt issues as `proofAdvisories` when strict proof already exists; `proofGaps` remain blocking-only.
  - Preserve absolute evidence and generation timestamps, compute relative ages in the viewer, and link proof-chain sources from structured coordinates.
  - Present strict proof coverage, unmapped production symbols, requirements without implementation, proof-gate filtering, filter counts, a Kibi favicon, and a subtle getting-started CTA without loading network assets.

- 7654339: Predicate suggestions now abstain more safely when relevance is weak or bindings are unreviewed, while explaining candidate eligibility and rejection reasons.

  When a genuine ontology gap remains, agents receive a reviewable schema draft instead of an empty recommendation. Reusable launcher schemas and regression coverage improve guidance for consumer-local package resolution and process execution.
  - Add public applicability, binding-provenance, score diagnostics, abstention, and recommended-schema draft fields.
  - Add five launcher-oriented schemas, Cursor launcher coverage, MCP assertions, and reference documentation.
  - Preserve `requires_rule` relationship shards during source-first extraction and sync.
  - Compose multi-entity authored deletions targeting one source file into a single hash-bound write.
  - Fail packed E2E bootstrap immediately when shared npm installation exits unsuccessfully, preserving command output for diagnosis.
  - Scope explicit `kb_check --rules` diagnostics in the Prolog check path instead of evaluating the full rule aggregate first.
  - Fix Logic IR dependency extraction so positive stored rules remain ground and stratification checks terminate.
  - Normalize RDF-typed `rule_schema_id` references before rule verifiability lookup and cover the repair with Prolog regressions.

- c77d3f1: Kibi requirement-health reports now include a live SVG badge that can sit in a README and open the full dashboard when clicked. Publishing the report directory to GitHub Pages keeps both the badge and report on stable, shareable URLs.
  - Emit `badge.svg` beside directory reports and `<name>.badge.svg` beside explicit HTML outputs.
  - Color badge health conservatively for contradictions and stale snapshots.
  - Publish this repository's report through GitHub Pages and link its README badge to the dashboard.

### Patch Changes

- 6ca08bb: Deleting a relationship authored in a YAML symbol manifest now removes the
  matching source declaration as well as the compiled relationship. Unrelated
  symbols, relationships, comments, and formatting remain intact, so a later
  sync does not recreate the relationship that was deleted.
  - Add CST-preserving exact relationship deletion for YAML symbol manifests.
  - Fail closed when an authored YAML relationship cannot be parsed or patched,
    and cover source and compiled-delete integration behavior.

- 3d7d04f: Generic MCP and CLI agents now discover Kibi's operating rules from bundled skills instead of a long copy-paste prompt. Improving an existing product KB is covered by a `kibi-usage` resource rather than a second manual, so agent guidance stays in one place and cannot drift from the packaged workflow.
  - Add `kibi-usage` `resources/kb-improvement.md` and bump that skill to 2.1.0.
  - Replace `docs/prompts/llm-rules.md` with `docs/generic-agent-onboarding.md`.
  - Remove the obsolete retroactive-init prompt; bootstrap stays in the `kibi-bootstrap` skill.

- 2d6cc59: Kibi requirement-health reports now look and read like Kibi: the real logo and wordmark anchor a dark proof-instrument interface, while a sequential proof rail explains exactly where requirements stop. The generated badge uses the same brand system, so an honest low score remains recognizable and opens into useful evidence instead of looking like a broken generic badge.
  - Add self-contained Kibi brand primitives and apply them to the HTML report and SVG badge.
  - Show the proven numerator, current-requirement denominator, and sequential semantic, scenario, implementation, E2E, and evidence gates.
  - Keep strict proof scoring, snapshot warnings, escaping, offline delivery, responsive behavior, and print output intact.

- 8f71f1a: Proof no longer treats coarse test-suite and extractor-miss symbols as missing coordinates after their E2E receipts land. Refresh now stores a title match or whole-file span for those anchors, so a passing contracted test can prove a requirement instead of opening a new coordinate gap.
  - Persist title-match or whole-file coordinates for coarse granularity symbols during `kibi sync --refresh-symbol-coordinates`.
  - Keep extractable symbols without AST coordinates as refresh failures rather than inventing locations.

- a07fad5: The requirement-health README badge now matches Codecov and other Shields-style badges in a GitHub badge row. The label pane uses the standard grey, the type is regular 11px instead of bold, and the proven-percentage side keeps padding so the last letter no longer touches the edge.
  - Use Codecov chrome: `#555` label, white 11px type, 1px text shadow, sheen, and 3px corners.
  - Size panes from the message text with reserved padding, and blend the logo ground into the label fill.

- 2e68da9: Kibi's generated requirement-health badge now matches the height of standard GitHub badges and stays readable at small sizes. It uses the canonical Kibi logo on its own, so the badge no longer relies on a tiny wordmark that is difficult to recognize when rendered inline.
  - Render the health badge at 20px with a compact logo-only mark and centered status label.

- 4cf383b: `kibi doctor --format json` now reports the installed `kibi-mcp` version on
  normal consumer installs where the published package restricts its `exports`
  map. Coordinated `kibi-cli` + `kibi-mcp` installs no longer see a misleading
  "install one coordinated Kibi artifact set" instruction; that remediation now
  fires only when a package is genuinely absent from the install graph.
  - Resolve sibling package manifests through the package entrypoint when the
    `./package.json` subpath is not exported, instead of falling through to
    unresolved provenance.
  - Extend packed npm and pnpm consumer release-contract tests with doctor
    provenance assertions (`runtime.mcpVersion`, manifest locations, and absence
    of `package-provenance-unresolved`).
  - Preserve authored symbol manifest provenance (`sourceFile`, granularity, and
    role fields) when a partial `kb_upsert` payload adds relationships to an
    existing symbol; relationship-only updates no longer strip extraction
    ownership and abort coordinate refresh.

- 7bc4f61: Symbol coordinates no longer vanish when agents edit symbols, and a stale warm cache can no longer hide the damage. Editing a symbol through Kibi now keeps its exact code location in compiled knowledge, and when compiled state ever loses those coordinates while everything else looks unchanged, the approved coordinate refresh actually repairs it instead of reporting "Imported 0". Refresh failures now stop the operation loudly instead of being logged and ignored, so proof gaps appear immediately rather than after the next full rebuild.
  - Source-first symbol upserts re-extract the canonical manifest + artifact entity before committing; authored `symbols.yaml` stays coordinate-free.
  - Sync cache v2: workspace-root-relative keys, `symbol-coordinates.yaml` fingerprinted with its manifest, explicit refreshes forced through persistence, cache written only after durable save.
  - Generated artifacts become identity-bound v2 records published atomically under a workspace symbol compiler lock; malformed artifacts fail closed everywhere.
  - New MCP/CLI regression suites plus a Prolog proof-stage regression cover persistence, warm-cache repair, and fail-closed behavior.

- 51fb55b: GitHub Pages now publishes the requirement-health report and badge under `/kibi-report/` instead of the site root. That keeps Kibi from occupying `/index.html` by default on project and owner Pages sites.
  - Namespace the packaged report and badge-only workflows, `kibi init --github` URLs, and this repository's proof Pages deploy under `/kibi-report/`.
  - Document that `deploy-pages` still replaces the Pages deployment; merge `kibi-report/` into an existing site when Pages is already in use.

- 1ca62af: Pull requests now generate and validate the Kibi requirement-health report without publishing it. Reviewers can download the candidate HTML report and badge as a workflow artifact, while GitHub Pages still shows only the repository default-branch snapshot.
  - Run the canonical `kibi-report.yml` (and badge-only) workflow on `pull_request` as well as default-branch push and `workflow_dispatch`.
  - Upload `kibi-pr-report` from pull requests; skip Pages configure/upload/deploy on `pull_request`.
  - Keep `pages: write` and `id-token: write` on the deploy job only. Do not use `pull_request_target`.

- f1a6d5c: Canonical Kibi skill guidance no longer names specific agent hosts or editor products.

  Users running SkillOpt trust-plane scans (or anyone redistributing the bundled skills) previously hit hard failures because baseline skill text mentioned a specific host by name while candidate validation forbids host/provider claims in optimized bodies. The guidance now says "hosts may expose prefixed identifiers" and "editor dot-directories", keeping the same operational advice without naming any product. No workflow steps changed; only two sentences were reworded.
  - kibi-usage SKILL.md: host-prefix sentence made host-neutral
  - kibi-freshness SKILL.md: dirty-worktree example path made product-neutral

- 44fd818: Canonical kibi-usage skill guidance no longer illustrates the direct-store-edit anti-pattern with a literal `.kb/` path.

  Trust-plane candidate validation rejects any skill text that appears to advise touching the compiled store directly, and the baseline itself tripped that check ("direct `.kb/` edits"), so affected optimization stages could never freeze a candidate. The sentence now says "direct KB-store edits"; the guidance is unchanged.

  Follows the earlier host-neutral wording fix; together these make all four canonical skills valid baselines for SkillOpt runs.

- 8fe890c: The requirement-health README badge now looks like the other GitHub badges: the Kibi logo sits next to a `kibi` label, and the status pane is only as wide as the proven-percentage text. The extra empty space on the right is gone, so it no longer dominates the badge row.
  - Pair the canonical logo with a `kibi` label on the left pane.
  - Size the SVG from the label and message text instead of a fixed 178px width.

- Fix staged freshness checks silently passing on large repositories

  Kibi's pre-commit gate reads staged files through `git show` with Node's
  default 1 MiB output buffer. Repositories with an authored symbol manifest
  larger than that limit had the manifest silently skipped, so `kibi check
--staged` compared source symbols against stale HEAD state and could block
  commits with false `symbols_manifest_stale` errors — or worse, wave through
  genuinely stale artifacts. The Git execution buffer is now 64 MiB, so large
  manifests and coordinate artifacts are read in full and freshness is judged
  against what is actually staged.
  - Raise the child-process buffer used by staged-file collection to 64 MiB
  - Keep injected test executors unchanged; only the default executor grows

- 395e38f: Explicit branch recovery now retires only the pending-source receipts it
  actually observed, while ordinary discovery remains fail-closed when an
  authored source is missing. If another operation replaces a receipt during
  recovery, Kibi preserves that newer intent and reports the recovery as
  incomplete instead of silently deleting it.
  - Carry receipt path, source path, source hash, and raw receipt digest through
    recovery publication for authored files and relationship shards.
  - Compare receipt identity before cleanup and fail when it changed.
  - Cover read-only failure, preview non-mutation, successful recovery cleanup,
    and replacement-receipt retention in isolated fixtures.

- Generated symbol coordinates now stay aligned with live source files during sync and source-first mutations, even when operations overlap or fail partway through. Coordinate artifacts are published and restored atomically, so callers do not inherit stale or half-written compiler state.
  - Add workspace-scoped symbol compiler locking and compare-before-restore artifact rollback.
  - Include coordinate artifacts and referenced source files in sync freshness fingerprints.
  - Support explicit `test-suite` granularity for intentionally coarse test anchors.

- 535dea8: Agents can now keep working in synthetic, detached, or unreadable workspaces while Kibi reports the migration work it can evaluate. Coverage and checks preserve their useful domain results when branch status is unavailable, and the Codex/Cursor skill assets now stay aligned with their published plugin metadata.
  - Keep status-derived migration actions read-only and append them only when branch resolution succeeds.
  - Preserve the shared migration-plan contract across coverage and checks without requiring a Prolog-backed status query in non-Git harnesses.
  - Synchronize plugin manifests and freshness skill CLI examples for the next coordinated patch release.

- 5fdb828: CI-generated proof reports no longer claim the workspace was dirty.

  Every strict proof run appends fresh verification receipts to the tracked test documents before the health report is generated. Those receipt-only edits cannot change the verification snapshot hash — receipts are stripped before hashing — yet the workspace dirtiness flag was computed from raw git status, so every CI report shipped a "Proof was evaluated against a dirty workspace" warning even though the checkout was clean. Receipt-only markdown changes are now classified as not snapshot-relevant, keeping the dirtiness flag consistent with the snapshot hash it guards.
  - `workspaceSnapshot` in `packages/cli/src/public/operations/node-ports.ts` now compares receipt-stripped working-tree content against the receipt-stripped `HEAD` blob for modified tracked markdown files; matching content marks the change as receipt-only and excludes it from snapshot dirtiness.
  - Added a unit regression covering receipt appends to a tracked proof document: dirtiness stays false while non-receipt edits still dirty the snapshot.

- b97329a: Verification status now remains reusable when the only local changes are operational Kibi artifacts that are excluded from the code snapshot. Those changes still appear in status diagnostics, while source changes continue to mark verification evidence dirty.
  - Derive workspace snapshot dirtiness from snapshot-relevant changes rather than every Git porcelain row.
  - Preserve complete change records and counts for operational diagnostics.

- c942344: Kibi now keeps long-lived Prolog discovery responses intact even when JSON is printed across multiple lines, and Codex hook state remains durable under concurrent updates. Coverage runs also produce an auditable source manifest and continue collecting all shards so one failure cannot hide the rest of the signal. This makes the initial coverage floor measurable while leaving a clear path to the 100% target.
  - Patch `kibi-cli` for multiline Prolog binding parsing.
  - Patch `kibi-codex` for append-only hook-state persistence and deterministic concurrency handling.

- 07803e4: Kibi discovery commands no longer let one relationship query corrupt JSON output for later commands sharing the workspace engine. Status now distinguishes a readable branch store from an unavailable or malformed engine response, so operators get a safe restart hint instead of an unnecessary branch-store recovery diagnosis.
  - Keep daemon Prolog answer formatting immutable across requests, reject `set_prolog_flag` through the engine query boundary, and fail closed when exclusive publication cannot stop an existing engine.
  - Add bounded JSON-binding diagnostics and regression coverage for cross-command engine reuse and status classification.

- b746960: Kibi now teaches and enforces requirement supersession in one consistent
  direction: the replacement points to the requirement it replaces. Reversed
  edges can no longer hide a newer contradictory policy merely by making that
  newer requirement non-current. Relationship checks also block authored links
  that have silently disappeared from compiled knowledge.
  - Document `supersedes` as new-to-old across bundled and generated skills.
  - Reject reversed supersession when tracked source history proves that the
    purported replacement predates its target.
  - Restrict legacy branch migration to literal-to-hashed storage conversion for
    the same exact Git identity; every cross-identity pair is refused.
  - Cover exact-Git branch policy conflicts and approved evolution with Prolog
    regression tests.
  - Preserve partial-upsert relationship projections and validate
    authored-to-compiled relationship parity.

- 400e88c: Supersession writes now enforce tracked source history when Kibi is running through the journaled engine. Conservative proof also distinguishes executable production behavior from structurally tested TypeScript type shapes, keeping exported types traceable without pretending that erased declarations receive runtime E2E coverage.
  - Read target requirement provenance through the engine's typed entity projection.
  - Retain the raw Prolog fallback for compatible embedded callers.
  - Require E2E `covered_by` and runtime coordinates only for behavioral production symbols; retain type-shape ownership through real unit import contracts.

- Updated dependencies [1ca62af]
- Updated dependencies [7654339]
- Updated dependencies [400e88c]
  - kibi-core@0.11.0

## 0.21.0

### Minor Changes

- Existing Kibi installations now receive an agent-guided migration workflow instead of opaque repair advice. Status, checks, and coverage expose one deterministic, hash-bound action plan; agents can safely apply only explicitly approved automatic repairs while semantic, proof, package, and operator work remains visible for review. This makes damaged or legacy KBs recoverable without direct `.kb` edits and gives every run an auditable post-application readback.
  - Add `kibi.migration-plan.v2` fragments to the 21-operation surfaces and support hash/action authorization in `kb_apply_plan` and `kibi migrate --apply-safe`.
  - Add lazy status/planning and deterministic schema, branch, storage, coordinate, and recovery action execution with workspace-root-safe CLI/MCP parity.
  - Refresh agent skills, traceability fixtures, and SkillOpt coverage for migration safety boundaries and five-axis closeout reporting.

### Patch Changes

- Updated dependencies
  - kibi-core@0.10.3

## 0.20.1

### Patch Changes

- de7b85a: Verification contracts can now evolve without forcing projects to erase valid historical test evidence. Kibi preserves every earlier receipt, accepts a newly appended receipt for the current contract, and only treats evidence matching both the current contract and live code snapshot as proof.
  - Separate immutable receipt-history validation from current-contract binding during verification ingest.
  - Report `verification_contract_mismatch` as an explicit proof gap until current-contract evidence is appended.
  - Teach the usage skill and SkillOpt evaluator to preserve older-contract receipts and forbid history rewrites.

- 584336b: Agents now get consistent guidance when execution proof, structural coverage, and KB freshness disagree. Current-contract E2E evidence is recorded as v2 without rewriting history, and full checks no longer report a contradictory weak-depth warning when the same live receipt already proves the scenario-backed test. Receipt freshness repairs also identify the affected requirements and tests so agents can rerun the exact contract.
  - Share snapshot-bound proof evidence with full quality diagnostics.
  - Add bounded receipt-gap telemetry and v2-native remediation guidance.
  - Document and test the new receipt and proof-aware diagnostic requirements.
  - Refresh the mirrored usage skills and dogfood-derived SkillOpt expectations.
  - Keep the MCP package contract verifier self-contained with an explicit semver development dependency and matching workspace lock ranges.

- Kibi can now explain a missing or damaged branch-local KB without changing it. Agents receive a precise recovery path, preserving the existing store before a deliberate rebuild, and no longer need to guess whether a clean check also means a clean, fresh KB.
  - Add non-mutating branch-store inspection to status and a preview-first `kibi branch recover --apply` workflow.
  - Restrict branch migration to the detected historical `master` -> legacy `main` compatibility attachment; arbitrary branch moves are refused.
  - Refresh CLI/MCP status documentation, mirrored agent skills, and release-gate packed consumer coverage.

- ef75929: Kibi’s release checks now validate compiled package APIs and dependency ranges in isolated npm and pnpm consumers, while the usage skill and private SkillOpt evaluator report task completion, KB freshness, verification, proof, and accepted limitations independently. Consumer repositories keep ownership of their local artifact update scripts and dependency overrides.
  - Remove library-side consumer dogfood installers and retain release-only packed checks.
  - Add deterministic closeout expectations and dogfood-derived held-out cases.

- Updated dependencies [de7b85a]
- Updated dependencies [584336b]
  - kibi-core@0.10.2

## 0.20.0

### Minor Changes

- 9d71304: Kibi can now compile a complete change intent into a reviewable, snapshot-bound plan before anything is written, then apply an explicitly approved plan only after rechecking its hash and live snapshots. The new operations reuse intent-aware discovery and semantic modeling, account for every proposition, surface current contradiction witnesses, and keep traceability proposals separate from executable steps until explicitly accepted.
  - Add the shared `kb_compile_intent` / `compile-intent` operation and deterministic `kibi.compile-plan.v1` result.
  - Add the guarded `kb_apply_plan` / `apply-plan` mutation boundary and `kibi.plan-apply-result.v1` result.
  - Add contracted verification ingestion through `kb_ingest_verification`, including snapshot-bound `kibi.verification-receipt.v2` case results.
  - Register the operation through the CLI and MCP parity surfaces with contract tests and documentation.

- Dogfood projects now get branch-local knowledge bases that follow the exact Git ref, actionable stale-source diagnostics, and a sanctioned relationship cleanup path. Verification receipts and packed package provenance are stricter and reproducible, while agents receive conservative symbol-recovery guidance and explicit interim-state signals. This prevents silent `master`/`main` drift and makes passing E2E evidence distinguishable from complete semantic proof.
  - Remove implicit branch-name normalization and add previewed legacy branch migration.
  - Add exact relationship deletion, v2 receipt/schema parity, status diagnostics, dogfood package manifests, and SkillOpt cases.

- 9d71304: Kibi search can now recover requirements from unfamiliar functionality wording and changed source locations when the host agent supplies semantic facets. Intent searches return deterministic ranking evidence, traceability graph evidence, and an explicit abstention signal for low-confidence results while preserving the existing lexical search behavior.
  - Add the `intent-v1` search ranking mode and source-location validation.
  - Expose semantic facet matches, source matches, graph paths, and query analysis in shared CLI/MCP structured output.

- 9d71304: Kibi can now run an explicitly contracted Playwright command and immediately ingest its raw reporter artifact as snapshot-bound proof. Stable Playwright case IDs and a dependency-free reporter make exact case/project coverage visible, while command mismatches, missing artifacts, retries, and stale snapshots fail closed.
  - Add the CLI-only `kibi verify` orchestration command.
  - Export the Playwright reporter and stable case-ID helpers.
  - Add deterministic case extraction and change-to-proof evaluation utilities.

### Patch Changes

- 7ddbaff: Dogfood projects can now resume proof work without losing their declared test intent. Test entities persist a typed verification contract, workspace snapshots ignore receipt-only churn consistently, and the sync guard no longer mistakes quoted requirement prose for executable escape hatches. Explicit ontology gaps remain unresolved rather than being reported as missing logical proof.
  - Persist and validate `verification_contract.v1` through extraction, mutation, sync, and staged traceability KBs.
  - Version the receipt-stable workspace snapshot as `kibi.workspace-snapshot.v2`.
  - Make logic coverage inventory-aware and support Prolog-encoded semantic inventories.

- MCP startup now fails with the original dependency error instead of silently loading an unpackaged source file, and the CLI/MCP package contract is checked against the packed artifacts. The coordinated release also makes MCP require the CLI release that exports every operation it imports.
  - Preserve compiled-entrypoint import errors in the `kibi-mcp` launcher.
  - Require the compatible `kibi-cli` export surface and verify it in isolated package consumers.

- Updated dependencies
- Updated dependencies [7ddbaff]
  - kibi-core@0.10.1

## 0.19.0

### Minor Changes

- 3ac9a89: Kibi now keeps a shared engine warm for each workspace and branch, so repeated
  CLI and MCP operations no longer pay SWI-Prolog startup or rewrite a complete
  RDF snapshot for every change. Existing branches migrate once to journaled RDF
  storage, while normal sync updates only changed sources and relationships.
  Writes keep their audit record transactionally, and the new storage commands
  make compaction and legacy exports explicit.
  - Add SWI `rdf_persistency` journal attach/save/compact/export and guarded legacy
    migration with generation metadata and old-client fencing.
  - Add the Node 18+ engine daemon, framed local RPC client, lifecycle commands,
    Node-only CLI/MCP runtime boundary, and delta sync batching.
  - Add journaled-engine requirements, scenarios, tests, and ADR-024.

### Patch Changes

- Kibi's CLI now starts substantially faster, and its integration tests reuse the
  journaled engine without leaving background processes behind. Packed end-to-end
  tests share one immutable installation and run with bounded concurrency, making
  the release suite faster while preserving workspace and branch isolation.
  - Lazily load CLI operation implementations while parity-testing lightweight
    registration metadata against the authoritative operation catalog.
  - Gracefully flush and stop engine daemons on process signals, and add
    deterministic per-fixture engine cleanup to unit and packed E2E harnesses.
  - Reuse long-lived Prolog fixtures where lifecycle isolation is not under test,
    parallelize root batches conservatively, and install packed artifacts once.

- Updated dependencies [3ac9a89]
  - kibi-core@0.10.0

## 0.18.1

### Patch Changes

- Upserts now finish as one bounded commit, so an entity, its relationships, audit history, and branch snapshot succeed or fail together. Historical audit journals no longer remain locked after a write, and stale runtimes receive a clear restart instruction instead of hanging indefinitely. Timed-out Prolog work is terminated and reaped, including the process group, so later Kibi operations can continue safely.
  - Add `kb_commit_upsert/5` with branch-lock, snapshot, audit-lock, stage-marker, and single-save handling.
  - Attach persistent audit stores with `sync(close)` and use non-blocking stale-lock probes.
  - Route CLI upserts through the combined commit goal and manage Bun one-shot children asynchronously with TERM/KILL escalation.

- Updated dependencies
  - kibi-core@0.9.1

## 0.18.0

### Minor Changes

- Coverage reports now distinguish structural linkage from a conservative end-to-end requirement proof. Users can see exactly which semantic, contradiction, scenario, E2E, symbol, or source-coordinate stage prevents proof, together with ranked repair guidance; executable test symbols also stop inflating production-coverage counts. Structured proposition ledgers and refreshed symbol coordinates now survive sync as queryable proof evidence.

  Current requirement ingestion now fails closed when assertive prose is missing from its ledger, drifts from its source hash or byte spans, duplicates an identity, or claims a modeled representation without exactly one same-key grounding fact. Markdown projects receive a compatibility baseline before new or semantically edited requirements are held to the contract, and explicit unresolved states remain usable without being misreported as consistency.

  Proof-bearing tests now keep append-only execution receipts tied to the current deterministic workspace snapshot. Coverage and status expose that snapshot through CLI and MCP, and missing, stale, failed, malformed, mismatched, future-dated, or unavailable evidence can no longer inherit authority from a durable `passing` label.

  Requirement coverage now turns proof gaps into a deterministic read-only migration plan. Users can work one validated dependency batch at a time, see when pagination makes a plan incomplete, and avoid applying downstream links or receipts before their semantic and graph prerequisites exist.

  Diagnostic usage evidence now drives a versioned workflow acceptance report. Users can enforce fresh advisor, validation, source-lookup, proof-recovery, receipt, and mutation-retry evidence from the CLI, while unfiltered CLI/MCP checks surface ranked project-local repairs without treating missing or stale telemetry as a pass.

  Distribution audits now compare the same six requirement-compiler behaviors across source, freshly packed CLI/MCP packages, and the binaries actually resolved by dogfood or pinned projects. Unsupported legacy capabilities remain explicit non-matches, executable provenance is inspected directly, and every project divergence needs a named upgrade or compatibility action.

  Diagnostic workflows now produce correlated evidence through both CLI JSON and MCP surfaces. Operators can run a read-only versioned remediation report that points to exact unmatched log events, preserves explicit missing-coverage work, and prevents advisor or preflight evidence from a different identified session or actor from counting as proof.

  Legacy prose can now be inspected one requirement at a time through a deterministic migration preview. The preview preserves existing code evidence, binds every extracted proposition to exact authored source, ranks project-local ontology candidates, and never emits an auto-applicable write.
  - Add the shared `kibi.requirement-proof.v2` Prolog evaluator and expose its rows, fresh receipt evidence, and summary counts through CLI and MCP coverage.
  - Persist generated symbol coordinates and symbol metadata into normal and staged RDF projections.
  - Preserve semantic-inventory JSON through mutation, sync, RDF storage, and query round trips, and refresh coordinates before extracting their manifest overlay.
  - Render proof state and proof gaps in the CLI coverage table, and classify symbol traceability roles explicitly.
  - Document the proof contract and update the bundled traceability skill to use proof outcomes instead of structural counts as its success boundary.
  - Add the versioned `kibi.semantic-inventory.v1` boundary to CLI/MCP preflight, upsert, modeling plans, and Markdown sync, with packed-package E2E coverage.
  - Preserve JSON Schema `const` values through MCP's Zod adapter so source and packed tool contracts enforce and advertise the same inventory version.
  - Add append-only `kibi.verification-receipt.v1` validation, RDF/Markdown persistence, snapshot-bound freshness checks, explicit repair gaps, and CLI/MCP workspace-snapshot parity.
  - Discover project-local predicate schemas from normalized RDF, withhold write plans for unbound ordered arguments, and accept exact `schemaId`, `argumentBindings`, and reviewed `polarityHint` inputs for conservative completion without lexical guessing.
  - Attach source-bound strict, predicate, and rule witnesses to contradiction diagnostics, preserving unresolved rule overlap as incomplete analysis in requirement proof.
  - Add `kibi.repair-plan.v1` to requirement coverage with stable plan IDs, per-requirement dependency batches, pagination fail-closed behavior, validation workflows, and non-auto-applicable sequential mutation policy across CLI and MCP.
  - Add `kibi.telemetry-acceptance.v1`, exact mutation fingerprints, coverage recovery/receipt event fields, the `usage-metrics --require-acceptance` gate, and telemetry-backed full-check quality diagnostics.
  - Add `kibi.distribution-parity.v1`, executable-derived runtime provenance, stable semantic normalization, action-bound project divergences, and packed/project-resolved E2E fixtures for the six requirement-compiler capabilities.
  - Add CLI JSON diagnostic logging, opaque session/actor correlation, and the deterministic read-only `kibi.telemetry-remediation.v1` report and command.
  - Add `kibi.legacy-migration-plan.v1` to CLI and MCP coverage with fail-closed source binding, exact proposition inventories, schema-provenance ranking, deterministic pagination, and packed read-only E2E coverage. Requirement-only `semantic_text` now carries authored prose independently from `text_ref` evidence, and semantic source drift blocks review application.

### Patch Changes

- Updated dependencies
  - kibi-core@0.9.0

## 0.17.0

### Minor Changes

- a52b592: Kibi can now turn a requirement’s assertive prose into reviewable, typed logical models while keeping the original wording for people. Conditional rules, obligations, permissions, prohibitions, exceptions, bounded quantities, and temporal qualifiers are validated before they enter the knowledge base, and contradictions can report structured witnesses instead of relying on executable text. Existing requirements remain compatible and can be migrated or backfilled deliberately.
  - Add versioned `kibi.logic.v1` IR, safe bounded Prolog interpretation, rule schemas, rule facts, provenance, and contradiction checks.
  - Extend the semantic advisor with proposition inventories, typed alternatives, source spans, shadow audits, and logic apply plans.
  - Preserve rule fields and `requires_rule` through CLI, MCP, Markdown, Prolog, and schema validation surfaces.
  - Add rule safety, rule verifiability, and semantic completeness checks plus schema-v4 migration metadata.

### Patch Changes

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.
  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

- 6d66110: Read-only Kibi commands (`kibi query`, `kibi search`, `kibi status`, `kibi gaps`, `kibi coverage`, `kibi graph`) now work in non-git workspaces again, attaching to the `main` branch just like `kibi init` and `kibi migrate` already do. A recent branch-resolution fix for unborn git repos had removed that non-git fallback, which broke the packed-install smoke test and blocked npm publishing.
  - Restore the `main` fallback in the CLI operation runtime only for `NOT_A_GIT_REPO` and `GIT_NOT_AVAILABLE` contexts.
  - Keep propagating genuine git branch-resolution errors (detached HEAD, invalid branch, unknown) so read operations never silently attach to the wrong branch.
  - Add a runtime regression test pinning non-git fallback to `main` and a second test confirming real git failures still propagate.

- 750ff49: `kibi check --staged` now reports the paths Kibi is actually configured to use. Previously the stale-coordinates and missing-evidence diagnostics always printed the default `documentation/symbols.yaml` and `documentation/symbol-coordinates.yaml`, so repos that configure `paths.symbols` (for example `docs/symbols.yaml`) were told to stage files that do not exist. The staged-symbols freshness check also stopped treating coarse-documented symbols as a perpetual failure: source files whose manifest entries are all documented with a canonical granularity reason (for example `module-level-behavior`) no longer require per-symbol coordinate refresh and no longer emit `symbols_manifest_stale` after a coordinate refresh.
  - Thread the config-resolved symbols manifest path from `check --staged` into `collectStagedKibiDiagnostics` and render `files`/`message`/`suggestion` with the effective `symbols-coordinates.yaml` path carried on the impact evidence.
  - Define "coarse" with the canonical no-coordinates granularity set (`COARSE_GRANULARITY_REASONS`: `config-artifact`, `module-level-behavior`, `extractor-miss`, `test-suite`), so unknown or malformed reasons cannot bypass freshness checks. `legacy-link` records stay coordinate-bearing because they track real extractable symbols.
  - Exclude coarse records from per-symbol coordinate comparison; a file with only coarse records is `not_required`, mixed manifests still require complete fresh fine-grained coverage, and record-less files remain `stale`/`missing`.
  - Add unit and CLI-level regression tests covering configured `docs/` diagnostics paths and coarse/mixed/invalid-granularity freshness.

- 2a85fc8: Kibi can now track whether every atomic clause in a normative requirement has a queryable logical representation. Readable prose remains intact, while stable claim keys, linked strict-property or predicate facts, and a requirement manifest expose incomplete modeling before it silently weakens contradiction detection. Exact opposite polarities over the same ground predicate now produce a contradiction.
  - Remove repository-specific release and optimizer-corpus text from `kibi-usage`.
  - Add portable clause-complete prose-to-ground-predicate/property guidance and examples.
  - Preserve logical claim and predicate-schema fields through Markdown sync.
  - Add semantic-advisor clause inventories, merged claim manifests, and the `logic-coverage` check.
  - Enable manifest validation by default and report every current unmanifested requirement as explicit backfill debt.
  - Detect exact `assert`/`deny` conflicts over the same ground predicate.
  - Normalize trailing clause punctuation so formatting variants share one claim identity.
  - Enforce a one-claim/one-ground-fact mapping and reject duplicate logical terms masquerading as separate coverage.
  - Preserve every target when exact query results contain repeated relationship types.
  - Keep semantic-advisor readiness partial until every normative claim has a distinct logical grounding slot.
  - Drain machine-readable CLI output before the explicit process exit so large results are complete without leaving runtime handles alive.
  - Preserve and enforce claim-key patterns, uniqueness, and paired provenance through MCP schema registration.
  - Synchronize the corrected skill into the Codex and Cursor bundles.

- a28d325: SkillOpt verification now reads canonical skill bundles from an explicitly authorized repository snapshot, and the public skill loader is split into focused modules with scoped readers. That stops locked source or isolated target checkouts from silently falling back to a different skill tree during review and adoption planning.

  fix(cli): add scoped canonical skill bundle loaders

- 38f72bf: Refreshing symbol coordinates now leaves the authored symbol manifest stable and keeps generated locations exclusively in `symbol-coordinates.yaml`. Repeated refreshes no longer alternate thousands of generated fields in and out of `symbols.yaml`, making traceability updates reviewable and idempotent.
  - Strip generated coordinate fields from every authored symbol entry after extraction.
  - Clarify the manifest header and cover coordinate-free and legacy entries in the refresh tests.

- 2d93976: `kibi sync --refresh-symbol-coordinates` no longer reports coarse symbol anchors as coordinate-refresh failures. Symbols that intentionally represent a whole test file, module-level behavior, config artifact, or an acknowledged extractor miss legitimately carry no per-symbol coordinates, so they are now counted as unchanged instead of failed. This makes the refresh summary trustworthy: `failed` now means a fine-grained code symbol that should have coordinates but could not be located.
  - Treat `test-suite`, `module-level-behavior`, `config-artifact`, and `extractor-miss` granularity reasons as coordinate-ineligible.
  - Repoint `formatInvalidRelationshipError`/`Tuple` and `formatRelationshipSourceMismatch` to their defining module and merge their interface-parity traceability.
  - Drop duplicate and dead symbol manifest entries (`SkillsLoadPayload`, re-export duplicate `SemanticAdvisorArgs`, `SYM-parity-format-*`, duplicate `process-control` anchor).
  - Fix `kibiOpencodePlugin` to point at its defining file with an acknowledged `extractor-miss`.
  - Add `test-suite`/`config-artifact` granularity to remaining prose-titled test and scope anchors.

- 2f9073c: Kibi now ships optional guidance for recording UI and visual expectations, so agents working on a screen can discover "where things live" and cannot silently drift the layout. A prose requirement anchors the full visual description, checkable positions, alignment, and header ordering decompose into strict facts that reject conflicting writes, and relational alignment uses the built-in `visual_layout_rule` predicate. The lane is per-project: non-UI projects simply never model UI subjects, and no validation rule requires them.

  Also, `kb_status` within a long-lived MCP session now observes same-session file and KB changes instead of returning a stale cached result. Compound Prolog goals (such as the status query) are no longer cached in one-shot mode, so a status check after a source or documentation edit reports the current freshness state.
  - Add `docs/ui-requirements.md` with the three-layer UI modeling guide, payload-shaped examples, and the check workflow.
  - Point the modeling cheatsheet decision tree, agent LLM rules, and the AGENTS quick references at the new UI lane.
  - Add a self-contained `kibi-usage` skill resource (`resources/ui-requirements.md`), declare it in the skill manifest, and add a UI modeling workflow section.
  - Synchronize the updated `kibi-usage` skill into the Codex and Cursor bundles.
  - Keep compound Prolog goals out of the one-shot query cache so `kb_status` reports fresh state after same-session writes.

- Updated dependencies [2a85fc8]
- Updated dependencies [a52b592]
  - kibi-core@0.8.0

## 0.16.1

### Patch Changes

- 7bc935f: Kibi checks no longer flag a manifest symbol as coarse merely because a different sibling function changed. Staged manifest-only changes also continue to supply Kibi impact evidence. This keeps impact diagnostics focused on the code and metadata that actually changed.
  - Preserve full-source manifest anchors during hunk-based granularity analysis and retain changed manifest entity IDs for staged checks.

## 0.16.0

### Minor Changes

- b2b1792: Kibi guidance now helps agents distinguish suitable relational predicates from scalar constraints and review-only claims without replacing readable requirements. CLI, Codex, and Cursor users receive the same predicate-first decision tree and authoritative examples, reducing invented predicates and unsafe modeling.
  - Add built-in, project-local, deny, strict-scalar, ambiguity, false-positive, and ontology-gap guidance to the canonical `kibi-usage` skill.
  - Regenerate the Codex and Cursor mirrors with matching canonical hashes.

### Patch Changes

- 80d5173: Broad Kibi searches now return ranked results even when the serialized entity set is larger than the subprocess runtime's former default output capacity. Searches that exceed Kibi's explicit safety bound now report a clear bounded-capacity failure instead of returning truncated output or a misleading generic Prolog error. Graph, status, and other JSON reporting commands now also load their Prolog module correctly in fresh Node CLI and MCP sessions.
  - Bound one-shot and interactive Node Prolog stdout and stderr capture at 8 MiB, and require a complete response terminator before parsing, while preserving query timeouts and ranking-before-pagination.
  - Translate `ENOBUFS` into a deterministic nonempty query error shared by CLI and MCP discovery paths.
  - Reject negative pagination and search queries above 4,096 characters through the existing typed input-validation boundary.
  - Load reporting modules before executing module-qualified goals in interactive Prolog sessions.

- Staged Kibi checks no longer emit duplicate `symbol_coordinate_review` diagnostics when both staged and working-tree symbol manifests contain entries for the same source files. The manifest lookup now deduplicates by symbol ID and source-signature before running impact validation.
  - Deduplicate authored and manifest symbol extraction results by stable lookup key before building the staged impact lookup.
  - Prefer staged entries over working-tree entries when both exist for the same symbol.

- CLI read-side operations (query, search, status, gaps, coverage, graph) now resolve the active branch correctly on unborn repositories (fresh `git init` with no commits). Previously, these operations silently fell back to `main` when `git rev-parse --abbrev-ref HEAD` failed on an unborn HEAD, causing empty results while `kibi sync` correctly wrote to the actual branch.
  - Replace `git rev-parse --abbrev-ref HEAD` with `resolveActiveBranch(root)` for all read-side CLI operations.
  - Propagate branch resolution errors instead of silently falling back to `main`.

- 610b5be: The improved Kibi guidance skills will ship to CLI, Codex, and Cursor users in the next package release. This keeps the canonical CLI skill bundle and the generated client-plugin mirrors aligned for downstream installs.
  - Release the canonical skills bundled by `kibi-cli`.
  - Release the generated `kibi-codex` and `kibi-cursor` skill mirrors.

- Updated dependencies [28dba1f]
  - kibi-core@0.7.1

## 0.15.0

### Minor Changes

- 6abc7ea: Operators can now run semantic requirement analysis through the dedicated `semantic-advisor --input` CLI route with the same JSON contract and deterministic suggestions as MCP. MCP and upsert analysis now reuse the shared CLI implementation, so ambiguity witnesses and modeling advice stay aligned without starting Prolog.
  - Move semantic-advisor analysis, types, coverage evaluation, and execution into size-bounded `kibi-cli` modules.
  - Replace the MCP semantic-advisor implementation with a thin shared-executor adapter and update upsert imports.

- 6c132ee: Operators can use `find-gaps`, `coverage`, and `graph` through either CLI flags or JSON input with the same results exposed by MCP. The existing `gaps` command remains available as an alias, while reporting defaults and traversal bounds stay unchanged.
  - Move find-gaps, coverage, and graph execution into shared `kibi-cli` operation specs.
  - Replace MCP reporting business logic with thin shared-executor adapters.
  - Route legacy reporting commands and JSON input through the shared operation protocol.

- a0fee4a: Kibi CLI now exposes all 18 MCP operations as peer public routes with exact JSON input/output, enabling agents to use either interface. Agents and automation can choose the transport their environment supports without losing operation coverage or contract fidelity.
  - Added a transport-neutral operation catalog.
  - Added dedicated CLI commands for upsert, delete, semantic-advisor, model-requirement, suggest-predicates, autopilot-generate, sparql-remote, and validate-upsert.
  - Added a cross-surface parity harness.

- c229a35: CLI and MCP operations now run through explicit, transport-neutral contexts while each transport keeps ownership of its own lifecycle. This makes one-shot CLI execution and persistent MCP sessions predictable without changing MCP tool behavior.
  - Add public operation runtime, capability-port, and lifecycle types to `kibi-cli`.
  - Add separate CLI and MCP runtime adapters with write-only MCP stamp refresh.
  - Route MCP registrations through runtime-backed operation specs while preserving timeout, diagnostics, and in-flight request handling.

- 212fe1c: CLI users can now validate and apply one MCP-shaped upsert payload through `validate-upsert --input` and `upsert --input`, including stdin input. Both transports now enforce the same relationship, contradiction, strict-fact, audit, symbol-granularity, durability, and rollback behavior.
  - Move validated upsert execution behind shared Prolog, filesystem, save, and symbol-refresh ports.
  - Keep MCP handlers as thin compatibility adapters and verify CLI/MCP graph-state parity.
  - Ensure a failed relationship prevents save and leaves no partial entity or edge state.

- 6c132ee: Operators now get the same query, search, and status results whether they use familiar CLI flags, JSON input, or MCP. Existing table output, discovery flags, ranking, pagination, relationship display, and status freshness behavior remain available while the execution paths can no longer drift independently.
  - Move query, search, and status business logic into shared `kibi-cli` operation executors.
  - Replace MCP discovery implementations with thin shared-executor adapters.
  - Route human CLI commands and JSON protocol input through runtime-backed shared operations.

### Patch Changes

- 212fe1c: CLI and MCP checks now run the same validation executor, so both interfaces report the same violations for equivalent inputs. The CLI retains its staged workflow, fix suggestions, path overrides, dry-run behavior, and human-readable output while JSON input gains explicit parity coverage for impact diagnostics.
  - Route non-staged CLI validation and MCP `kb_check` through the shared check executor.
  - Preserve CLI advisory-quality and exit-code semantics in its adapter.
  - Add executable CLI/MCP check parity and JSON impact-option coverage.

- 8c3a2e9: CLI and MCP operation changes now have an executable semantic parity safety net. Contributors get immediate failures when an operation is missing, duplicated, or returns transport-specific business data.
  - Add isolated seeded workspace fixtures for all 18 catalog operations.
  - Compare CLI JSON and in-memory MCP results after narrowly scoped volatile-field normalization.
  - Enforce exact catalog-to-parity-case registry completeness.

- cafa25f: Agents can now select Kibi by available capability instead of stopping at MCP-specific guidance. The bundled skills prefer approved MCP tools, fall back safely to a project-local non-installing CLI runner, and provide executable JSON recipes plus an exact 18-operation access catalog.
  - Document every shared MCP operation's dedicated CLI route, input mode, effects, Prolog requirement, mutability, and telemetry handling.
  - Regenerate Cursor and Codex skill mirrors from the canonical capability-based source.

- 0a8a5d3: CLI and MCP users now receive real requirement-modeling and predicate-suggestion plans through the same shared operation executors. Prolog-backed status and reports work reliably again, nested skill commands accept JSON input, and compatibility errors no longer block parity verification.
  - Move modeling execution into `kibi-cli` and keep MCP handlers as thin adapters.
  - Split modeling internals into reviewable modules and use the operation workspace context for migration checks.
  - Restore compatible Prolog query, validation, deletion, and error behavior.
  - Align the MCP dependency range with the released CLI version and remove silent OpenCode catches.

- 212fe1c: Remote SPARQL SELECT queries now produce the same decoded rows through the CLI JSON route and MCP tool. Network access remains opt-in and HTTP(S)-only, while caller-provided timeouts retain their existing whole-second behavior.
  - Share endpoint, query, timeout, request, and result-decoding logic through the CLI operation executor.
  - Route CLI and MCP adapters through an explicit network port and verify parity against a local HTTP fixture.

- 6c132ee: Skill discovery now returns the same bundled metadata, content hashes, and declared resources through CLI JSON routes and MCP tools. This makes scripted CLI usage consistent with agent-facing skill loading while preserving the existing human-oriented `kibi skills` commands.
  - Share bundled skill list, load, and resource-read executors between CLI and MCP.
  - Exercise all three skill operations through the executable CLI/MCP parity harness.

- efa3c7e: Autopilot bootstrap synthesis now returns the same deterministic candidates, payoff guidance, and exact review-only apply plans through CLI JSON and MCP. Cold-start analysis no longer launches Prolog unnecessarily, making scripted bootstrap previews faster while preserving confidence and candidate safety bounds.
  - Share port-backed autopilot discovery, candidate construction, and result generation in `kibi-cli`.
  - Route `autopilot-generate --input` and `kb_autopilot_generate` through the same executor and parity harness.

## 0.14.2

### Patch Changes

- The bundled Kibi usage skill now explains the supported release workflow and correctly distinguishes MCP-first agent operations from CLI-only maintenance workflows. This keeps release guidance aligned with the repository’s develop-to-master process and prevents agents from treating direct `.kb` access as acceptable.
  - Bump the bundled `kibi-usage` skill metadata to 1.0.1.
  - Document changeset versioning, plugin manifest synchronization, and master-branch publishing.

## 0.14.1

### Patch Changes

- 6830005: Formatting-only source diffs no longer trigger Kibi impact review warnings. Agents and developers can now run formatter fixes without receiving semantic-review prompts for unchanged behavior, while actual copy or behavior edits still surface impact diagnostics.
  - Filter formatter-only changed-file impact hunks before extracting semantic-review symbols.
  - Preserve review diagnostics for meaningful text changes inside string and template literals.
  - Add regression coverage for whitespace-only and trailing-comma formatter diffs.

- c7126dd: CLI sync extraction tests no longer leak mocked extractors into later impact-analysis tests. This makes the unit coverage workflow deterministic in CI and prevents unrelated impact manifest checks from failing after sync extraction error-path tests run first.
  - Add an explicit extraction dependency seam for `processExtractions` while preserving the existing default CLI behavior.
  - Route sync extraction tests through injected dependencies instead of Bun module-level mocks.
  - Verify the polluted test ordering that previously failed in CI now passes.

- da9da64: `kibi check --staged` no longer treats ordinary README markdown without YAML frontmatter as a Kibi entity just because it lives under a typed documentation directory. Documentation-only README edits can now pass staged validation without requiring test-entity frontmatter.
  - Skip Markdown entity extraction for staged `.md` files that do not contain YAML frontmatter.
  - Add a staged-check regression for README files under `documentation/tests/`.

## 0.14.0

### Minor Changes

- f1db710: Coverage reports now explain how deep each requirement's test evidence goes without changing existing covered/uncovered semantics. CLI users and MCP clients can distinguish direct passing e2e evidence, scenario-backed e2e evidence, unit-only evidence, nonpassing test evidence, scenario-only coverage, and no evidence at all. Typed test verification fields are honored before legacy e2e tag/path heuristics, so modern test metadata produces more reliable coverage labels.

  Technical summary:
  - Add additive `coverageDepth` / `coverage_depth` fields and coverage evidence lists to requirement coverage rows.
  - Classify coverage depth from direct requirement tests, scenario tests, test statuses, and typed `verification_scope` values.
  - Surface coverage depth in CLI table output and MCP structured coverage results while preserving existing summary and `coverageStatus` fields.
  - Allow typed `verification_scope` and `verification_perspective` test fields through CLI/MCP entity schemas and MCP upsert serialization.

- f1db710: OpenCode background checks now surface advisory Kibi quality diagnostics without turning a clean check into an operational plugin failure. Users get concise structured maintenance logs for review-only findings while hard `kibi check` violations keep the existing failure behavior and exit status. The CLI check command also exposes a JSON format so background integrations can consume the same structured diagnostics reliably.

  Technical summary:
  - Add `kibi check --format json` output with `structuredContent.violations`, `count`, `diagnostics`, and `qualityDiagnostics`.
  - Run OpenCode targeted background checks with JSON output and parse non-blocking `qualityDiagnostics` on successful checks.
  - Log advisory diagnostic summaries through structured warning logs, preserving terminal silence and existing hard check failure routing.

- f1db710: Kibi check outputs now have a stable advisory diagnostics lane for auditability review signals. Operators and MCP clients can receive `qualityDiagnostics` alongside hard `violations` without advisory-only findings changing pass/fail counts or exit behavior. Existing staged impact failures, including symbol granularity violations, remain blocking. Source impact analysis now also highlights overly broad symbols, indistinguishable symbol coordinates, and mixed-purpose component/class ownership as review-only guidance.

  Technical summary:
  - Add the public `QualityDiagnostic` type with `error`, `warning`, `review`, and `info` severities plus explicit `blocking` semantics.
  - Preserve existing `violations`, `diagnostics`, and `impactDiagnostics` fields while adding MCP structured `qualityDiagnostics` output support.
  - Preserve explicitly filtered MCP `kb_check` rule semantics so advisory full-KB quality scans only run for unfiltered checks or requested impact diagnostics.
  - Clarify Codex and Cursor bundled agent guidance so targeted checks use explicit rules and final checks omit rules for full-KB `qualityDiagnostics` review.
  - Add quality diagnostic text formatting and shared blocking helpers that treat `blocking: true` or `severity: "error"` as hard failures.
  - Add non-blocking `multi_requirement_symbol_review`, `duplicate_symbol_coordinate_review`, and `component_mixed_purpose_review` impact diagnostics.

### Patch Changes

- 48b65b9: Kibi quality checks now let teams resolve noisy advisory warnings with explicit, reviewable KB metadata instead of creating fake e2e evidence. Passing integration-level regression evidence can satisfy coverage-depth quality checks, and requirements tagged as intentional umbrella or epic requirements no longer keep emitting broad-fanout diagnostics.

  Technical summary:
  - Preserve test `verification_scope` and `verification_perspective` fields during CLI sync persistence.
  - Treat passing integration coverage as sufficient quality evidence for coverage-depth diagnostics.
  - Suppress broad-fanout quality diagnostics for requirements explicitly tagged `umbrella` or `epic`.

- 439cb2e: Kibi now makes semantic Prolog adoption easier to measure and debug. Diagnostic usage logs expose semantic advisor readiness, predicate suggestion outcomes, upsert semantic readiness, and contradiction failures as structured fields instead of generic success/error text. Operators can opt into predicate-link audits and get Prolog validation query-plan safety checked by default, with normal `.kb/config.json` overrides available when needed.

  Technical summary:
  - Add `predicate-verifiability` as a default-off KB check rule that flags `requires_predicate` targets whose `fact_kind` is not `predicate`.
  - Add `query-plan-safety` as a default-enabled KB check rule that flags Prolog validation clauses that place negation before later generator calls.
  - Enrich MCP diagnostic usage fields for `kb_semantic_advisor`, `kb_suggest_predicates`, and `kb_upsert`.
  - Classify requirement contradiction errors as `semantic_contradiction` validation failures with actionable hints.
  - Preserve semantic context in CLI sync/rebuild validation errors instead of reducing Prolog failures to `Query returned false`.
  - Extend prose coverage with real dogfood project A annotation time-key and merge-policy requirements.
  - Refresh changed Prolog check modules through the MCP aggregated check loader.

- cb8d977: Kibi sync no longer treats README files inside configured entity directories as entities. This prevents human documentation such as fixture READMEs from producing missing-frontmatter warnings or failed background syncs while preserving normal entity markdown discovery.
  - Ignore `**/README.md` during CLI sync markdown discovery.
  - Ignore documentation `README.md` files during status freshness checks so synced workspaces remain fresh.
  - Add regression coverage for README exclusion in sync discovery.

- 224f18b: Agents and hook users now get clearer guidance when behavior-changing staged files are missing Kibi impact evidence. The staged check points to the staged-impact workflow, explains that MCP KB writes do not automatically stage tracked markdown or manifest evidence, and tells users which files to stage before rerunning the hook. MCP validation also catches invalid relationship shortcuts earlier, and bundled skill loading makes follow-up resources easier to discover.

  Technical summary:
  - Add Prolog-backed relationship tuple preflight to `kb_validate_upsert` when invoked through MCP.
  - Improve invalid relationship and relationship-source mismatch guidance in MCP upsert flows.
  - Include declared skill resources in `kb_skills_load` visible text and missing-resource errors.
  - Update staged impact diagnostic docs and bundled Kibi usage resources for requirement-mediated behavior-fix evidence.

- Updated dependencies [f1db710]
- Updated dependencies [439cb2e]
- Updated dependencies [cb8d977]
  - kibi-core@0.7.0

## 0.13.1

### Patch Changes

- Symbol metadata writes now work consistently through MCP and the underlying Prolog schema. Agents can create source-linked symbol entities with `symbol_role` and `granularity_reason` metadata without hitting a transaction failure after JSON validation succeeds. This keeps behavioral-anchor traceability usable from the MCP-first workflow.

  Technical summary:
  - Add `symbol_role` and `granularity_reason` to the Prolog entity schema copies shipped by `kibi-core` and `kibi-cli`.
  - Serialize `granularity_reason` as a Prolog atom in `kb_upsert` transactions.
  - Add Prolog and MCP regression coverage for symbol metadata fields.

- Updated dependencies
  - kibi-core@0.6.5

## 0.13.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:
  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

## 0.12.8

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.
  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

## 0.12.7

### Patch Changes

- Added CLI-level regression tests proving that typed markdown links (`verified_by`, `specified_by`, `validates`) imported through `kibi sync` are visible to `kibi check --rules symbol-coverage` with the correct scenario-aware semantics.
  - `kibi-cli`: added cross-boundary typed-link symbol-coverage regression tests for complete scenario→test chains and scenario-blocked direct req→test paths.

- Updated dependencies [c810f5f]
  - kibi-core@0.6.2

## 0.12.6

### Patch Changes

- 5fdcd46: MCP now re-validates the attached branch KB whenever the same-branch snapshot is externally rebuilt, so running `kibi sync --rebuild` no longer leaves a long-running server stuck on stale data. If refresh cannot be reconciled, requests fail fast with explicit `KbRefreshError` behavior instead of silently continuing from a stale attachment.
  - Added formal docs for same-branch KB freshness detection in MCP, including stat-based stamps and fail-closed retry semantics.
  - Clarified CLI behavior so `--rebuild` is documented as triggering MCP auto-refresh on unchanged branch attachments where applicable.
  - Added KB entities/ADR/requirements evidence and symbol traceability updates for the MCP session refresh path.

- 37ce479: Existing KBs now get an explicit semantic-advisor backfill marker when they migrate to the latest schema. This helps maintainers and agents distinguish deterministic schema upgrades from the separate, reviewable semantic modeling work that may still be needed.
  - Bump the KB schema version and add `semanticAdvisorBackfill: "pending"` during migration.
  - Record the marker in migration audit metadata without creating semantic facts automatically.
  - Update the config schema so migrated configs validate with the new marker.

## 0.12.5

### Patch Changes

- 909be41: Agents now get clearer guidance when modeling Kibi facts and predicates. Instead of opaque validation errors that encourage falling back to prose, common mistakes now point to exact snake_case fields and typed value payloads.

  The documentation also gives agents a compact path for choosing between requirements, strict facts, predicate facts, observations, and metadata. This makes semantic KB modeling easier to apply consistently across product projects.
  - Improve `kb_upsert` diagnostics for camelCase fact fields and incomplete strict/predicate facts.
  - Add modeling-helper warnings for low-confidence requirement downgrades and ontology-gap predicate suggestions.
  - Add modeling cheatsheet, MCP error reference, and product KB improvement prompt.

- c724c8b: Kibi now treats symbol granularity as a behavioral traceability decision instead of assuming every exported declaration is an equally precise target. Agents can model behavior hidden inside factory or composition expressions with manual behavioral anchors, while interfaces, type aliases, and enums no longer block valid coarse behavioral links by themselves. This makes traceability stricter where real behavior symbols exist and more flexible when extractors only see type-shape declarations.

  Technical summary:
  - Added `symbol_role` metadata for symbol entities.
  - Added shared role-aware symbol granularity helpers.
  - Updated MCP upsert and CLI staged checks to reject coarse links only when narrower behavioral symbols are available.
  - Documented manual behavioral anchors for extractor-miss cases.

- Updated dependencies [7f4d51e]
  - kibi-core@0.6.1

## 0.12.4

### Patch Changes

- 4d13def: Agents can now link requirements directly to class methods when that is the narrowest meaningful code symbol. Method-level symbol upserts use `ClassName.methodName` identities, with bare method names accepted only when they are unique in the file. This reduces unnecessary `extractor-miss` workarounds and keeps traceability closer to the behavior being changed.
  - Add qualified `method` symbols to parser-backed symbol analysis and staged symbol extraction for exported classes.
  - Include exported class methods in MCP symbol granularity validation so method-level `kb_upsert` calls are accepted without allowing duplicate bare-name collisions.
  - Update symbol granularity documentation to name class methods as narrow traceability targets.

## 0.12.3

### Patch Changes

- Timed-out MCP tool calls now recover cleanly instead of leaving stale Prolog workers behind. Follow-up Kibi tool calls should be able to continue with a fresh worker after a timeout, reducing the need for users to manually find and terminate wedged `swipl` processes.

  Technical summary:
  - Add MCP tool execution timeout handling with owned Prolog worker reset.
  - Classify timeout and Prolog worker reset diagnostics in usage metrics.
  - Harden interactive Prolog timeout termination and repeated termination cleanup.

## 0.12.2

### Patch Changes

- 8b73781: Bootstrap guidance is now easier for agents to apply correctly in OpenCode. The `/init-kibi` workflow and bundled Kibi usage skill explain that OpenCode can expose canonical `kb_*` MCP tools with a `kibi_` server prefix, and autopilot bootstrap output now includes an explicit `applyPlan` so agents can preview exact writes before asking for approval.
  - `kibi-mcp`: expose aggregate `structuredContent.applyPlan`/top-level `applyPlan` from `kb_autopilot_generate`, preserve `/init-kibi` as a post-hoc bootstrap prompt, mention it in visible output, and advertise typed fact fields in the `kb_upsert` input schema.
  - `kibi-opencode`: document the OpenCode `kibi_kb_*` tool-name convention in `/init-kibi` alias guidance and README.
  - `kibi-cli`: update the bundled `kibi-usage` skill with host-prefix guidance for OpenCode users.

- 35f3944: Kibi now records MCP tool failures with structured error categories and stages, so operators can tell persistence conflicts, Prolog runtime failures, lifecycle failures, and validation errors apart without manually inspecting raw logs. Usage metrics now surface those categories across all tools instead of only grouping `kb_upsert` failures, making incidents like stale snapshots or Prolog startup errors easier to diagnose.
  - `kibi-mcp`: add diagnostic error classification fields (`error_name`, `error_category`, `error_stage`, `error_summary`) to handler error rows in `.kb/usage.log`.
  - `kibi-cli`: extend `usage-metrics` reports with cross-tool error category, stage, and tool breakdowns while preserving existing upsert error summaries.

## 0.12.1

### Patch Changes

- Kibi now blocks coarse symbol traceability when narrower source symbols are available. Agents that try to attach ownership, coverage, or executable identity to a module/file-level symbol must either link the specific function/class/type symbol instead or provide an explicit coarse-link reason, making lazy file-level ontology entries much harder to create accidentally. Existing repositories should run `kibi migrate --dry-run` and then `kibi migrate --yes`; the migration marks old coarse links as `legacy-link` so users can upgrade without breaking immediately on historical ontology data.
  - Add staged `symbol_granularity_violation` enforcement for coarse symbol manifest relationships when changed source files expose granular symbols.
  - Add MCP `kb_upsert` validation that rejects unjustified coarse symbol traceability before writing to the KB.
  - Bump the KB schema version and teach `kibi migrate` to mark existing coarse symbol links with `granularity_reason: legacy-link`.
  - Add `granularity_reason` support for accepted coarse-link exceptions: `config-artifact`, `module-level-behavior`, `extractor-miss`, and `legacy-link`.

## 0.12.0

### Minor Changes

- Kibi can now start representing project-local ontology claims as structured predicate facts instead of prose-only notes. This is the first compatibility slice toward richer domain modeling: teams can define predicate schemas and store ground predicate claims while existing strict property facts continue to work unchanged.

  Add predicate ontology fact fields to the CLI entity schema, public schema export, TypeScript fact types, and Prolog schema validation. The new supported fact lanes are `predicate_schema` and `predicate`, with fields for predicate names, namespaces, arity, arguments, aliases, examples, and predicate polarity.

### Patch Changes

- Updated dependencies
  - kibi-core@0.6.0

## 0.11.3

### Patch Changes

- Kibi CLI users no longer get configuration or init output for the removed briefs feature. Existing project setup stays focused on the core knowledge base files and hooks, with no new `.kb/briefs/` ignore entry created by `kibi init`. Stale brief-specific config should now be treated as removed product surface rather than as a supported no-op.

  Technical summary:
  - Remove CLI brief config support and the public `brief-config` export from built artifacts.
  - Regenerate CLI dist after removing brief schema/init behavior.

## 0.11.2

### Patch Changes

- Kibi now recovers more cleanly when an interactive Prolog query times out. Instead of leaving the stale Prolog child running after a timeout, Kibi terminates it so the next MCP operation can restart from a clean process and surface a clearer timeout failure path.
  - Terminate the interactive `PrologProcess` child when a query timeout fires.
  - Add regression coverage proving timed-out interactive queries do not leave a stuck child running.

- Kibi's bundled usage skill now gives agents clearer guidance for durable traceability and contradiction-safe facts. Agents are steered away from legacy `// implements REQ-xxx` comments and toward symbol entities linked with `implements`, and the skill now includes concrete role and permission examples that make incoherent requirements easier to model and catch.
  - Update the `kibi-usage` skill with symbol-first traceability guidance.
  - Add granular strict fact examples for role-set and billing-permission contradictions.
  - Extend skill content tests to lock in the new guidance and examples.

## 0.11.1

### Patch Changes

- 4aa9830: Kibi now has a reusable markdown skill subsystem across CLI, MCP, and OpenCode. The CLI exposes bundled skills with manifest validation and safe resource loading. The MCP server provides progressive-disclosure tools (`kb_skills_list`, `kb_skills_load`, `kb_skills_read`) for agents to discover and read skills without starting Prolog or touching the KB. OpenCode routes its guidance through the `kibi-usage` skill, giving agents a single source of truth for Kibi usage patterns. An official `kibi-usage` skill bundle ships with all three packages, covering fact lanes, relationship directions, and canonical workflows.
  - feat(cli): add markdown skill loader with manifest types, validation errors, secure path/resource validation, and size limits
  - feat(cli): expose `kibi-cli/skills` public export with `skills list`, `skills load`, `skills read`, `skills validate`
  - feat(mcp): add `kb_skills_list`, `kb_skills_load`, `kb_skills_read` tool definitions, handlers, runtime wiring, and docs rendering
  - feat(mcp): resolve bundled skills from packaged source assets when running from compiled CLI output
  - feat(opencode): route agent guidance through `kibi-usage` skill, add `kb_skills_load` to tool listings
  - docs: add official `kibi-usage` skill with fact lanes, relationship directions, and workflow guidance
  - test: add mock-free MCP handler tests against real bundled `kibi-usage` skill, including invalid skill and resource errors
  - test: add CLI skill unit coverage for valid bundles, validation errors, traversal/symlink escapes, oversize limits

## 0.11.0

### Minor Changes

- f8a3a88: This update introduces a split symbol coordinate workflow that separates logical symbol definitions from their physical source locations. Symbol coordinates are now managed in `documentation/symbol-coordinates.yaml`, which improves git diff readability and reduces merge conflicts when only line numbers change. The `kibi sync` command now supports a `--refresh-symbol-coordinates` flag to explicitly update these locations.
  - **kibi-cli**: Added `--refresh-symbol-coordinates` flag to `kibi sync` and updated pre-commit hooks to enforce coordinate staging.
  - **kibi-mcp**: Updated symbol resolution logic to read from the new split coordinate manifest.
  - **kibi-opencode**: Updated background sync behavior and documentation to support the split manifest workflow.
  - **kibi-vscode**: Updated the symbol resolver to consume the split `symbol-coordinates.yaml` file for navigation and hover features.

- d783b67: Kibi now includes a `usage-metrics` command so operators can inspect how the knowledge base is actually being used and where quality signals are degrading. This makes it easier to spot missing telemetry, frequent zero-result lookups, and recurring validation trouble before those issues turn into blind spots for people or agents. The command reads `.kb/usage.log` and reports the main adoption and remediation indicators in either human-readable table output or JSON.
  - **kibi-cli**: Added `kibi usage-metrics` with `--format json|table` and `--limit <n>` support for usage-log quality reporting.

## 0.10.1

### Patch Changes

- 0d998ad: **Behavior-changing source edits now require Kibi impact evidence before commit.**

  The `kibi check --staged` command now enforces a hard gate: behavior-changing source edits must be accompanied by staged Kibi impact evidence (KB entity documentation or refreshed `documentation/symbols.yaml`). This prevents commits that change behavior without updating the knowledge base.

  **New diagnostics:**
  - `kibi_impact_evidence_missing` — emitted when behavior source edits lack staged KB evidence
  - `symbols_manifest_stale` — emitted when source edits alter symbol coordinates but the staged manifest is missing or stale

  **What this means for users:**
  - If you change behavior-bearing source code, stage relevant KB entity markdown or refresh `documentation/symbols.yaml`
  - Test-only edits (`tests/`, `*.test.*`) and docs-only edits (`.md`) are exempt
  - The no-impact override is available only for classifier false positives, not genuine behavior changes

  **OpenCode guidance updated** to remind agents that Kibi impact evidence is required before completion/commit.

  **Technical changes:**
  - Added `packages/cli/src/traceability/evidence-model.ts` — typed Kibi impact evidence interfaces
  - Added `packages/cli/src/traceability/staged-diagnostics.ts` — `collectStagedKibiDiagnostics()` with stable diagnostic IDs
  - Added `packages/cli/src/traceability/staged-impact-contract.ts` — behavior classification and evidence parsing
  - Added `packages/cli/src/traceability/staged-symbols-manifest.ts` — stale manifest detection
  - Extended `packages/cli/src/commands/check.ts` staged path to evaluate impact evidence
  - Updated pre-commit hook comments and contributor docs

## 0.10.0

### Minor Changes

- 5f715a5: Kibi now automatically respects your repository's `.gitignore` rules during knowledge base discovery. Files ignored by Git — as well as tool directories like `.sisyphus` and `.opencode` — are no longer treated as domain knowledge sources. This prevents draft and build artifacts from polluting your knowledge base.
  - Added documentation describing the repository ignore policy and hard-denied directories.
  - Clarified that Kibi honors repository `.gitignore`, nested `.gitignore`, and `.git/info/exclude` during `kb_autopilot_generate`, briefing generation, and discovery.
  - Documented that global Git excludes are not honored in v1, and that automatic cleanup of previously-discovered KB entities is out of scope for this release.
  - Integrated a note about ignore-aware file-event skipping in the OpenCode plugin README.

## 0.9.0

### Minor Changes

- Kibi now records a schema version in new `.kb/config.json` files and can report migration status without rewriting existing configs during normal loads. Older repositories that never stored `schemaVersion` still load cleanly, but tooling can now detect that they need migration. The CLI also exposes shared schema-version helpers so other packages can use the same version and warning logic.
  - add shared KB schema-version constants and migration status utilities for CLI consumers
  - write `schemaVersion` into init-generated configs while preserving readable legacy versionless configs on load

- The CLI can now turn extracted semantic claims into deterministic strict-model write-sets for contradiction-safe requirement authoring. Re-running the same claim produces the same requirement and fact IDs, while low-confidence claims are downgraded to review-only observations so they stay out of contradiction blocking.
  - add strict modeling utilities for stable ID generation, subject/property normalization, and strict vs observation write-set assembly
  - add CLI tests covering deterministic IDs, exact strict-lane entity/relationship counts, relationship dedupe, and low-confidence downgrade behavior

### Patch Changes

- Kibi now supports fully automated requirement modeling and schema migrations, allowing repositories to stay up-to-date with the latest contradiction-safe modeling standards without manual intervention. The new system enforces strict readiness levels for requirement/fact pairings and automatically downgrades low-confidence claims to non-blocking observations to ensure high precision in conflict detection.
  - add `kibi migrate` command for automated KB schema upgrades
  - implement strict readiness checks and confidence-based modeling lanes
  - update MCP guidance and CLI documentation for automated contradiction workflows
  - extend inference rules to support v1 contradiction semantics (exact-value, range, polarity)

- Updated dependencies
  - kibi-core@0.5.3

## 0.8.0

### Minor Changes

- 4746f3f: Briefs no longer surface internal task-tracking artifacts (such as `.sisyphus/boulder.json`) as if they were meaningful project knowledge. Notifications are now specific-or-silent: a toast only appears when the brief can say what changed and why it matters. Previously, any `.sisyphus/` file edit could trigger a brief with generic content and produce a vague "a brief is available" notification regardless of whether it contained real domain context.
  - `kibi-cli`: adds `isOperationalArtifactPath(pathLike)` helper, exported as `kibi-cli/operational-artifacts`, matching `.sisyphus/**` paths as operational task-tracking artifacts
  - `kibi-mcp`: filters operational artifact sources, entities, and citations before brief content is assembled so `.sisyphus/**` changes never appear in brief entities, citations, prompt blocks, or TLDRs
  - `kibi-opencode`: suppresses brief eligibility for operational-only source changes; adds specificity gate to toast delivery so generic/operational envelopes do not trigger notifications
  - `kibi-vscode`: applies same specific-or-silent semantics to VS Code brief watcher so generic/operational envelopes do not call `showInformationMessage`

### Patch Changes

- 7880675: Kibi now makes symbol manifest tracking harder to forget. New projects initialized with `kibi init` get a default `documentation/symbols.yaml`, and the managed pre-commit hook blocks commits when that manifest has unstaged changes so refreshed coordinates are committed with the related work.
  - Create the default symbol manifest during `kibi init` when it is missing.
  - Add a pre-commit guard that requires dirty `documentation/symbols.yaml` changes to be staged before `kibi check --staged` runs.

- 2a00e15: Kibi discovery is now less noisy for broad agent queries. When agents send multi-intent natural-language searches, targeted domain-specific entities now rank above unrelated generic results. No-signal queries (containing only common stop words) return an empty result instead of arbitrary token-coverage matches. OpenCode agents are now guided to decompose broad queries into focused probes and follow up with exact `kb_query` lookups.
  - `kibi-cli`: Add stop-word filtering, hyphen normalization, plural normalization, and minimum-score threshold to `search-ranking.ts`; add synthetic regression corpus tests.
  - `kibi-mcp`: Add wrapper-level regression tests asserting improved ranking is preserved end-to-end.
  - `kibi-opencode`: Update injected agent guidance to instruct query decomposition with concrete examples.

- 8d8ebf6: Sync operations are now more resilient when multiple file edits trigger overlapping syncs. Previously, concurrent `kibi sync` runs for the same branch could collide on a shared staging directory and fail with a stale snapshot permission error. Each sync now uses an isolated staging directory, eliminating this race while preserving protection against genuine external KB mutations.
  - Replace fixed `.kb/branches/<branch>.staging` with unique per-run staging directories using process ID and timestamp.
  - Add automatic cleanup of abandoned staging directories left by crashed or terminated sync processes.
  - Preserve atomic publish semantics and true stale-snapshot detection for external KB modifications.
  - Fix invalid `specifies` relationship type in TEST-015 documentation that caused sync relationship warnings.

## 0.7.0

### Minor Changes

- b9ef9a2: Add shared brief configuration defaults for automatic TUI delivery across Kibi clients. The CLI now reads and exposes brief config from `.kb/config.json` with sensible boolean defaults (all enabled), the OpenCode plugin delivers idle brief summaries via toast notification with automatic prompt append and auto-submit, and the VS Code extension gates notifications by the shared brief policy. This provides a unified, zero-config experience for teams using multiple Kibi clients.
- 736f675: Add the interactive cold-start bootstrap flow and its regression coverage so the public MCP surface, OpenCode prompt wiring, and extractor exports stay in sync.

### Patch Changes

- 7ed9f0c: Ensure `kibi init` writes `.kb/briefs/` to `.gitignore` so generated brief artifacts are ignored by default.
- a1a198b: Add configurable idle-brief delay and retention policies in shared `.kb/config.json` (`briefs.tui.idleDelayMs` and `briefs.retention.*`). OpenCode now applies retention garbage collection after brief writes and prunes stale `.tui-seen` hashes for briefs that were deleted by retention.
- Updated dependencies [699a482]
  - kibi-core@0.5.2

## 0.6.2

### Patch Changes

- 2066a48: Add init-kibi autopilot generation workflow
  - New MCP tool `kb_autopilot_generate` for read-only candidate generation
  - Activation-state classification and source discovery helpers
  - Deterministic candidate generation for Kibi docs and symbol manifests
  - Conservative generic markdown heuristics for ADR/REQ/FACT candidates
  - Dedupe logic and payoff summary reporting
  - Aligned OpenCode prompt guidance with activation workflow

## 0.6.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 4a74281: Enable `noUncheckedIndexedAccess` incrementally across the source packages and add explicit guards where CLI parsing and traceability helpers read indexed values.
- 0ec1cb1: fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup
  - `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
    `config.paths.symbols` manifest before processing staged-manifest overrides.
    This prevents code-only staged changes (where `symbols.yaml` is not staged) from
    falling back to hash-generated IDs and incorrectly failing traceability even when
    the symbol is already linked in the KB.
  - Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
    `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.

- 0ec1cb1: fix(opencode): respect absolute configured KB doc roots in bootstrap detection
  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

- 0ec1cb1: fix(cli): restore prolog codec exports
  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- 0ec1cb1: fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun
  - `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
  - Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
  - The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
  - This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.

- 3a11e57: Fix `kibi status` JSON serialization before first sync and add `kibi-mcp --help` output
- 0ec1cb1: Accept `sourceFile` as an optional entity property during `kb_upsert`.
  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- de5dbaf: Enable `exactOptionalPropertyTypes` across source packages and tighten optional property handling in exported type surfaces.
- Updated dependencies [0ec1cb1]
- Updated dependencies [3a11e57]
- Updated dependencies [0ec1cb1]
  - kibi-core@0.5.1

## 0.6.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

### Patch Changes

- Updated dependencies
  - kibi-core@0.5.0

## 0.5.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- efc7fd7: fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup
  - `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
    `config.paths.symbols` manifest before processing staged-manifest overrides.
    This prevents code-only staged changes (where `symbols.yaml` is not staged) from
    falling back to hash-generated IDs and incorrectly failing traceability even when
    the symbol is already linked in the KB.
  - Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
    `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.

- d344f57: fix(opencode): respect absolute configured KB doc roots in bootstrap detection
  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

  fix(cli): restore prolog codec exports
  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- 2994632: fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun
  - `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
  - Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
  - The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
  - This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.

- 7111197: Accept `sourceFile` as an optional entity property during `kb_upsert`.
  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- Updated dependencies [6cdf9f5]
- Updated dependencies [7111197]
  - kibi-core@0.4.1

## 0.5.0

### Minor Changes

- 0c2c1e7: feat(traceability): document comment-free test workflow with validation parity
  - Add relationship-first traceability guidance: prefer split semantics with `implements` for production ownership, `covered_by` for production coverage, and `executable_for` plus `verified_by`/`validates` for test identity and verification instead of relying only on inline `// implements REQ-xxx` comments
  - Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
  - Synchronize guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
  - Staged enforcement now supports explicit KB relationships in addition to inline comments
  - Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check

### Patch Changes

- Updated dependencies [0c2c1e7]
  - kibi-core@0.4.0

## 0.4.3

### Patch Changes

- 3388cf3: Add CI-only diagnostic logging for symbol coordinate refresh to help isolate the refreshCoordinatesForSymbolId coverage failure on GitHub Actions.
- 49fcad9: Harden OpenCode smart enforcement with posture-aware guidance, deterministic risk routing, structured observability, and an explicit advisory-vs-hook boundary.
  - `kibi-opencode`: adds repo-posture detection, risky-edit classification, smart-enforcement cache/config, posture-aware prompt injection, effective-mode gating, single-block prompt budget, prompt-visible completion reminders, runtime maintenance overlay, selective event routing, and structured smart-enforcement logs.
  - `kibi-cli`: documents and tests hooks as the hard enforcement boundary while preserving branch/post-merge refresh behavior.
  - `kibi-mcp`: enriches diagnostic usage fields so rollout telemetry remains queryable without changing the public MCP surface.

## 0.4.2

### Patch Changes

- 7309d18: Export `__test__` helpers from `traceability/validate.ts` to enable unit testing of internal Prolog parsing utilities.

## 0.4.1

### Patch Changes

- c8761a9: Add fallback support for unique non-exported top-level functions and class methods during symbol coordinate refresh. Resolves symbols that were previously reported as failed.
- 46baebc: Export resolveKbPlPath from kibi-cli public prolog surface

  Add `resolveKbPlPath` to the public `kibi-cli/prolog` export so that `kibi-mcp`
  can import it without breaking against older `kibi-cli` versions that do not
  expose this symbol.

## 0.4.0

### Minor Changes

- 7bd2adf: Add typed fact schema, semantic contradiction model, and discovery bundle tools.
  - **Typed facts**: New `fact_kind` field (subject, property_value, observation, meta) with schema validation, preserved through CLI/MCP sync and query round-trips.
  - **Discovery bundle**: `kb_search`, `kb_find_gaps`, `kb_coverage`, `kb_graph` tools across MCP and CLI. Richer `kb_check` summaries and improved diagnostic usage logging.
  - **Agent guidance**: Updated to prefer discovery-first workflows (`kb_search` → `kb_query`), MCP-only policy aligned with ADR-016 thin-bridge architecture.
  - **Strict-fact validation**: Append-only requirement supersession and migration guidance for strict fact adoption.

### Patch Changes

- 7bd2adf: Bug fixes and Node.js v24 compatibility.
  - **Node 24**: Replace deprecated `import ... assert` with `import ... with` per TC39 Import Attributes proposal.
  - **Core**: Use `member/2` instead of `memberchk/2` in `relationship_allowed`; make `status_meta_dict` resilient to non-standard KB paths.
  - **CLI**: Fix staged traceability check to resolve symbol IDs from `symbols.yaml` using both `sourceFile` and legacy `source` fields.
  - **MCP**: Replace `escapeQuotes` with `toPrologString` for safe Prolog string encoding.
  - **Persistence**: Remove duplicate `ATOM_FIELDS`, add `value_int` integer guard, use `toPrologString` for safe escaping.
  - **Check**: Replace fragile regex violation parsers with `parseViolationRows` from codec.
  - **Tests**: Isolate workspace test from rogue `/tmp/.git`, add 30s timeout to `beforeAll` hooks to prevent flaky timeouts.

- 7bd2adf: Internal code quality improvements and refactoring.
  - Deduplicate `splitTopLevel` into single canonical function in `codec.ts`.
  - Deduplicate `Violation`, `ChecksConfig`, and rule definitions between CLI and MCP.
  - Extract `safeCleanupProlog` helper to eliminate duplicated teardown patterns.
  - Replace `process.exit()` with return values in CLI command handlers.
  - Remove dead code (`target-resolver.ts`), annotate empty catch blocks, remove unreachable code paths.
  - Add `toPrologString` helper, `parseViolationRows`, export `splitTopLevelGeneral` from codec.
  - Clean narration comments across all packages.

- Updated dependencies [7bd2adf]
- Updated dependencies [7bd2adf]
  - kibi-core@0.3.0

## 0.2.7

### Patch Changes

- bc020dd: Generate unit-test LCOV coverage in CI, upload it to Codecov using the repository's CODECOV_TOKEN secret, and add a README coverage badge alongside the main CI status badge.
- e61aa15: Load SWI-Prolog's `rdf_db` library in interactive CLI sessions so `rdf_transaction/1` mutation queries do not fall into interactive correction prompts and hang MCP requests that rely on the long-lived Prolog process.
- 6e9e15c: Import plain string Markdown frontmatter `links` as generic `relates_to`
  relationships during `kibi sync`, and fix `kibi query --relationships` so it
  returns outgoing relationships reliably. Also fix `kibi-opencode` tarball ESM
  imports and self-contained plugin typings so packed installs can build and load
  the plugin and helper subpath exports in Node.

## 0.2.6

### Patch Changes

- 5188a8f: Fix `kb_upsert` status validation so documented entity-specific lifecycle values like `open`, `passing`, and `accepted` are accepted again. The MCP tool schema now avoids advertising a stale fixed status enum, and the shared entity schema accepts both documented statuses and legacy compatibility values.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.
- Updated dependencies [4e05344]
- Updated dependencies
  - kibi-core@0.1.10

## 0.2.5

### Patch Changes

- 0b11a77: Add missing `./prolog/codec` export to package.json

  The MCP package imports `escapeAtom` and `toPrologAtom` from `kibi-cli/prolog/codec`,
  but this subpath was not exported in the package.json. This caused the MCP server
  to crash on startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` when the package was
  installed from npm.

- Updated dependencies [29de3fa]
  - kibi-core@0.1.9

## 0.2.4

### Patch Changes

- ec7f86e: Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

## 0.2.4

### Patch Changes

- Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

- Add explicit `id` fields to sync test fixtures for predictable relationship testing.

## 0.2.3

## 0.2.3

### Patch Changes

- Fix stale read behavior in interactive MCP sessions by invalidating cached Prolog query results after successful write operations.

  Add a persistent-session regression test that verifies create/read/update/read and delete/read consistency in one MCP process.

## 0.2.2

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions
  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior

- Updated dependencies [82b9742]
  - kibi-core@0.1.7
