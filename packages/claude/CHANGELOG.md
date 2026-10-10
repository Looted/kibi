# kibi-claude

## 0.7.8

### Patch Changes

- 95d4a9e: A migration plan that `kb_apply_plan` refuses no longer looks like a success. Re-applying a proof-integration plan whose `.kb/proof/integrations.json` already exists (or one whose runner config changed since planning) used to return `status: "success"` with `outcome: "reconciliation_required"`, so an agent reading only the status thought it had worked. It now returns an error result (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `MIGRATION_PLAN_REFUSED`, `data.outcome: "refused"` and the refusal reason in the message; nothing was changed and nothing needs reconciling.

  Technical summary: `kibi.migration-apply-result.v1` gains `outcome: "refused"` (with `closeout.taskOutcome: "blocked"`) for an application that applied no action and whose every failure was a `MigrationActionRefusedError`: the proof-integration executor's refusals, predicate-schema-alignment drift and malformed invocations, and an action code with no automatic executor. `reconciliation_required` keeps meaning an action failed without being refused. `toKibiResult` turns a refused migration result into an error envelope with effects `not_applicable`; the CLI JSON route now exits 1 for any error envelope it returns (also a rejected bootstrap plan), and the MCP tool wrapper sets `isError: true` for one. `docs/mcp-reference.md` documents each migration outcome and how `kb_delete` reports an authored-entity refusal (status success, `deleted: 0`, the reason in `errors`); `docs/error-reference.md` adds `MIGRATION_PLAN_REFUSED`; kibi-usage describes both.

- 2e54379: `kb_model` (`mode: "predicates"`) now recognises everyday permission statements. "Suspended users must not publish articles." — the kibi-usage skill's own deny example — returns an applicable `permission_rule` candidate instead of an ontology-gap observation, and so do claims such as "Only editors may approve drafts.". Subject and actor keys derived from plurals are spelled correctly: "coaches" becomes `coach` (not `coache`), "policies" becomes `policy`, and singular words such as "access" or "analysis" keep their final "s".

  Technical summary: the `permission_rule` applicability gate keeps its action-cue list and also accepts a common action verb (publish, approve, assign, view, edit, create, submit, share, complete and similar) when it directly follows the permission modal (`may`, `can`, `cannot`, `must not`, `is allowed to`, …), so a quota such as "Uploads must not exceed 10 MB." still does not read as a permission. Both `singularize` helpers (predicate modeling and the semantic advisor) now share `singularizeToken`: `-ches`/`-shes`/`-sses`/`-xes` drop "es", `-ies` becomes "y", and tokens ending in "ss", "us" or "is" are kept; each helper keeps its existing exceptions. kibi-usage 2.13.0 shows the four-argument `permission_rule(suspended_user,publish,articles,deny)` fact that `kb_model` plans for the fact-lanes deny example.

- f4cc71c: Agents setting up proof now learn up front that a `command` integration is judged as one run: when `kibi proof inspect` proposes the package's whole `test` script, `integrationPlanReason` (also printed in the human output now) says that any failing test in the run fails every proof obligation that names the integration, and how to narrow it. The new `kibi proof inspect --command "<command>"` option proposes that command instead of the detected one, so `kibi proof inspect --update <id> --command "…" --json` can narrow an existing integration to the proof-bearing tests. The kibi-usage proof resource also states that every `required_proofs[].symbol_id` must name an existing symbol entity (create it first) and that `proof_bindings[].source_file` must match that symbol's `sourceFile`.

  Technical summary: `proposeProofIntegration` and `buildProofIntegrationPlan` accept an explicit argv (`--command`, parsed as space-separated words or a JSON array of strings) ahead of the `package.json` test script and the detected runner; a plan built from the package test script appends the whole-run note to its reason. kibi-usage 2.13.0 `resources/proof.md`, `docs/cli-reference.md` and `docs/proving-requirements.md` document the option and the whole-run semantics (the latter no longer suggests an update plan can switch to a native producer).

## 0.7.7

### Patch Changes

- c841267: `kb_model` `mode: "predicates"` now treats an explicit `subjectHint` as the planned subject when the requirement is not written yet or constrains nothing: the candidate gets that `subject_key`, `subject_pairing` is computed against it, and the planned predicate fact carries it, so after the requirement is written with `constrains` to that subject fact `kb_check` no longer reports `strict-req-fact-pairing` (previously the plan fell back to the `requirement.subject` placeholder). A `kb_model` parameter that belongs to another mode is no longer silently ignored: the result's `warnings` name it and the parameter to use instead (for example `subjectKey` in mode `predicates` points to `subjectHint`). The kibi-usage skill (2.12.0) updates the "new strict requirement with a predicate grounding" recipe: pass `subjectHint` with the subject fact's key, and send `specified_by` (requirement → scenario) in the requirement's write, not the scenario's.

  Technical summary: `buildSuggestion` (`predicate-applyplan.ts`) computes `subject_key`/`subject_pairing` against `plannedSubjects` (the constrained subjects, else `[subjectHint]` when explicit, else none). `dispatchComposite` calls the new `foreignParameterWarnings`, which lists input keys another route of the composite declares but the chosen route does not, with per-operation equivalents (`subjectKey` ↔ `subjectHint`); they are appended to the routed payload's own `warnings` (strings, or `{ kind: "parameter_ignored", message, nextAction }` for `kb_model_requirement`) and to the text content. Skill mirrors regenerated.

- e0fdbbd: Agents can now configure proof without hand-writing `.kb/proof/integrations.json`. `kibi proof inspect --json` proposes a command integration for the detected test runner and returns a reviewed, hash-bound plan that `kb_apply_plan` (or `kibi apply-plan`) applies; `kibi prove` then runs it. Proof errors no longer point at a bootstrap step that never wrote the file.

  `kibi proof inspect` adds `proposedIntegration`, `contractDefaults`, `integrationPlan` (`kibi.migration-plan.v2` with one `proof_integration_configure` action) and `integrationPlanReason`, and a new `--update <id>` option plans adding or replacing one named integration. The migration applier gains a `proof_integration_configure` executor: it refuses a create once the file exists, refuses an update when the file's hash changed, refuses either when `package.json`, a lockfile or a runner config changed since planning, and validates the result against `kibi.proof-integration.v1` before an atomic write. The `No proof integration configuration` and `integration … is not configured` messages, the `kibi-usage` proof resource and the `kibi-bootstrap` skill (3.11.0, new step 11 proof-integration item) name this route.

## 0.7.6

### Patch Changes

- 5d0b35f: A `kb_upsert` that the commit refuses (for example `Contradiction detected … (stage=contradiction_check)`) now leaves the workspace exactly as it found it: the pending-source receipt of an untracked file written by an earlier `kb_upsert` is restored together with the file bytes and file times, so `kb_check` no longer reports `source-relationship-parity` hash drift and `kb_status` stays fresh after a refusal. `kb_upsert` with `dryRun: true` previews that commit-time contradiction check for a requirement against a staged, rolled-back copy of the store instead of reporting `valid: true` for a write the commit then refuses. `kb_model` mode `predicates` answers `record_ontology_gap` with the gap observation planned when the only matching schema needs a participant (`actor`, `role`, `owner`) the claim never names, instead of asking for a binding the claim cannot supply. `kb_find_gaps` reports `summary: { total, provenanceStubs }` so a caller can tell "no gaps" from "only provenance stubs", and the `semantic_source_field must be …` refusal now says which field Kibi derived the prose from and why. The kibi-usage skill (2.11.0) adds second-agent recipes for a new grounded requirement, rewording a grounded requirement, deleting authored entities, recovering from a commit-time refusal and the limits of `dryRun`. All of these came out of an autonomous onboarding evaluation on a test project.

  Technical summary: `writeSourceForUpsert` snapshots the pending receipt bytes and the file times before publishing and restores both in the existing-file rollback branch; the `source-relationship-parity` suggestion names the working repair (`kb_upsert` republishes the receipt, `kibi branch recover --apply` for a deleted file). `kb_preview_upsert_contradiction/3` (kibi-core) stages an upsert in a transaction it always rolls back and runs `check_req_contradiction/1`; `executeValidateUpsert` calls it through `buildUpsertContradictionPreviewGoal` for `req` payloads without `_skipContradictionCheck`. `unnamedParticipantArguments` decides when an incomplete candidate's unbound arguments are all participants the claim does not name (empty, subject key or clause, and no declared constant or example value in the text); `handleKbSuggestPredicates` then returns `record_ontology_gap`, `buildGapApplyPlan` and keeps the candidate and `bindingHints`. `find_gaps_json` adds `summary` (`matching_gap_stub/6`), mirrored in `FindGapsPayload`, the `kb_find_gaps` output contract and the MCP contract fixtures. `validateSemanticInventoryBoundary` explains the derived source field (`semantic_text` when set, else `text_ref`, else `title`).

- ee91b85: Projects with a UI can opt into the experimental `kibi-plugin-ui`, which keeps agents on the agreed design: `kb_check` then requires every React or Angular component to implement a design requirement and blocks a component that loses the class names or test ids marking its agreed pattern, such as a timeline rewritten as cards. `/kibi-bootstrap` offers the plugin when it finds component files, and a declined offer is remembered in `package.json` `kibi.declinedPlugins`. Requirements that only name a UI pattern are now proved by fresh isolated component tests, so pattern rules do not need browser tests. Projects without the plugin see no new blocking findings.
  - Add the `kibi.check-policy.v1` capability to `kibi-plugin-sdk`: a JSON policy with ownership and pattern-marker rules, validated by `validateCheckPolicyDocument`. `kb_check` reads activated policies as data from the package and never imports plugin code; an unreadable policy blocks. The builtin plugin ships an empty policy.
  - Add the canonical `policy-ownership` and `policy-markers` rules (inert without an activated policy) to the rule registry, the `kb_check` schema and the CLI.
  - Add built-in `ui_pattern`, `same_pattern`, `pattern_marker` and `ui_container` predicate schemas with suggestion keywords.
  - Proof ladder: a scenario whose requirements are grounded only in `ui_pattern`, `same_pattern` and `pattern_marker` accepts `unit` and `integration` tests with fresh receipts; each scenario obligation now reports `acceptedScopes`.
  - `kb_plan_bootstrap` returns `pluginOffers` and a `plugin_offer` recommended action; `kibi.declinedPlugins` is validated as a list of bare package names. The `kibi-bootstrap` and `kibi-usage` skills cover the offer and the UI pattern workflow.
  - New package `kibi-plugin-ui` ships the UI design policy. It is optional and not part of the default install.

  Migration: none required. To enable the guard, install `kibi-plugin-ui` as a dev dependency and activate `kibi.check-policy.v1` in `augment` mode under `package.json` `kibi.plugins`; expect `policy-ownership` findings for existing components until they are linked to design requirements or tagged `review:ui-unconstrained`.

## 0.7.5

### Patch Changes

- 6315e95: Bootstrap no longer fills the knowledge base with content-free provider facts. A discovered provider entry whose source states no claim (a source module, a package manifest, a layout root, a test file with no recognized framework) is now a provenance stub: written as `fact_kind: meta` tagged `bootstrap:provenance-stub`, planned after every candidate with a claim, counted apart in the plan, ranked after everything else by `kb_search` (and dropped below its default threshold), never listed as a note in the search answer, and not counted as knowledge by `kb_find_gaps` or `kb_coverage`. On a test project, raising `maxCandidates` to 200 had added 150 such stubs, which then surfaced in search answers; the `over_limit` diagnostic now says how many suppressed candidates are stubs so an operator does not raise the limit for them.

  Technical summary: `providerCandidate` classifies a provider candidate by `data.claim`; `test_topology` sets a claim when it recognizes a framework (and stays an observation), while `source_symbols`, `repo_metadata` and `repo_layout` never do (stubs, `provenanceStubBody`). `selectBootstrapCandidates` puts stubs in a last lane, marks `over_limit` rows with `provenanceStub` and counts them in the diagnostic; `presentBootstrap` adds `candidatesWithClaims`, `provenanceStubs` and `suppressedProvenanceStubs` to `discoverySummary` and reports the stub share in `tldr`. The shared `provenance-stub.ts` helper drives the intent-v1 and legacy rankings (`demoted: provenance stub`, sorted last, intent score times 0.25) and the answer layer; `discovery.pl` skips stubs in `find_gaps_json` unless the tag is requested and reports them as `summary.provenanceStubs` in type coverage. The kibi-bootstrap skill (3.9.0) tells agents not to raise the cap for stubs.

- 6315e95: `kb_model` mode `predicates` no longer lets an actor, role or owner be bound to the requirement's subject key. Binding hints offered the subject key for any naming argument, so an agent bound `actor = <subject key>` on a `permission_rule` and got a complete predicate whose actor said nothing the fact's `subject_key` did not already say. Subject keys are now offered only for the `subject` argument and for `entity` arguments; an explicit participant binding equal to a constrained subject key stays unbound with a reason, and when the claim names no participant the hint says so and points to `record_ontology_gap`.

  Technical summary: `predicate-bindings.ts` adds `isParticipantArgumentType` (`actor`, `actor_scope`, `role`, `owner`) and `subjectKeyParticipantReason`, which `classifyBinding` applies to explicit and extracted values through the new `constrainedSubjects` binding context that `buildSuggestion` now passes; the hinted-first-argument shortcut no longer applies to a participant-typed first argument. `buildBindingHints` restricts subject-key examples to `subject` and `entity` arguments and replaces the "or the requirement's subject key" advice with no-participant guidance for participant arguments. `replacementPlan` (K20) now carries `expected.kbCheckAfterStep` listing both `logic-coverage` and `strict-req-fact-pairing` between the retraction and the link, `kbCheckAfterLastStep: []` and `rollbackWhen`, and its instructions and rollback reason state the rollback condition as a `kb_check` that is not clean after the last step. The kibi-usage skill (2.10.0) describes both.

## 0.7.4

### Patch Changes

- 89d8b8e: `kb_model` mode `predicates` no longer offers a predicate plan that `kb_check` would then reject. The requirement's subject now binds the argument a schema names `subject` wherever it sits, and for a schema without one (such as `permission_rule`) it is recorded as the planned predicate fact's `subject_key`; a predicate that is not about a subject the requirement constrains stays `provide_argument_bindings` with a hint instead of `replace_grounding` or `apply_requires_predicate`. A value taken from the claim for an actor, resource or other participant that is a long clause (more than three words) is no longer accepted as a binding.

  Technical summary: `buildSuggestion` binds `subjectHint` or the single constrained subject into `argument_names.indexOf("subject")` and adds `subject_key` and `subject_pairing` (`paired`, `unpaired`, `not_required`) to each candidate; an unpaired candidate gets `subject` or `subject_key` in `unbound_arguments`, a `bindingHints` entry (position -1 for `subject_key`) and a warning naming the schema. `buildPredicateApplyPlan` writes `subject_key` on the planned fact when it is known, so `replacementPlan` step 1 carries it. `classifyBinding` treats an extracted value of an `entity`, `actor`, `actor_scope`, `resource`, `owner`, `role` or `component` argument with more than three snake-case words as a placeholder (`clauseBindingReason`), and the hint says why. The constrained subjects are now read even when `subjectHint` is passed. The kibi-usage skill (2.9.0) describes `subject_key` and short participant bindings.

## 0.7.3

### Patch Changes

- c9dd5f9: Bootstrap plans now write one subject fact per subject key. When claims from different sources (a handoff document and a ticket, say) name the same subject, every requirement links to that one fact instead of each getting its own copy, so `kb_check` no longer reports `subject-key-identity` right after an applied bootstrap and nobody has to merge the facts by hand. The plan lists each shared key in a `subject-key-shared:` diagnostic naming its sources.

  Technical summary: after candidate selection `kb_plan_bootstrap` keeps the first selected subject fact for each `subject_key`, drops the later ones, retargets their requirements' `constrains` links (and the candidates' `relationships`) to the kept fact, and adds every source's `provenance:` tag and a `document.body` listing the sources to it. The transformation depends only on the candidate order, so `planHash` stays deterministic; action `dependsOn` follows the retargeted links. The kibi-bootstrap skill (3.8.0) and `docs/mcp-reference.md` describe the diagnostic.

- c9dd5f9: `kb_model` mode `predicates` now takes the predicate's subject from the requirement: when `requirementId` names a requirement that constrains a subject fact, the predicate uses that fact's `subject_key`, so the predicate and the subject fact name one subject and contradiction checks see them together. Demo guesses such as `editor.annotation` are no longer applied to a requirement; a requirement without a subject fact leaves `subject` for the agent to bind. `docs/mcp-reference.md` now says that `structuredContent.<field>` paths are shorthand for `structuredContent.data.<field>` inside the protocol envelope.

  Technical summary: `handleKbSuggestPredicates` reads the `subject_key` of every subject fact the requirement `constrains`. With exactly one, it binds the schema's `subject` argument with the new binding provenance `requirement` (applicable like `explicit`); with several, they come first in the subject's `bindingHints[].examples`. `subjectHint` and an explicit `argumentBindings.subject` still win. `inferSubject` takes the requirement context and keeps its keyword heuristics for free text without `requirementId`. The kibi-usage skill (2.8.0) names the `structuredContent.data.bindingHints` path and the requirement-bound subject.

## 0.7.2

### Patch Changes

- 5aab5a2: Bootstrap plans no longer turn a whole clause into a subject key. A key such as `support_inbox.update_in_real_time_when_a_new_ticket_is_assigned_to_the_agent_without_a_page_refresh` is now planned as `support_inbox.update_in_real_time`, and the plan diagnostics name the original key so the operator can pick a better name before approving. Two different subjects that would share a shortened key get distinct keys instead of colliding.

  An aspect longer than four words or 40 characters is shortened deterministically: the words before the first clause boundary (`when`, `while`, `for`, `and`, ...) without leading or trailing stop words, then, if still too long, its content words, then the first and last two content words. Each shortening adds a `subject-key-shortened:` diagnostic; a collision between different subjects adds a third segment from the later claim's wording (or a short digest) and a `subject-key-disambiguated:` diagnostic, while claims about the same subject keep sharing one key. One registry per plan covers repository Markdown and declared intent claims. The kibi-bootstrap skill (3.7.0) and `docs/mcp-reference.md` explain how components are supplied and how aspects are derived.

- 5aab5a2: `kb_model` mode `predicates` no longer accepts argument bindings that only repeat a field name, such as `before_event: "before_event"`, or a bare stop word such as `action: "be"`. Those values used to complete a predicate and produce a write plan for a meaningless fact; the argument now stays unbound. When bindings are missing, the response lists each unbound argument with its type and example values so agents can bind from the claim text instead of guessing.

  `classifyBinding` treats a value equal to its own or another argument name (after snake-case normalization) as a placeholder unless the claim itself names it, and treats trivial verbs, articles and filler words as placeholders; `true`, `false`, the schema's declared `argument_constants` and a subject given through `subjectHint` are still accepted. On `provide_argument_bindings`, `structuredContent.bindingHints` gives `argument`, `position`, `type`, optional `description`, `allowedValues` for a closed vocabulary, `examples` from the constants and the schema's examples, the refused `currentValue` with its `provenance`, and a `reason`; the text summary lists them too. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the rule.

- 5aab5a2: The ontology-gap observation that `kb_model` mode `predicates` returns can now be written with `kb_upsert` exactly as returned. Before, every such plan was rejected because it linked the observation to the `review:ontology-gap` tag as if the tag were an entity, and it carried a `claim_key` that made a review note look like a semantic claim. The `replace_grounding` plan is now also directly applicable: its requirement step restates the stored title, status and tags, and the response says why the steps must run in order.

  The gap observation keeps `claim_text`, `value_string` and `text_ref`, drops `claim_key` and the tag relationship, and adds a `document.body` saying that no predicate schema fits and quoting the claim, so schema 8's `entity-context-missing` passes. Semantic-advisor review observations (`review:ambiguity`, `review:keyword-false-positive`, `review:ontology-gap`, `review:nonlogical`) likewise keep their category in `tags` only and carry a body. `replacementPlan` adds a `rollback` step that restores the retracted link if the last step fails, and its instructions note that `kb_check` reports `logic-coverage` between the retraction and the new link. A new MCP stdio test applies both plans through the real server. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the shapes, and `docs/mcp-reference.md` and `docs/error-reference.md` explain that the `rdf/lock` left after a session belongs to the shared engine daemon, which exits after 10 idle minutes.

## 0.7.1

### Patch Changes

- be5d25e: Bootstrap plans no longer write subject keys that Kibi's own `subject-key-shape` rule flags. Declare the component a knowledge source or an intent claim is about (`component: "recorder"`) and the plan uses keys such as `recorder.beginning_to_record_while_idle`; a claim Kibi cannot place is reported in the plan diagnostics and left as an authoring follow-up instead. Intent claims can also carry the `rationale` the source or the human gave, which becomes the requirement's `rationale` and `## Context`.

  `bootstrapContext.knowledgeSources[].component`, `intentClaims[].component` and `intentClaims[].rationale` are new optional fields bound into the plan hash only when declared. Subject keys keep an already dotted subject, use a one-word subject as the component with the constrained property as the aspect, and otherwise prefix the declared component; repository Markdown takes its component from the file or directory name. The kibi-bootstrap skill (3.6.0) asks the human for the reason behind a requirement whose source states none, and sets scenario `expects` only when the scenario links `assumes` facts, so draft scenarios tagged `needs-human-review` no longer raise `scenario-feasibility-unknown`. The kibi-usage skill (2.6.0) and `docs/modeling-cheatsheet.md` match.

## 0.7.0

### Minor Changes

- 393f492: Large bootstrap plans no longer fall over when they take longer than the agent's MCP client is willing to wait. `kb_apply_plan` reports progress after every bootstrap action, so clients that reset their timeout on progress keep waiting, and `async: true` returns a `kibi.job.v1` receipt to poll with `kb_job_status` instead of holding the request open. If an apply is still cut off mid-action, `kb_apply_plan` with the journal's `recoveryJournalId` resumes it without hand-editing the journal and reclaims a source lock left behind by the dead process.

  `OperationContext` and `RuntimeOptions` gain an optional `onProgress` reporter (`OperationProgress`, `ProgressReporter` are exported from `kibi-runtime`). The bootstrap executor reports after each applied action; the MCP server forwards reports as `notifications/progress` when the request carries `_meta.progressToken`, and each report also pushes back the server's `KIBI_MCP_TOOL_TIMEOUT_MS`, which then bounds inactivity rather than the whole apply. `kb_apply_plan` accepts `async` (MCP only; it falls back to a synchronous apply when `kb_job_status` is not enabled) and its output contract admits the job receipt. Bootstrap recovery now accepts drift since the last checkpoint only when the journal is still `applying` with an active action that has no result: that action is re-applied, the result notes it, and the journal records it under `interruptedActions`; any other drift is still refused. `acquireWorkspaceMutationLock` takes a `reclaimDeadHolder` option; `kb_apply_plan` grants it only for a bootstrap recovery whose journal is `applying`, moves a dead holder's lock aside atomically, records it under `lockReclaims` in the journal, and keeps failing closed for live, unverifiable, corrupt or legacy owners. Bundled skills `kibi-bootstrap` 3.5.0 and `kibi-usage` 2.5.0 describe progress, async apply and journal recovery, and say never to edit `.kb/recovery`.

## 0.6.0

### Minor Changes

- b350869: Requirements, scenarios, tests, ADRs and observations now have to say why they exist. `kibi check` blocks a current entity whose body has no real context, `kb_compile_intent` requires a `context` for a new requirement, and bootstrap keeps the quoted source excerpt in the entity instead of only on the approval screen. Existing knowledge bases upgrade to schema 8 with `kibi migrate --yes`, which keeps every body byte-identical and only tags entities that lack context `review:context-missing`, recording their ids in `.kb/manifest.json`; the tag is honored only for those ids, so an agent cannot clear the check by tagging an entity itself. Run `kibi sync` afterwards.

  Entity bodies are split into sections by Markdown headings; `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` headings count as context. A requirement counts only context headings, while scenarios, tests, ADRs and observation or meta facts count all prose. Context needs at least 12 words and a token-set Jaccard similarity below 0.8 against the title (and, for a requirement, `semantic_text`); symbols, flags, events and other fact kinds are exempt. New canonical rule `entity-context-missing` and advisory `entity-context-acknowledged` are registered, and `kb_upsert` (including dryRun) warns about the same finding. `requirementSemanticText` now excludes context sections, and every requirement authoring path writes `semantic_text` explicitly; the schema 8 migration pins it for existing requirements with the previous derivation so claim spans and hashes do not move. `kb_compile_intent` gains `context`, `sourceExcerpt` and `sourceReference` and renders statement, `## Context` and `## Source`; on update it replaces the statement and keeps the existing context sections byte for byte unless new context or source is supplied. `kb_plan_bootstrap` requires `excerpt` for `intent` and `observation` claims and persists it with the source title and reference in the created body. Search snippets come from the first context prose. Bundled skills `kibi-usage` 2.4.0 and `kibi-bootstrap` 3.4.0 document the per-type body contract and say never to invent a reason.

## 0.5.1

### Patch Changes

- 7f08632: Bootstrap no longer drops conditional claims ("If microphone access fails, the editor must ...") or obligations that mention a referent ("... any draft state that refers to it") as `invalid_write`; they become ready requirement candidates. Linking a scenario to an existing requirement with `kb_upsert` no longer requires resending its whole semantic inventory, and a review observation can quote the claim it is about without a `claim_key`. The bundled skills now show how to answer `provide_argument_bindings` from `kb_model` predicates and how to write scenarios from acceptance criteria.

  Technical summary: requirement steps built by `kb_plan_bootstrap`, the `kb_model` requirement path and typed logic plans take each inventory role from the semantic advisor (`advisorPropositionRole`), so the write-time proposition-complete check accepts what Kibi itself generated. The advisor classifies a clause as `definition` only when "means / is defined as / refers to / is called" is the main predicate of a sentence that asserts no obligation; inventories stored with the earlier `definition` role for such clauses still validate. `kb_upsert` on an existing `req` whose payload carries no `semantic_*` or `logic_claims` field and keeps the stored `title` and `text_ref` merges the stored ledger (and the stored `text_ref` when the payload omits it) before validation and writing; a payload that supplies ledger fields or changes the prose is checked as sent. The entity schema, the `kb_upsert` input schema and the Prolog shape check now let an `observation` or `meta` fact carry `claim_text` without `claim_key`; every other fact still needs both. `kibi-usage` 2.3.2 adds a predicate-binding retry example and a review observation payload; `kibi-bootstrap` 3.3.1 makes step 11 write scenarios from acceptance criteria with `assumes` links.

## 0.5.0

### Minor Changes

- 44b2d0d: After bootstrap, agents now keep going instead of stopping at a knowledge base that holds only cited requirements. Previously the `kibi-bootstrap` skill ended with "hand off to the normal Kibi workflow" and no instructions, and its rule against direct `kb_upsert` left claims the plan could not write with no way to author them. Now a "deepen" step tells the agent what to author next, in the normal workflow and with the human informed.

  The bundled `kibi-bootstrap` skill is now 3.3.0. A new step 11 ("Deepen") runs after apply and close-out. It loads `kibi-usage` and hands every claim suppressed as `invalid_write` or listed in `sourceOnlySignals` to `kb_model` and `kb_upsert` with its statement and `sourceId:reference` citation. It proposes a scenario from acceptance criteria (`specified_by`) for each persisted requirement, runs `kb_model` with `mode: "predicates"` on each one, and records any undeclared conflict or open question as a `review:conflict` or `review:open-question` observation. The safety boundary now states that the direct-`kb_upsert` prohibition covers the bootstrap plan's own writes, not this post-bootstrap authoring. Step 5 sends unplanned claims to step 11, and the report step is renumbered 12.

### Patch Changes

- ec26130: Bootstrap now keeps what the onboarding interview leaves unsettled. Previously every declared claim was treated as intended behavior, and contradictions between sources or open questions had no place in the plan, so they stayed in the agent's own notes and were lost after apply. Now a claim can be marked as an observation or an open question, and conflicts between claims can be declared. Each is kept in the KB as a cited review fact instead of becoming a requirement.

  `kb_plan_bootstrap` accepts `bootstrapContext.intentClaims[].kind` (`intent` by default, `observation`, `open_question`) and `bootstrapContext.conflicts[]` (`claimReferences` of two to ten `{ sourceId, reference }` pairs plus a `note`). Observation and open-question claims become `fact_kind: observation` candidates with the claim's citation evidence and `text_ref: <sourceId>:<reference>`; open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict naming an undeclared claim is reported in `diagnostics`. Kinds and conflicts are part of `declaredContext` and the plan hash (the default `intent` kind is omitted, so existing plans keep their hash), and the facts go through the same plan-time write validation as every other candidate. The `kibi-bootstrap` skill (3.2.3) updates the harvest, declare and approval steps.

- 094fcae: Bootstrap now links your declared intent to the code even when you declare many claims. Previously declared intent claims used up the shared `maxCandidates` budget, so with 50 or more claims every symbol, test and repository document Kibi found was suppressed as `over_limit`, and the plan to approve listed hundreds of suppression rows. Now claims sit outside the budget, generic Markdown stays out of claim-driven plans unless you ask for it, and suppressions are summarized as one count per reason.

  `kb_plan_bootstrap` applies `maxCandidates` (default 50) only to discovered candidates, independent of how many declared `intentClaims` are planned, and reports one `N discovered candidate(s) exceeded maxCandidates` diagnostic instead of the old "discovered candidates get no slots" note. `includeGenericMarkdown` defaults to `false` when `bootstrapContext` declares `intentClaims` (a diagnostic states it) and to `true` otherwise; an explicit value always wins, and the input schema no longer advertises a fixed default. `tldr` and a new `Suppressed candidates by reason` diagnostic aggregate `suppressedCandidates` per reason; the full rows are unchanged. The `kibi-bootstrap` skill (3.2.2) updates step 5 accordingly.

## 0.4.2

### Patch Changes

- 564b171: Bootstrap plans no longer drop the intent claims you declared from tracker, wiki or spec sources when the repository has many candidates. Previously the default 50-candidate cap could silently discard every claim from one source, and two markdown lines that restated one rule could leave an approved plan half-applied. Now every declared claim is planned, each source reports how many of its claims were planned, and a plan that plans none of an authoritative source's claims asks for context instead of reporting ready.

  `kb_plan_bootstrap` applies `maxCandidates` only to discovered candidates. Candidates that would rewrite an already-planned entity with different content are suppressed as `duplicate_entity`, and the write-time `claim_key` grounding check now also runs at plan time against planned writes, suppressing mismatches as `invalid_write`. The plan adds one `Knowledge source …` diagnostic per declared source. The `kibi-bootstrap` skill (3.2.1) tells agents to read those diagnostics and no longer advises against `maxCandidates`.

## 0.4.1

### Patch Changes

- Agents now pick up the `kibi-bootstrap` skill for onboarding work beyond seeding a new knowledge base: reviewing a plan or preview, judging approval readiness, diagnosing a blocked or failed bootstrap, and applying an approved plan. The skill starts every task with `kb_status`, routes review and repair tasks to a read-only preview, and checks before applying that the plan matches the approved one field for field, including `suppressedCandidates`. In paired SkillOpt runs, 10 cells per variant, the new skill scored 95 against 70 for the previous one. It applied approved plans that the previous skill failed to apply, and it had no security failures where the previous skill had two.

  Skill `kibi-bootstrap` 3.2.0 rewrites the frontmatter `description` and the body. Every other frontmatter field and every resource stays the same. The candidate was drafted, evaluated and confirmed on a fresh cohort with the SkillOpt campaign workflow, using the Claude Code target host.

## 0.4.0

### Minor Changes

- f8fff87: The telemetry acceptance and remediation reports now show whether agents look requirements up before they change requirement-linked code. A new `lookup_before_first_edit` metric gives, per host session, the share of sessions that ran `kb_search` or `kb_query` (through MCP or the CLI) before their first edit of a file whose symbols implement a requirement. Sessions that edited first appear in the report with the file and its exact `.kb/usage.log` line. The data comes from opt-in hook rows that every Kibi host plugin now writes when `KIBI_DIAGNOSTIC_MODE` is set; nothing is recorded otherwise.
  - `kibi usage-metrics` / `kb_check` telemetry acceptance: new metric `lookup_before_first_edit` (threshold `>=` policy `lookupBeforeFirstEditMinimum`, default 1) with evidence `unguidedEditPaths` and `lookupOperations`. It is `not_applicable` when no host hook recorded a requirement-linked edit, so logs without hook rows are judged as before. A failed metric adds the advisory diagnostic `lookup_before_first_edit_bypassed` (rank 35).
  - `kibi usage-remediation`: one event item per session whose first linked edit had no earlier lookup, pointing at that hook row.
  - `parseTelemetryUsageLog` still returns only Kibi operation rows; hook rows stay attached to the returned array (read them with `partitionTelemetryUsage`). Remediation `logLine` values now count hook rows and blank lines, so they match the file.
  - `kibi-agent-core/hook-usage-log`: shared `appendHookUsage` / `appendHookUsageRows`, `kbUsageTrace` and `editTraces`. Hook rows (`interface: "hook"`) carry `host`, `session_id`, `hook_action` (`kb_usage` or `edited`), `kb_operation`, `path`, `path_kind` and `requirement_ids`. `hostKbOperation` recognizes MCP tool names and `kibi <route>` shell commands; `extractEditedPaths` reads `apply_patch` headers.
  - Claude Code: `edited` rows now carry the file's `requirement_ids`, and every row names its `host`. Cursor (`postToolUse`), Codex and ZCode (`PostToolUse`) and OpenCode (`tool.execute.after`) now write the same `kb_usage` and `edited` rows.

- 1012d1c: When an agent edits a file that implements a requirement, every Kibi host plugin (Claude Code, Cursor, Codex, ZCode and OpenCode) now says what that requirement must keep true and the decision behind it, not just its ID. The extra lines come from the requirement's linked facts and ADR, so agents see the constraint before they change the code. All hosts build the snippet with one shared builder in `kibi-agent-core`, so they show the same lines within each host's size limits, and none of them presents a superseded or retired requirement as current.
  - New `kibi-agent-core/snippets` export: `fileKnowledgeSnippet`, `requirementGroundingLines`, `editKnowledgeContext`, `editFocus` and `createEntitySummarizer`. Edit snippets add "`<REQ>` must keep true: …" (up to two facts linked via `constrains`, `requires_property`, `requires_predicate` or `requires_rule`) and "Decision: `<ADR>`" for the lead requirement. Read snippets keep the requirement and test lines only.
  - A superseded, deprecated or retired lead requirement gets no "must keep true" or "Decision" lines, so retired policy is not shown as current.
  - Claude Code: the `PreToolUse` edit snippet now comes from the shared builder (no change in content).
  - Cursor: `preToolUse` edit guidance and `beforeReadFile` / read guidance include the shared snippet for files whose symbols implement a requirement, followed by the existing "query before you change it" follow-up.
  - Codex: `PreToolUse` on `apply_patch` (and other edit tools) returns the snippet as `additionalContext`, for up to three changed files per call and once per file per session. Paths come from the patch's `*** Update/Add/Delete File:` headers.
  - ZCode: `PreToolUse` on edit tools returns the snippet as `additionalContext`, including "The edit is inside `<symbol>`" when the edited text is found, once per file per session.
  - OpenCode: the edit-guidance system prompt adds one "must keep true … Decision …" bullet (one fact) for the focus file, within the existing word budget.
  - `readEntitySummary` returns frontmatter `links` (plain entries read as `relates_to`; `type` and `target` in either order) merged with the entity's records in `.kb/relationships` shards, so grounding stored only in shards still reaches the snippet.
  - Session and discovery hints point at `kb_search` questions and its answer layer instead of asking for `rankingMode: "intent-v1"`, which is now the default.

### Patch Changes

- 89870c1: Bootstrap now checks its write actions before review and application, so ordinary require/forbid claims can be applied without malformed facts or semantic-inventory failures. Invalid and ungroundable claims remain cited authoring follow-ups; product intent receives priority over repository observations, and excluded or unreadable candidates are reported. Deterministic failures stop in a terminal journal with committed actions listed and guidance to re-plan; interrupted writes still recover.

  Encode polarity as an `eq` boolean `true` comparison with a require/forbid modifier in the shared strict builder, retaining existing stable IDs. Add writer-schema and semantic-inventory preflight, per-claim extraction diagnostics, task-list normalization, selection accounting, and terminal failure reporting through CLI/MCP status and result envelopes.

  Migration: KB schema 7 makes `strict-fact-shape` a blocking canonical check. Run `kibi migrate --yes`, then `kibi sync`. The migration rewrites legacy polarity-only property facts to the typed boolean encoding while preserving IDs, polarity, relationships, and document bodies. Other malformed strict facts require explicit correction; they are not treated as proof.

- 1012d1c: Kibi keeps answering from the right place when you work in a git worktree, a detached checkout, or on a machine without Prolog. Host launchers no longer pin the MCP server to the first workspace, so per-call workspace routing keeps working, and a missing Prolog runtime points at `kibi doctor` instead of failing opaquely.
  - Claude Code, Codex, Cursor and Z Code launchers set `KIBI_MCP_ATTACH_ROOT` instead of `KIBI_WORKSPACE`; the server starts in that directory without disabling routing. `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT` and `KIBI_ROOT` still pin.
  - A detached HEAD whose commit is the tip of exactly one local branch attaches that branch's KB.
  - `kb_status` reports `swipl_*` error codes with a `kibi doctor` remediation when the Prolog runtime cannot be resolved.
  - CI and publish check that the committed Claude hook bundle matches its source.

## 0.3.0

### Minor Changes

- f93dcdd: Bootstrap no longer learns only from the code. The agent now starts with a short interview: it asks where product intent already lives (issue trackers such as Jira or YouTrack, wikis, specs, decision logs), which sources are authoritative or stale, and reads them through its own connectors. The bootstrap plan records those sources and the intent claims harvested from them, so each requirement taken from a ticket or page cites it and the citation is part of the approved plan hash. Kibi still never contacts those sources itself.
  - feat(cli): `kb_plan_bootstrap` / `plan-bootstrap` accept `bootstrapContext.knowledgeSources` (id, kind, title, locator, authority, optional connector) and `bootstrapContext.intentClaims` (statement, sourceId, reference, optional excerpt). Both are normalized into `declaredContext` and bound into `planHash`. Grounded claims from authoritative or supporting sources become `req` candidates with `sourceKind: intent_claim`, citation evidence, and `text_ref: <sourceId>:<reference>`. Ungroundable claims become authoring follow-ups, stale sources are suppressed with `stale_knowledge_source`, and claims citing undeclared sources are reported as non-blocking diagnostics. A `needs_context` plan without declared sources asks for them.
  - feat(skills): `kibi-bootstrap` 3.1.0 leads with the source interview before planning; the MCP `/kibi-bootstrap` prompt and the Cursor and ZCode commands follow it.
  - docs: README, landing page, quick start, and install guide lead with a copy-paste agent setup prompt; manual installation moves behind a toggle.

- 5a217be: The Claude Code plugin can now record what an agent did around its Kibi calls, so you can see whether it looked up requirements before editing or only afterwards. MCP and CLI rows show which Kibi operations ran, but not the reads and edits between them, and that was the question the earlier data could not answer. Recording is off unless `KIBI_DIAGNOSTIC_MODE=1` is set, the same opt-in the MCP server and CLI use.
  - Append `interface: "hook"` rows to `.kb/usage.log` for reads, edits, Grep/Glob searches, `.kb/` access, Kibi calls, and Stop reminders. Each row carries `hook_action` (shown vs. silent), `path`, `path_kind`, owning `requirement_ids`, `kb_operation`, `kb_used_before`, and the host `session_id`.
  - Rows are best effort and never change hook output; files outside the knowledge surface are not recorded.
  - Rebuild `bin/hook-runner.mjs`.

### Patch Changes

- 676bac9: The Claude Code, Codex, Cursor, and ZCode plugins now tell the Kibi MCP server which workspace each call is about, so sessions working in a git worktree are answered from that worktree's branch instead of the checkout the server started in. Nothing changes for sessions that stay in one project.
  - Each plugin's pre-tool hook adds `workspaceRoot`, the agent's current Kibi workspace, to every Kibi MCP call. Claude Code, Cursor, and ZCode send it without a permission decision so the host's own approval flow is unchanged; Codex requires `permissionDecision: "allow"` for input rewrites, which does not override a server's tool approval mode.
  - `kibi-agent-core` exports `KIBI_WORKSPACE_ARGUMENT`, `isKibiMcpToolName`, and `stampKibiWorkspace` for the plugins.
  - The Codex hook parser now reads `hook_event_name`, the field Codex actually sends; the Claude and ZCode `PreToolUse` matchers include `mcp__.*__kb_.*`.
  - The ZCode launcher sets `KIBI_MCP_HOST=zcode` so its usage rows are attributed like the other hosts'.

## 0.2.1

### Patch Changes

- db5376c: Projects can now opt into impact reviews that bind a change to its exact source, knowledge decisions and trusted analysis policy. Kibi validates both staged changes and a complete pull-request diff, rejects stale review evidence, and lets agents prepare an unauthored review template through the CLI or MCP instead of hand-assembling one. Every decision and reviewer field stays for an agent to write; preparation never approves or proves anything.
  - Add versioned impact policy and review schemas, immutable review fingerprints, reviewed Python decorator coordinate migration and the trusted aggregate `check-diff` command.
  - Add the read-only `prepare-impact-review --input` CLI route and `kb_prepare_impact_review` MCP operation; regenerate the bundled operation-access catalog for the agent integrations.
  - Keep the sample CI workflow inactive until it is adopted on a protected target.

- 3d78159: Setting up Kibi no longer starts with installing SWI-Prolog. The documentation now says that Linux (x64 and arm64, glibc 2.28 or newer) and macOS (Apple silicon and Intel) need nothing beyond Node.js 22, explains the lookup order and the `KIBI_SWIPL` and `KIBI_SWIPL=system` overrides, and shows how `kibi doctor` reports which SWI-Prolog is in use and what to do when an install skipped the bundled runtime (`--omit=optional`, pnpm `supportedArchitectures`). Manual instructions stay for Alpine and native Windows. The GitHub Pages report workflows that `kibi init` can write no longer install SWI-Prolog by hand, because `npm ci` brings the bundled runtime with it.
  - kibi-cli: drop the `apt-get install swi-prolog` step from the shipped `kibi-report.yml` and `kibi-badge.yml` workflow templates.
  - kibi-cursor, kibi-claude: README and plugin manifest prerequisites say SWI-Prolog is bundled on supported platforms and only needed on `PATH` elsewhere.
  - Kibi's own CI and proof now run the pipeline-built bundled SWI-Prolog (one job keeps a system install with `KIBI_SWIPL=system`), and the release dry run follows the README quick start with the packed tarballs on four platforms; neither ships in a package.

## 0.2.0

### Minor Changes

- 35cd120: Kibi now ships a Claude Code plugin. When an agent reads or edits code that
  the knowledge base links to requirements, it sees a short note first. The
  note lists which requirements that code implements, which tests cover it, and
  which symbol the edit lands in, plus the exact Kibi call for the full detail.
  Before the agent finishes, it gets one reminder to run an impact check on
  source files it changed. The plugin says nothing in projects without Kibi,
  repeats nothing within a session, and goes quiet once the agent is already
  using Kibi. It installs straight from GitHub through the repository
  marketplace.
  - New `packages/claude` plugin (`kibi-claude`): `.claude-plugin/plugin.json`,
    `.mcp.json` with a `CLAUDE_PROJECT_DIR`-aware workspace-gated launcher,
    `hooks/hooks.json` (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`),
    a committed self-contained hook bundle (`bin/hook-runner.mjs`, drift-tested),
    and a skills mirror whose `name` is the skill id so plugin slash commands
    stay usable.
  - Hooks never call the CLI: a line scanner indexes `.kb/symbols.yaml` and
    `.kb/symbol-coordinates.yaml` (equivalent to a full YAML parse, about 20x
    faster) and caches it in `CLAUDE_PLUGIN_DATA`, keyed by manifest size and
    mtime.
  - Session memory is an append-only journal, so concurrent hooks for parallel
    tool calls do not lose events. The Stop reminder uses non-error
    `additionalContext`, fires once per file, and respects `stop_hook_active`.
  - Root `.claude-plugin/marketplace.json` gains the required `owner` field
    (Claude Code rejected the file without it) and lists `kibi-claude`
    alongside `kibi-zcode`.
  - `scripts/sync-agent-skills.ts` gains a `claude` target.
