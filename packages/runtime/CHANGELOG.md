# kibi-runtime

## 2.13.1

### Patch Changes

- c841267: `kb_model` `mode: "predicates"` now treats an explicit `subjectHint` as the planned subject when the requirement is not written yet or constrains nothing: the candidate gets that `subject_key`, `subject_pairing` is computed against it, and the planned predicate fact carries it, so after the requirement is written with `constrains` to that subject fact `kb_check` no longer reports `strict-req-fact-pairing` (previously the plan fell back to the `requirement.subject` placeholder). A `kb_model` parameter that belongs to another mode is no longer silently ignored: the result's `warnings` name it and the parameter to use instead (for example `subjectKey` in mode `predicates` points to `subjectHint`). The kibi-usage skill (2.12.0) updates the "new strict requirement with a predicate grounding" recipe: pass `subjectHint` with the subject fact's key, and send `specified_by` (requirement → scenario) in the requirement's write, not the scenario's.

  Technical summary: `buildSuggestion` (`predicate-applyplan.ts`) computes `subject_key`/`subject_pairing` against `plannedSubjects` (the constrained subjects, else `[subjectHint]` when explicit, else none). `dispatchComposite` calls the new `foreignParameterWarnings`, which lists input keys another route of the composite declares but the chosen route does not, with per-operation equivalents (`subjectKey` ↔ `subjectHint`); they are appended to the routed payload's own `warnings` (strings, or `{ kind: "parameter_ignored", message, nextAction }` for `kb_model_requirement`) and to the text content. Skill mirrors regenerated.

- e0fdbbd: Agents can now configure proof without hand-writing `.kb/proof/integrations.json`. `kibi proof inspect --json` proposes a command integration for the detected test runner and returns a reviewed, hash-bound plan that `kb_apply_plan` (or `kibi apply-plan`) applies; `kibi prove` then runs it. Proof errors no longer point at a bootstrap step that never wrote the file.

  `kibi proof inspect` adds `proposedIntegration`, `contractDefaults`, `integrationPlan` (`kibi.migration-plan.v2` with one `proof_integration_configure` action) and `integrationPlanReason`, and a new `--update <id>` option plans adding or replacing one named integration. The migration applier gains a `proof_integration_configure` executor: it refuses a create once the file exists, refuses an update when the file's hash changed, refuses either when `package.json`, a lockfile or a runner config changed since planning, and validates the result against `kibi.proof-integration.v1` before an atomic write. The `No proof integration configuration` and `integration … is not configured` messages, the `kibi-usage` proof resource and the `kibi-bootstrap` skill (3.11.0, new step 11 proof-integration item) name this route.

- Updated dependencies [ae54c20]
- Updated dependencies [218e55d]
  - kibi-core@0.18.1

## 2.13.0

### Minor Changes

- ee91b85: Projects with a UI can opt into the experimental `kibi-plugin-ui`, which keeps agents on the agreed design: `kb_check` then requires every React or Angular component to implement a design requirement and blocks a component that loses the class names or test ids marking its agreed pattern, such as a timeline rewritten as cards. `/kibi-bootstrap` offers the plugin when it finds component files, and a declined offer is remembered in `package.json` `kibi.declinedPlugins`. Requirements that only name a UI pattern are now proved by fresh isolated component tests, so pattern rules do not need browser tests. Projects without the plugin see no new blocking findings.
  - Add the `kibi.check-policy.v1` capability to `kibi-plugin-sdk`: a JSON policy with ownership and pattern-marker rules, validated by `validateCheckPolicyDocument`. `kb_check` reads activated policies as data from the package and never imports plugin code; an unreadable policy blocks. The builtin plugin ships an empty policy.
  - Add the canonical `policy-ownership` and `policy-markers` rules (inert without an activated policy) to the rule registry, the `kb_check` schema and the CLI.
  - Add built-in `ui_pattern`, `same_pattern`, `pattern_marker` and `ui_container` predicate schemas with suggestion keywords.
  - Proof ladder: a scenario whose requirements are grounded only in `ui_pattern`, `same_pattern` and `pattern_marker` accepts `unit` and `integration` tests with fresh receipts; each scenario obligation now reports `acceptedScopes`.
  - `kb_plan_bootstrap` returns `pluginOffers` and a `plugin_offer` recommended action; `kibi.declinedPlugins` is validated as a list of bare package names. The `kibi-bootstrap` and `kibi-usage` skills cover the offer and the UI pattern workflow.
  - New package `kibi-plugin-ui` ships the UI design policy. It is optional and not part of the default install.

  Migration: none required. To enable the guard, install `kibi-plugin-ui` as a dev dependency and activate `kibi.check-policy.v1` in `augment` mode under `package.json` `kibi.plugins`; expect `policy-ownership` findings for existing components until they are linked to design requirements or tagged `review:ui-unconstrained`.

### Patch Changes

- 5d0b35f: A `kb_upsert` that the commit refuses (for example `Contradiction detected … (stage=contradiction_check)`) now leaves the workspace exactly as it found it: the pending-source receipt of an untracked file written by an earlier `kb_upsert` is restored together with the file bytes and file times, so `kb_check` no longer reports `source-relationship-parity` hash drift and `kb_status` stays fresh after a refusal. `kb_upsert` with `dryRun: true` previews that commit-time contradiction check for a requirement against a staged, rolled-back copy of the store instead of reporting `valid: true` for a write the commit then refuses. `kb_model` mode `predicates` answers `record_ontology_gap` with the gap observation planned when the only matching schema needs a participant (`actor`, `role`, `owner`) the claim never names, instead of asking for a binding the claim cannot supply. `kb_find_gaps` reports `summary: { total, provenanceStubs }` so a caller can tell "no gaps" from "only provenance stubs", and the `semantic_source_field must be …` refusal now says which field Kibi derived the prose from and why. The kibi-usage skill (2.11.0) adds second-agent recipes for a new grounded requirement, rewording a grounded requirement, deleting authored entities, recovering from a commit-time refusal and the limits of `dryRun`. All of these came out of an autonomous onboarding evaluation on a test project.

  Technical summary: `writeSourceForUpsert` snapshots the pending receipt bytes and the file times before publishing and restores both in the existing-file rollback branch; the `source-relationship-parity` suggestion names the working repair (`kb_upsert` republishes the receipt, `kibi branch recover --apply` for a deleted file). `kb_preview_upsert_contradiction/3` (kibi-core) stages an upsert in a transaction it always rolls back and runs `check_req_contradiction/1`; `executeValidateUpsert` calls it through `buildUpsertContradictionPreviewGoal` for `req` payloads without `_skipContradictionCheck`. `unnamedParticipantArguments` decides when an incomplete candidate's unbound arguments are all participants the claim does not name (empty, subject key or clause, and no declared constant or example value in the text); `handleKbSuggestPredicates` then returns `record_ontology_gap`, `buildGapApplyPlan` and keeps the candidate and `bindingHints`. `find_gaps_json` adds `summary` (`matching_gap_stub/6`), mirrored in `FindGapsPayload`, the `kb_find_gaps` output contract and the MCP contract fixtures. `validateSemanticInventoryBoundary` explains the derived source field (`semantic_text` when set, else `text_ref`, else `title`).

- Updated dependencies [5d0b35f]
- Updated dependencies [ee91b85]
  - kibi-core@0.18.0
  - kibi-plugin-builtin@0.5.0

## 2.12.0

### Minor Changes

- 6315e95: Bootstrap no longer fills the knowledge base with content-free provider facts. A discovered provider entry whose source states no claim (a source module, a package manifest, a layout root, a test file with no recognized framework) is now a provenance stub: written as `fact_kind: meta` tagged `bootstrap:provenance-stub`, planned after every candidate with a claim, counted apart in the plan, ranked after everything else by `kb_search` (and dropped below its default threshold), never listed as a note in the search answer, and not counted as knowledge by `kb_find_gaps` or `kb_coverage`. On a test project, raising `maxCandidates` to 200 had added 150 such stubs, which then surfaced in search answers; the `over_limit` diagnostic now says how many suppressed candidates are stubs so an operator does not raise the limit for them.

  Technical summary: `providerCandidate` classifies a provider candidate by `data.claim`; `test_topology` sets a claim when it recognizes a framework (and stays an observation), while `source_symbols`, `repo_metadata` and `repo_layout` never do (stubs, `provenanceStubBody`). `selectBootstrapCandidates` puts stubs in a last lane, marks `over_limit` rows with `provenanceStub` and counts them in the diagnostic; `presentBootstrap` adds `candidatesWithClaims`, `provenanceStubs` and `suppressedProvenanceStubs` to `discoverySummary` and reports the stub share in `tldr`. The shared `provenance-stub.ts` helper drives the intent-v1 and legacy rankings (`demoted: provenance stub`, sorted last, intent score times 0.25) and the answer layer; `discovery.pl` skips stubs in `find_gaps_json` unless the tag is requested and reports them as `summary.provenanceStubs` in type coverage. The kibi-bootstrap skill (3.9.0) tells agents not to raise the cap for stubs.

### Patch Changes

- 6315e95: `kb_model` mode `predicates` no longer lets an actor, role or owner be bound to the requirement's subject key. Binding hints offered the subject key for any naming argument, so an agent bound `actor = <subject key>` on a `permission_rule` and got a complete predicate whose actor said nothing the fact's `subject_key` did not already say. Subject keys are now offered only for the `subject` argument and for `entity` arguments; an explicit participant binding equal to a constrained subject key stays unbound with a reason, and when the claim names no participant the hint says so and points to `record_ontology_gap`.

  Technical summary: `predicate-bindings.ts` adds `isParticipantArgumentType` (`actor`, `actor_scope`, `role`, `owner`) and `subjectKeyParticipantReason`, which `classifyBinding` applies to explicit and extracted values through the new `constrainedSubjects` binding context that `buildSuggestion` now passes; the hinted-first-argument shortcut no longer applies to a participant-typed first argument. `buildBindingHints` restricts subject-key examples to `subject` and `entity` arguments and replaces the "or the requirement's subject key" advice with no-participant guidance for participant arguments. `replacementPlan` (K20) now carries `expected.kbCheckAfterStep` listing both `logic-coverage` and `strict-req-fact-pairing` between the retraction and the link, `kbCheckAfterLastStep: []` and `rollbackWhen`, and its instructions and rollback reason state the rollback condition as a `kb_check` that is not clean after the last step. The kibi-usage skill (2.10.0) describes both.

- Updated dependencies [6315e95]
  - kibi-core@0.17.3

## 2.11.0

### Minor Changes

- 89d8b8e: `kb_model` mode `predicates` no longer offers a predicate plan that `kb_check` would then reject. The requirement's subject now binds the argument a schema names `subject` wherever it sits, and for a schema without one (such as `permission_rule`) it is recorded as the planned predicate fact's `subject_key`; a predicate that is not about a subject the requirement constrains stays `provide_argument_bindings` with a hint instead of `replace_grounding` or `apply_requires_predicate`. A value taken from the claim for an actor, resource or other participant that is a long clause (more than three words) is no longer accepted as a binding.

  Technical summary: `buildSuggestion` binds `subjectHint` or the single constrained subject into `argument_names.indexOf("subject")` and adds `subject_key` and `subject_pairing` (`paired`, `unpaired`, `not_required`) to each candidate; an unpaired candidate gets `subject` or `subject_key` in `unbound_arguments`, a `bindingHints` entry (position -1 for `subject_key`) and a warning naming the schema. `buildPredicateApplyPlan` writes `subject_key` on the planned fact when it is known, so `replacementPlan` step 1 carries it. `classifyBinding` treats an extracted value of an `entity`, `actor`, `actor_scope`, `resource`, `owner`, `role` or `component` argument with more than three snake-case words as a placeholder (`clauseBindingReason`), and the hint says why. The constrained subjects are now read even when `subjectHint` is passed. The kibi-usage skill (2.9.0) describes `subject_key` and short participant bindings.

### Patch Changes

- 89d8b8e: `kb_check` now pairs a requirement's subject fact with a predicate that is about that subject wherever the predicate keeps it. Until now `strict-req-fact-pairing` only accepted a predicate whose first argument was the subject key, so a permission rule (`permission_rule(actor, action, resource, decision)`) or any schema with its subject elsewhere was reported even after following a `kb_model` replacement plan exactly. A predicate fact can now say which subject it is about with its own `subject_key`.

  Technical summary: `strict_req_predicate_grounds_subject/2` reads the subject of a `requires_predicate` fact through `predicate_fact_subject_key/5`: the fact's `subject_key` when present, else the argument its project-local `predicate_schema` names `subject` (any position), else the first argument when neither is declared. The `strict-readiness` `contradiction_ready` level uses the same rule, and the pairing suggestions name both options.

- 89d8b8e: An engine daemon left running by another Kibi install, for example one an older `kibi` started from a git hook, no longer serves a newer client. The client now compares the daemon's package versions on connect and stops and replaces a daemon that differs, the same way it already does for a different SWI-Prolog. `kibi doctor` reports the package versions of the running daemon.

  Technical summary: the built version string (`kibi-cli@…,kibi-core@…`, shared from the new `package-versions.ts`; `KIBI_PACKAGE_VERSIONS` still overrides it) is sent by the client on every request and passed to the daemon it spawns. The daemon reports its versions in the `handshake` reply and refuses every other request except `stop` from a client with other versions; `reconcileRuntime` replaces a daemon whose handshake reports other versions (or none, as a pre-change daemon does) and fails with a clear error if the replacement still differs. kibi-runtime bakes the bundled kibi-cli version into its bundles at build time, so a runtime-hosted client and a kibi-cli daemon of the same release agree. `EngineClient.inspectLiveDaemon()` reads a live daemon's handshake without starting one, and `kibi doctor` uses it for the new "Engine daemon" check.

- Updated dependencies [89d8b8e]
  - kibi-core@0.17.2

## 2.10.0

### Minor Changes

- c9dd5f9: Bootstrap plans now write one subject fact per subject key. When claims from different sources (a handoff document and a ticket, say) name the same subject, every requirement links to that one fact instead of each getting its own copy, so `kb_check` no longer reports `subject-key-identity` right after an applied bootstrap and nobody has to merge the facts by hand. The plan lists each shared key in a `subject-key-shared:` diagnostic naming its sources.

  Technical summary: after candidate selection `kb_plan_bootstrap` keeps the first selected subject fact for each `subject_key`, drops the later ones, retargets their requirements' `constrains` links (and the candidates' `relationships`) to the kept fact, and adds every source's `provenance:` tag and a `document.body` listing the sources to it. The transformation depends only on the candidate order, so `planHash` stays deterministic; action `dependsOn` follows the retargeted links. The kibi-bootstrap skill (3.8.0) and `docs/mcp-reference.md` describe the diagnostic.

- c9dd5f9: Built-in predicate schemas now declare the allowed values of arguments with a natural closed vocabulary, so `kb_model` mode `predicates` lists them as `allowedValues` when the claim does not name one and binds them when it does in other words. For example the `trigger` of `commit_action`, `discard_action` and `transition` is one of `escape`, `cancel`, `submit`, `navigation`, `click`, `timeout`, "when the session times out" binds `timeout`, and "must be denied" binds the decision `deny`. A granted permission in a `permission_rule` suggestion is now spelled `allow` (it was `assert`, the polarity, which stays `assert`). Existing predicate facts are unaffected: built-in vocabularies guide suggestions and are not enforced on stored facts.

  Technical summary: new `predicate-closed-vocabularies.ts` declares `argument_constants` and `argument_aliases` for `trigger` (commit_action, discard_action, transition), `decision` (permission_rule, scoped_authorization_rule: allow, deny; `assert` is an alias of `allow`), `policy` (refresh_policy_rule: automatic, manual, on_demand), `decision` (environment_safety_rule: allowed, forbidden, read-only), `operator` (resource_constraint), `unit` (retention_policy: days, months, years) and `action` (coding_standard_rule: use, avoid; lifecycle_rule: archived, deleted, expired). Schema examples use the declared constants. Binding cues map wording such as "denied", "must not", "times out" and "on demand" to their constant, and `inferTrigger` recognizes clicks and timeouts.

- c9dd5f9: `kb_model` mode `predicates` now takes the predicate's subject from the requirement: when `requirementId` names a requirement that constrains a subject fact, the predicate uses that fact's `subject_key`, so the predicate and the subject fact name one subject and contradiction checks see them together. Demo guesses such as `editor.annotation` are no longer applied to a requirement; a requirement without a subject fact leaves `subject` for the agent to bind. `docs/mcp-reference.md` now says that `structuredContent.<field>` paths are shorthand for `structuredContent.data.<field>` inside the protocol envelope.

  Technical summary: `handleKbSuggestPredicates` reads the `subject_key` of every subject fact the requirement `constrains`. With exactly one, it binds the schema's `subject` argument with the new binding provenance `requirement` (applicable like `explicit`); with several, they come first in the subject's `bindingHints[].examples`. `subjectHint` and an explicit `argumentBindings.subject` still win. `inferSubject` takes the requirement context and keeps its keyword heuristics for free text without `requirementId`. The kibi-usage skill (2.8.0) names the `structuredContent.data.bindingHints` path and the requirement-bound subject.

### Patch Changes

- c9dd5f9: `kb_check` no longer reports `strict-req-fact-pairing` on a requirement that constrains a subject fact and grounds its claim through a predicate fact about that subject. Until now the rule only accepted a `requires_property` partner, so every requirement that followed a `kb_model` `replace_grounding` plan was told to add the property back, which would have broken `proposition-complete`. The `strict-readiness` migration diagnostic now reports one readiness level per requirement instead of every lower level as well.

  Technical summary: `strict_req_fact_pairing_issue/3` and the `has_subject` readiness level accept a `requires_predicate` link to a ground `fact_kind: predicate` fact whose first argument equals the constrained `subject_key` (`strict_req_predicate_grounds_subject/2`, the position built-in and project-local schemas use for the governed subject); a predicate about another subject is still reported. Such a requirement counts as `contradiction_ready`. `strict_readiness_issue/3` computes a requirement's level once and compares it, fixing the unbound-level match that also returned `prose-only` and `traceable` for every requirement. Suggestions and messages name both pairing options.

- Updated dependencies [c9dd5f9]
  - kibi-core@0.17.1

## 2.9.0

### Minor Changes

- 5aab5a2: Bootstrap plans no longer turn a whole clause into a subject key. A key such as `support_inbox.update_in_real_time_when_a_new_ticket_is_assigned_to_the_agent_without_a_page_refresh` is now planned as `support_inbox.update_in_real_time`, and the plan diagnostics name the original key so the operator can pick a better name before approving. Two different subjects that would share a shortened key get distinct keys instead of colliding.

  An aspect longer than four words or 40 characters is shortened deterministically: the words before the first clause boundary (`when`, `while`, `for`, `and`, ...) without leading or trailing stop words, then, if still too long, its content words, then the first and last two content words. Each shortening adds a `subject-key-shortened:` diagnostic; a collision between different subjects adds a third segment from the later claim's wording (or a short digest) and a `subject-key-disambiguated:` diagnostic, while claims about the same subject keep sharing one key. One registry per plan covers repository Markdown and declared intent claims. The kibi-bootstrap skill (3.7.0) and `docs/mcp-reference.md` explain how components are supplied and how aspects are derived.

- 5aab5a2: `kb_model` mode `predicates` no longer accepts argument bindings that only repeat a field name, such as `before_event: "before_event"`, or a bare stop word such as `action: "be"`. Those values used to complete a predicate and produce a write plan for a meaningless fact; the argument now stays unbound. When bindings are missing, the response lists each unbound argument with its type and example values so agents can bind from the claim text instead of guessing.

  `classifyBinding` treats a value equal to its own or another argument name (after snake-case normalization) as a placeholder unless the claim itself names it, and treats trivial verbs, articles and filler words as placeholders; `true`, `false`, the schema's declared `argument_constants` and a subject given through `subjectHint` are still accepted. On `provide_argument_bindings`, `structuredContent.bindingHints` gives `argument`, `position`, `type`, optional `description`, `allowedValues` for a closed vocabulary, `examples` from the constants and the schema's examples, the refused `currentValue` with its `provenance`, and a `reason`; the text summary lists them too. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the rule.

- 5aab5a2: The ontology-gap observation that `kb_model` mode `predicates` returns can now be written with `kb_upsert` exactly as returned. Before, every such plan was rejected because it linked the observation to the `review:ontology-gap` tag as if the tag were an entity, and it carried a `claim_key` that made a review note look like a semantic claim. The `replace_grounding` plan is now also directly applicable: its requirement step restates the stored title, status and tags, and the response says why the steps must run in order.

  The gap observation keeps `claim_text`, `value_string` and `text_ref`, drops `claim_key` and the tag relationship, and adds a `document.body` saying that no predicate schema fits and quoting the claim, so schema 8's `entity-context-missing` passes. Semantic-advisor review observations (`review:ambiguity`, `review:keyword-false-positive`, `review:ontology-gap`, `review:nonlogical`) likewise keep their category in `tags` only and carry a body. `replacementPlan` adds a `rollback` step that restores the retracted link if the last step fails, and its instructions note that `kb_check` reports `logic-coverage` between the retraction and the new link. A new MCP stdio test applies both plans through the real server. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the shapes, and `docs/mcp-reference.md` and `docs/error-reference.md` explain that the `rdf/lock` left after a session belongs to the shared engine daemon, which exits after 10 idle minutes.

## 2.8.0

### Minor Changes

- be5d25e: A `kb_apply_plan` call with a plan but no `approvedPlanHash` (or a malformed or mismatched one) now fails the call itself over MCP, also with `async: true`. Before, MCP accepted it, returned a job receipt, and the error appeared only when polling `kb_job_status`. `kb_delete` likewise rejects a call that names both or neither of `ids` and `relationships`, as the CLI already did.

  The MCP JSON Schema to Zod converter now enforces a `oneOf` whose branches are only `required`/`not`/`anyOf`/`allOf` key guards (exactly one branch must match) with the same condition matcher as `if`/`then`; the published input schema gains no top-level `oneOf`. In async mode the server runs the new `preflightApplyPlan` (exported from the CLI operations and kibi-runtime) before returning the receipt: it checks the approved hash, the plan shape and canonical hash, and for a bootstrap plan the branch, KB, workspace and source snapshots. The job repeats every check under the workspace lock.

- be5d25e: `kb_model` with `mode: "predicates"` now tells you what to do with a requirement that is already grounded, instead of answering `already_grounded` for all of them. A grounded claim with no fitting schema gets `record_ontology_gap` and the `review:ontology-gap` observation plan again, one whose schema needs exact values gets `provide_argument_bindings` with the missing arguments, and one with a complete predicate gets the new `replace_grounding` action with its `replacementPlan`. After a bootstrap, which grounds every requirement, the ontology-gap lane is no longer silently skipped.

  `recommendedAction` drops `already_grounded` and adds `replace_grounding`; `existingGrounding` remains the "already grounded" signal. An already grounded claim still gets no predicate `applyPlan` or `relationshipPlan` (a second grounding link fails the proposition-complete rule), but the ontology-gap observation plan and `recommendedPredicateSchema` are returned because an observation is not a grounding relationship. The warning that points at `replacementPlan` appears only when a replacement plan exists. kibi-usage 2.6.0 and kibi-bootstrap 3.6.0 describe the new actions; `docs/mcp-reference.md` documents them.

## 2.7.0

### Minor Changes

- b3eef89: `kibi check` now blocks a requirement whose advisor ledger still has unmodeled (`missing`) propositions when it `relates_to` a requirement that is modeled with strict property or ground predicate facts. Until now such a requirement passed clean: `domain-contradictions` compares grounded facts only, so a new requirement that quietly described different behavior for the same subject was never compared with the modeled one it linked to. The finding names the modeled subject and property keys (or predicate keys) and asks for the missing propositions to be modeled against them, or for a `supersedes` decision.

  New canonical rule `related-requirement-unmodeled` (Prolog, `check_related_requirement_unmodeled/1`) is registered in `rule-registry.json` and runs by default. It follows `relates_to` in either direction, counts only `status: missing` inventory entries, and reports nothing for requirements without a ledger (strict-readiness lane), for ledgers whose assertive propositions are modeled or explicitly classified, for neighbours that model nothing, and once the older requirement is superseded.

### Patch Changes

- Updated dependencies [b3eef89]
  - kibi-core@0.17.0

## 2.6.0

### Minor Changes

- 393f492: Large bootstrap plans no longer fall over when they take longer than the agent's MCP client is willing to wait. `kb_apply_plan` reports progress after every bootstrap action, so clients that reset their timeout on progress keep waiting, and `async: true` returns a `kibi.job.v1` receipt to poll with `kb_job_status` instead of holding the request open. If an apply is still cut off mid-action, `kb_apply_plan` with the journal's `recoveryJournalId` resumes it without hand-editing the journal and reclaims a source lock left behind by the dead process.

  `OperationContext` and `RuntimeOptions` gain an optional `onProgress` reporter (`OperationProgress`, `ProgressReporter` are exported from `kibi-runtime`). The bootstrap executor reports after each applied action; the MCP server forwards reports as `notifications/progress` when the request carries `_meta.progressToken`, and each report also pushes back the server's `KIBI_MCP_TOOL_TIMEOUT_MS`, which then bounds inactivity rather than the whole apply. `kb_apply_plan` accepts `async` (MCP only; it falls back to a synchronous apply when `kb_job_status` is not enabled) and its output contract admits the job receipt. Bootstrap recovery now accepts drift since the last checkpoint only when the journal is still `applying` with an active action that has no result: that action is re-applied, the result notes it, and the journal records it under `interruptedActions`; any other drift is still refused. `acquireWorkspaceMutationLock` takes a `reclaimDeadHolder` option; `kb_apply_plan` grants it only for a bootstrap recovery whose journal is `applying`, moves a dead holder's lock aside atomically, records it under `lockReclaims` in the journal, and keeps failing closed for live, unverifiable, corrupt or legacy owners. Bundled skills `kibi-bootstrap` 3.5.0 and `kibi-usage` 2.5.0 describe progress, async apply and journal recovery, and say never to edit `.kb/recovery`.

## 2.5.0

### Minor Changes

- b350869: Requirements, scenarios, tests, ADRs and observations now have to say why they exist. `kibi check` blocks a current entity whose body has no real context, `kb_compile_intent` requires a `context` for a new requirement, and bootstrap keeps the quoted source excerpt in the entity instead of only on the approval screen. Existing knowledge bases upgrade to schema 8 with `kibi migrate --yes`, which keeps every body byte-identical and only tags entities that lack context `review:context-missing`, recording their ids in `.kb/manifest.json`; the tag is honored only for those ids, so an agent cannot clear the check by tagging an entity itself. Run `kibi sync` afterwards.

  Entity bodies are split into sections by Markdown headings; `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` headings count as context. A requirement counts only context headings, while scenarios, tests, ADRs and observation or meta facts count all prose. Context needs at least 12 words and a token-set Jaccard similarity below 0.8 against the title (and, for a requirement, `semantic_text`); symbols, flags, events and other fact kinds are exempt. New canonical rule `entity-context-missing` and advisory `entity-context-acknowledged` are registered, and `kb_upsert` (including dryRun) warns about the same finding. `requirementSemanticText` now excludes context sections, and every requirement authoring path writes `semantic_text` explicitly; the schema 8 migration pins it for existing requirements with the previous derivation so claim spans and hashes do not move. `kb_compile_intent` gains `context`, `sourceExcerpt` and `sourceReference` and renders statement, `## Context` and `## Source`; on update it replaces the statement and keeps the existing context sections byte for byte unless new context or source is supplied. `kb_plan_bootstrap` requires `excerpt` for `intent` and `observation` claims and persists it with the source title and reference in the created body. Search snippets come from the first context prose. Bundled skills `kibi-usage` 2.4.0 and `kibi-bootstrap` 3.4.0 document the per-type body contract and say never to invent a reason.

### Patch Changes

- Updated dependencies [b350869]
  - kibi-core@0.16.0

## 2.4.1

### Patch Changes

- 7f08632: Bootstrap no longer drops conditional claims ("If microphone access fails, the editor must ...") or obligations that mention a referent ("... any draft state that refers to it") as `invalid_write`; they become ready requirement candidates. Linking a scenario to an existing requirement with `kb_upsert` no longer requires resending its whole semantic inventory, and a review observation can quote the claim it is about without a `claim_key`. The bundled skills now show how to answer `provide_argument_bindings` from `kb_model` predicates and how to write scenarios from acceptance criteria.

  Technical summary: requirement steps built by `kb_plan_bootstrap`, the `kb_model` requirement path and typed logic plans take each inventory role from the semantic advisor (`advisorPropositionRole`), so the write-time proposition-complete check accepts what Kibi itself generated. The advisor classifies a clause as `definition` only when "means / is defined as / refers to / is called" is the main predicate of a sentence that asserts no obligation; inventories stored with the earlier `definition` role for such clauses still validate. `kb_upsert` on an existing `req` whose payload carries no `semantic_*` or `logic_claims` field and keeps the stored `title` and `text_ref` merges the stored ledger (and the stored `text_ref` when the payload omits it) before validation and writing; a payload that supplies ledger fields or changes the prose is checked as sent. The entity schema, the `kb_upsert` input schema and the Prolog shape check now let an `observation` or `meta` fact carry `claim_text` without `claim_key`; every other fact still needs both. `kibi-usage` 2.3.2 adds a predicate-binding retry example and a review observation payload; `kibi-bootstrap` 3.3.1 makes step 11 write scenarios from acceptance criteria with `assumes` links.

- Updated dependencies [7f08632]
  - kibi-core@0.15.2

## 2.4.0

### Minor Changes

- ec26130: Bootstrap now keeps what the onboarding interview leaves unsettled. Previously every declared claim was treated as intended behavior, and contradictions between sources or open questions had no place in the plan, so they stayed in the agent's own notes and were lost after apply. Now a claim can be marked as an observation or an open question, and conflicts between claims can be declared. Each is kept in the KB as a cited review fact instead of becoming a requirement.

  `kb_plan_bootstrap` accepts `bootstrapContext.intentClaims[].kind` (`intent` by default, `observation`, `open_question`) and `bootstrapContext.conflicts[]` (`claimReferences` of two to ten `{ sourceId, reference }` pairs plus a `note`). Observation and open-question claims become `fact_kind: observation` candidates with the claim's citation evidence and `text_ref: <sourceId>:<reference>`; open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict naming an undeclared claim is reported in `diagnostics`. Kinds and conflicts are part of `declaredContext` and the plan hash (the default `intent` kind is omitted, so existing plans keep their hash), and the facts go through the same plan-time write validation as every other candidate. The `kibi-bootstrap` skill (3.2.3) updates the harvest, declare and approval steps.

- 44b2d0d: After bootstrap, agents now keep going instead of stopping at a knowledge base that holds only cited requirements. Previously the `kibi-bootstrap` skill ended with "hand off to the normal Kibi workflow" and no instructions, and its rule against direct `kb_upsert` left claims the plan could not write with no way to author them. Now a "deepen" step tells the agent what to author next, in the normal workflow and with the human informed.

  The bundled `kibi-bootstrap` skill is now 3.3.0. A new step 11 ("Deepen") runs after apply and close-out. It loads `kibi-usage` and hands every claim suppressed as `invalid_write` or listed in `sourceOnlySignals` to `kb_model` and `kb_upsert` with its statement and `sourceId:reference` citation. It proposes a scenario from acceptance criteria (`specified_by`) for each persisted requirement, runs `kb_model` with `mode: "predicates"` on each one, and records any undeclared conflict or open question as a `review:conflict` or `review:open-question` observation. The safety boundary now states that the direct-`kb_upsert` prohibition covers the bootstrap plan's own writes, not this post-bootstrap authoring. Step 5 sends unplanned claims to step 11, and the report step is renumbered 12.

### Patch Changes

- 094fcae: Bootstrap now links your declared intent to the code even when you declare many claims. Previously declared intent claims used up the shared `maxCandidates` budget, so with 50 or more claims every symbol, test and repository document Kibi found was suppressed as `over_limit`, and the plan to approve listed hundreds of suppression rows. Now claims sit outside the budget, generic Markdown stays out of claim-driven plans unless you ask for it, and suppressions are summarized as one count per reason.

  `kb_plan_bootstrap` applies `maxCandidates` (default 50) only to discovered candidates, independent of how many declared `intentClaims` are planned, and reports one `N discovered candidate(s) exceeded maxCandidates` diagnostic instead of the old "discovered candidates get no slots" note. `includeGenericMarkdown` defaults to `false` when `bootstrapContext` declares `intentClaims` (a diagnostic states it) and to `true` otherwise; an explicit value always wins, and the input schema no longer advertises a fixed default. `tldr` and a new `Suppressed candidates by reason` diagnostic aggregate `suppressedCandidates` per reason; the full rows are unchanged. The `kibi-bootstrap` skill (3.2.2) updates step 5 accordingly.

## 2.3.2

### Patch Changes

- 564b171: Bootstrap plans no longer drop the intent claims you declared from tracker, wiki or spec sources when the repository has many candidates. Previously the default 50-candidate cap could silently discard every claim from one source, and two markdown lines that restated one rule could leave an approved plan half-applied. Now every declared claim is planned, each source reports how many of its claims were planned, and a plan that plans none of an authoritative source's claims asks for context instead of reporting ready.

  `kb_plan_bootstrap` applies `maxCandidates` only to discovered candidates. Candidates that would rewrite an already-planned entity with different content are suppressed as `duplicate_entity`, and the write-time `claim_key` grounding check now also runs at plan time against planned writes, suppressing mismatches as `invalid_write`. The plan adds one `Knowledge source …` diagnostic per declared source. The `kibi-bootstrap` skill (3.2.1) tells agents to read those diagnostics and no longer advises against `maxCandidates`.

- 1cddf4d: Approved bootstrap plans now apply when the current KB uses a journal generation and revision. A change to that revision still rejects the plan before writing.

  Accept the existing journal snapshot format in bootstrap plan validation while retaining canonical hash, workspace, and live snapshot checks.

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

- Updated dependencies [2a2b2db]
- Updated dependencies [2c6ce25]
  - kibi-core@0.15.1
  - kibi-plugin-builtin@0.4.2
  - kibi-swipl@1.0.1

## 2.3.1

### Patch Changes

- Agents now pick up the `kibi-bootstrap` skill for onboarding work beyond seeding a new knowledge base: reviewing a plan or preview, judging approval readiness, diagnosing a blocked or failed bootstrap, and applying an approved plan. The skill starts every task with `kb_status`, routes review and repair tasks to a read-only preview, and checks before applying that the plan matches the approved one field for field, including `suppressedCandidates`. In paired SkillOpt runs, 10 cells per variant, the new skill scored 95 against 70 for the previous one. It applied approved plans that the previous skill failed to apply, and it had no security failures where the previous skill had two.

  Skill `kibi-bootstrap` 3.2.0 rewrites the frontmatter `description` and the body. Every other frontmatter field and every resource stays the same. The candidate was drafted, evaluated and confirmed on a fresh cohort with the SkillOpt campaign workflow, using the Claude Code target host.

## 2.3.0

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

- ebb2491: Entities created by `kb_compile_intent` plans now survive `kibi sync --rebuild`. Before this, `kb_apply_plan` committed plan entities only to the branch store, so rebuilding the store from the workspace silently dropped them and their relationships. Applying a plan now writes each entity to its authored document, exactly as `kb_upsert` does, and code files named in `sourceLocations` are no longer overwritten with a requirement document.
  - `kb_compile_intent` sets `document.path` on every non-symbol step of a `ready` plan (the canonical path `kb_upsert` would choose) and returns `sourceWrites: []`. The requirement's document is the first `sourceLocations` entry only when it is a `.md`/`.mdx` file outside `.kb/`; code locations are evidence only. A step that fails entity validation or path resolution makes the plan `needs_resolution` with `A plan step cannot be applied as written: …`.
  - `kb_apply_plan` renders each step's document with the newly exported `renderSourceDocument` at apply time, journals it with the new file origin `entity-document`, publishes documents before relationship shards, and commits each entity with that document as its `source`. `changedPaths` lists every document written. Plan source writes that target the same path keep their exact bytes.

- d25a626: Kibi now answers questions on a CI checkout or any detached commit, compiles a cold knowledge base minutes faster, and can stop a runaway read before it blocks other agents. On a bare SHA, search, query, status, check, coverage and graph read a snapshot of that checkout and say so in every answer, while writes are refused with the command that fixes it. A cold `kibi sync` of the Kibi repository went from about 4 min 23 s to 19 s, and `--refresh-symbol-coordinates` from about 5 min 55 s to 26 s, with byte-identical results.
  - Detached HEAD with zero or several local branches at HEAD: read-only operations (CLI routes, human commands, MCP tools) attach a read-only snapshot store (`kibi-internal/detached-head-snapshot`) compiled incrementally from the checkout's tracked sources, and add a `detached_head_read_only` warning diagnostic with the commit, branches at HEAD, store path and `writes: "refused"`. Write operations and `kibi sync` refuse with an actionable message (`git switch <branch>`, `git switch -c <branch>`, or `KIBI_BRANCH`). One branch at HEAD still attaches that branch exactly; no branch KB is ever guessed or written. `kibi engine stop/status` address the snapshot daemon, and `kibi gc` keeps the snapshot while it is in use.
  - Sync: source-owned entity lookups before retracts run in batches of 200 instead of one engine round trip per path candidate; the Prolog client wakes on the answer frame instead of a 50 ms poll; TypeScript coordinate enrichment adds every source file before the first export check, so the type checker program is built once instead of once per file.
  - Engine read limits: `KIBI_ENGINE_READ_TIME_LIMIT_MS` and `KIBI_ENGINE_READ_INFERENCE_LIMIT` (opt-in, unset by default) bound each read-only engine request with `call_with_time_limit/2` and `call_with_inference_limit/3`. A read that hits its limit fails with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded` (`kind`, `limit`) on the CLI and MCP envelopes, never with a partial answer; write requests, module loads and sync compilation are never bounded, while the read-only queries a write operation such as `kb_upsert` runs before writing count as reads and can stop it before anything is written.
  - A CLI JSON route whose runtime cannot open (a detached HEAD refusing a write, no branch to attach) now prints an `OPERATION_FAILED` error envelope on stdout, not just a message on stderr.

- 1012d1c: The Kibi MCP server now offers 16 tools instead of 23, so agents load less tool text and pick the right call more often. Skills, prose modeling and upsert validation each moved behind one tool, and the remote SPARQL and job-polling tools are off unless you turn them on. CLI routes are unchanged.
  - `kb_skills` with `action: "list" | "load" | "read"` replaces `kb_skills_list`, `kb_skills_load` and `kb_skills_read`.
  - `kb_model` with `mode: "analyze" | "requirement" | "predicates"` replaces `kb_semantic_advisor`, `kb_model_requirement` and `kb_suggest_predicates`; inputs are unchanged and results carry the routed payload plus `mode`.
  - `kb_upsert` with `dryRun: true` replaces `kb_validate_upsert`: it validates and returns the advisor receipt without writing and reports both write effects as skipped. `kb_upsert` checks its input schema first, so a payload with an unknown field or a wrong enum value now fails with an input error naming the field instead of a `valid: false` receipt; the CLI `validate-upsert` route keeps the lenient preview.
  - `kb_sparql_remote` and `kb_job_status` register only when `KIBI_MCP_OPTIONAL_TOOLS` names them (comma-separated, or `all`). Without `kb_job_status`, `kb_check` with `async: true` runs synchronously.
  - The operation catalog gains composite `kb_skills` (CLI `kibi skill`) and `kb_model` (CLI `kibi model`); the narrower operations and their CLI routes remain. Usage telemetry records the routed operation name, so acceptance metrics are unchanged.
  - Semantic advisor warnings and predicate diagnostics name `kb_model (mode requirement)` and `kb_model (mode predicates)` instead of the removed tool names.
  - Migration: replace calls to the removed tool names as above. The frozen `tools/list` fixtures change accordingly.

### Patch Changes

- 89870c1: Bootstrap now checks its write actions before review and application, so ordinary require/forbid claims can be applied without malformed facts or semantic-inventory failures. Invalid and ungroundable claims remain cited authoring follow-ups; product intent receives priority over repository observations, and excluded or unreadable candidates are reported. Deterministic failures stop in a terminal journal with committed actions listed and guidance to re-plan; interrupted writes still recover.

  Encode polarity as an `eq` boolean `true` comparison with a require/forbid modifier in the shared strict builder, retaining existing stable IDs. Add writer-schema and semantic-inventory preflight, per-claim extraction diagnostics, task-list normalization, selection accounting, and terminal failure reporting through CLI/MCP status and result envelopes.

  Migration: KB schema 7 makes `strict-fact-shape` a blocking canonical check. Run `kibi migrate --yes`, then `kibi sync`. The migration rewrites legacy polarity-only property facts to the typed boolean encoding while preserving IDs, polarity, relationships, and document bodies. Other malformed strict facts require explicit correction; they are not treated as proof.

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

## 2.2.0

### Minor Changes

- f93dcdd: Bootstrap no longer learns only from the code. The agent now starts with a short interview: it asks where product intent already lives (issue trackers such as Jira or YouTrack, wikis, specs, decision logs), which sources are authoritative or stale, and reads them through its own connectors. The bootstrap plan records those sources and the intent claims harvested from them, so each requirement taken from a ticket or page cites it and the citation is part of the approved plan hash. Kibi still never contacts those sources itself.
  - feat(cli): `kb_plan_bootstrap` / `plan-bootstrap` accept `bootstrapContext.knowledgeSources` (id, kind, title, locator, authority, optional connector) and `bootstrapContext.intentClaims` (statement, sourceId, reference, optional excerpt). Both are normalized into `declaredContext` and bound into `planHash`. Grounded claims from authoritative or supporting sources become `req` candidates with `sourceKind: intent_claim`, citation evidence, and `text_ref: <sourceId>:<reference>`. Ungroundable claims become authoring follow-ups, stale sources are suppressed with `stale_knowledge_source`, and claims citing undeclared sources are reported as non-blocking diagnostics. A `needs_context` plan without declared sources asks for them.
  - feat(skills): `kibi-bootstrap` 3.1.0 leads with the source interview before planning; the MCP `/kibi-bootstrap` prompt and the Cursor and ZCode commands follow it.
  - docs: README, landing page, quick start, and install guide lead with a copy-paste agent setup prompt; manual installation moves behind a toggle.

## 2.1.0

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

### Patch Changes

- 58083a1: Kibi can use workspaces reached through native filesystem aliases, including macOS temporary paths, without rejecting valid source writes or confusing engine identity. Long temporary paths use a private shorter engine socket path instead of failing to start. GitHub scaffolding preserves the actual README filename on case-insensitive filesystems. Source writes still reject traversal and symlinks that escape the workspace.
  - kibi-cli: canonicalize existing filesystem ancestors before authored-path containment checks and engine identity comparison; reject dangling symlinks.
  - kibi-cli and kibi-runtime: choose an owned deterministic runtime directory whose complete Unix socket path fits the platform byte limit.
  - kibi-cli: select README candidates by actual directory-entry spelling while preserving priority and broken-symlink checks.

- 8622782: An impact review prepared on one machine now still validates in CI, and the MCP server and the CLI agree on whether it is current. Checks only block on incomplete source analysis the author can act on: the committed side of a change never blocks, and a known analyzer limitation such as a Rust macro or a Python decorator matters only where it overlaps the changed lines. Syntax, parse, timeout and integrity problems in the staged file still block. Long-running hosts no longer grow memory with every analyzed file, and Tree-sitter analysis reuses warm workers instead of starting one per file.
  - Identify the impact evaluator by its contract version and the canonical JSON of the schemas it consumes, instead of hashing the installed file tree and `process.version`. Identify the builtin analyzer runtime by its package identity rather than its installed tree.
  - `kibi-runtime` bundles the CLI operations again (`kibi-cli` is a build-time dependency only); it no longer installs `kibi-cli`.
  - Add one shared analysis gate (`analysisObligation`) used by staged checks, impact-review preparation and validation, and impact reports.
  - Classify source paths from a single extension table in `source-classification`, with parity tests against the Tree-sitter catalog and the builtin extractor.
  - Remove analyzed files from the ts-morph project after each v1 and v2 analysis.
  - Add an optional `timeoutMs` budget to `SymbolExtractorV2AnalyzeInput`; the host sets it slightly below its own deadline, so providers report their own timeout. Tree-sitter uses a bounded, persistent worker pool with grammars loaded once per worker, and the host analyzes up to four changed files at a time.

- Updated dependencies [db5376c]
- Updated dependencies [555cf95]
- Updated dependencies [8622782]
- Updated dependencies [db5376c]
  - kibi-plugin-builtin@0.4.0
  - kibi-core@0.14.1

## 2.0.2

### Patch Changes

- d6026da: Kibi's MCP server starts again in OpenCode, Cursor, and Codex. `kibi-mcp@2.1.1` was published against `kibi-runtime@2.0.1`, which predates the result-envelope helpers the server now imports, so the server crashed on load with a missing-export error. `kibi-mcp@2.1.0` is unaffected and can be used until this release is out.
  - Release `kibi-runtime` with `appendPayloadCountField` and `normalizeResultPayload` exported.
  - Raise the `kibi-runtime` dependency floor in `kibi-mcp` (and `kibi-opencode`) to the release that includes them, so an older runtime can no longer satisfy the range.

- f01838e: Search works again on a mature knowledge base, including searches grounded to a changed source file, and it no longer spends a large share of an agent's context on results it has not chosen yet. Search used to ask Prolog for up to 100,000 full entity records regardless of the requested limit, so on this repository even `limit: 5` failed outright with a bounded-output error. Results now come back as summaries by default, which cut a five-hit response from 154 KB to 3 KB while keeping ranking, ordering, and totals identical.
  - Page indexed candidate retrieval in bounded chunks instead of one unbounded read, fixing the `ENOBUFS` failures without changing the candidate set or ranking.
  - Use paged source-file queries for intent searches with source locations instead of falling back to an unbounded full-KB read.
  - Add `fields` to `kb_search`: `summary` (default) returns identifying metadata plus score, reasons, and snippet; `full` returns complete entity bodies as before.
  - Teach the bundled `kibi-usage` skill when to select intent-v1 ranking with grounded facets or source locations, and when a literal lexical query is still the right choice.
  - Fix an unhandled `EPIPE` between tests when an engine socket write lost its peer.

- f01838e: Usage telemetry now records what a call actually returned. Since mid-August every MCP tool result was logged with a count of zero, so a search that returned 190 hits looked identical to one that found nothing, and acceptance reports drew conclusions from fabricated data. Result and violation counts are now read correctly, and a payload that genuinely cannot be parsed is recorded as unknown rather than as an empty result, so a broken logger can no longer look like a healthy but empty knowledge base.
  - Add `normalizeResultPayload` to the result-envelope module and use it in both the MCP and CLI diagnostic loggers, resolving the `{ structuredContent }` wrapper and the bare `kibiProtocol` envelope through one contract.
  - Record `result_count` and `violation_count` as `null` with a `count unavailable` summary when no payload is readable, and omit `zero_results` in that case.
  - Restore `protocol_version`, `result_version`, `result_status`, and `effect_failures` on MCP rows, and fix the mirrored CLI case where a wrapped envelope logged protocol fields but lost the count.
  - Treat unreadable counts as `insufficient_evidence` in the source-lookup acceptance metric instead of silently counting them as non-zero hits.
  - Cover the boundary with an end-to-end test through the real MCP tool registration and logger path; the previous helper-level tests passed throughout the outage.

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

- Updated dependencies [173ed66]
- Updated dependencies [f7c2d56]
- Updated dependencies [e5ab646]
- Updated dependencies [0d161a7]
- Updated dependencies [6513324]
- Updated dependencies [9e17968]
- Updated dependencies [0128b56]
  - kibi-core@0.14.0
  - kibi-plugin-builtin@0.3.0

## 2.0.1

### Patch Changes

- 783cc75: Capability plugins now participate at the real CLI/MCP call sites while default installs keep the same builtin-only behavior.

  Symbol analysis prefers the capability registry when available, ontology matching can compose activated packs for suggest-predicates, and external semantic classifiers run only from `kb_semantic_advisor` and `kb_compile_intent`. `kb_model_requirement` stays a modeling operation and does not call an external classifier. Sync/check/upsert/status/proof paths stay on deterministic builtin analysis. Distribution lists, pack scripts, and docs cover the new plugin packages; Jev remains opt-in.

- 783cc75: Capability plugins can now be loaded safely from a project's package.json without changing default behavior when none are configured.

  Kibi hosts a lazy, injectable capability-plugin registry shared by CLI and MCP. Builtin providers always register; optional packages load only when a capability is first used, with replace/augment/shadow mode rules and an allowlist that keeps external semantic classifiers out of sync/check/upsert/status/proof paths.
  - Add `packages/cli/src/plugins` host loader/registry, composition helpers, and source-analysis service
  - Wire `OperationContext.ensurePlugins` through CLI and MCP runtimes
  - Pass operation context through MCP semantic-advisor / model-requirement / suggest-predicates registration
  - Depend on `kibi-plugin-sdk` `^0.1.0` and re-export the registry from `kibi-runtime`

- 217b044: Provider secrets now resolve the same way in every harness: existing process env wins, then project `.env.kibi` (or `KIBI_ENV_FILE`), then `~/.config/kibi/env`, with legacy `.env` only filling gaps (labeled `legacy_env`). Blank values are unset. `kibi doctor` stays import-free: package/capability/mode/declared for any plugin, plus static first-party Jev secret/model diagnostics from the real bootstrap attribution — never by re-reading files without the pre-bootstrap process snapshot, and never by executing plugin code.
  - Shared `bootstrapKibiEnvironment` with remembered process-key snapshot, blank-as-unset, and `legacy_env`
  - Doctor uses `resolveKibiWorkspaceRoot` + bootstrap `sources`; no `loadPluginPackage` / dynamic import
  - MCP `resolveWorkspaceRoot` delegates to the same canonical resolver
  - Re-export bootstrap helpers from `kibi-runtime`

- 188f875: No user-facing behavior change: `kibi-runtime` now resolves its bundled-skills directory lazily on first use instead of at import time, `isWithinRoot` drops a redundant same-path comparison, `kibi-cursor` drops a provably dead `planDelivered` early return and an always-true stdin branch, and the hook runners' stdin buffering is simplified to an unconditional `Buffer.from`. The reshaping lets the new mutation-testing suite (`docs/mutation-testing.md`, run via `bun run test:mutation`) prove these paths exhaustively — the suite holds a 100% mutation score over `kibi-runtime`, `kibi-codex`, and `kibi-cursor` sources.
- 8985874: Capability plugins now fail closed on unsafe resolution, poisoned loads, and silent classifier errors, and Jev records the model it actually called.

  Project config rejects duplicate package activation and duplicate replace providers. Package entry resolution uses Node/Bun as the source of truth and refuses entries that escape the package root, including via symlinks. A failed plugin import no longer poisons later retries in the same registry. Semantic classifier failures are returned as diagnostics instead of being swallowed, and Jev includes its configured model id in those diagnostics.
  - Validate duplicate plugin activation, secrets, and provider ids
  - Confine resolved plugin entries to the realpath'd package root
  - Evict rejected loadedPackages promises
  - Typed classifier attempt outcomes with diagnostics
  - Configurable Jev model (default `jev-latest`) on errors and requests

- aabd57f: Kibi's runtime package keeps TypeScript symbol analysis portable when installed from a build made elsewhere. It resolves the builtin analyzer through its declared package dependency, so TypeScript resources come from the consumer's install.
  - Externalize `kibi-plugin-builtin` from the runtime bundle and declare it as a runtime dependency.

- db07d8f: Proof diagnostics now agree with the Prolog decision: a structural type-shape unit contract is shown as qualifying, `kibi proof impact` compares against the Git HEAD baseline and exits 0 after a successful report, and mixed-role symbols fail the strict proof integrity gate.
  - Mode-aware candidate evaluation in Prolog; receipt fallback uses `test_receipt_evidence(Context, TestId, Evidence)`.
  - `proof impact` reads `HEAD:proof/baseline.json` with no worktree fallback; diagnostic exit 0.
  - Strict proof workflow and baseline checker include canonical `symbol-traceability`.

- f33a665: Proof failures now name the exact requirement, symbol, and why each `covered_by` candidate did not qualify, without changing what counts as proven. Agents can inspect a requirement with `kibi proof explain` and compare current proof state to the committed `proof/baseline.json` snapshot with `kibi proof impact`, instead of reverse-engineering Prolog or guessing from aggregate counts.
  - Keep `kibi.requirement-proof.v3` and add additive production-symbol `explanations` plus TEST `testResolutions` on the same Proof.
  - Ratchet `proof/baseline.json` to v2 with compact requirement fingerprints; aggregate counts stay the ratchet.
  - Add `kibi proof explain` and `kibi proof impact` as Proof projections, mixed-role leftovers in `symbol-traceability`, and advisory `proof-contract-symbols`.
  - Document the proof-regression workflow in `kibi-usage` 2.1.3.

- Updated dependencies [b375e8f]
- Updated dependencies [e6571b4]
- Updated dependencies [783cc75]
- Updated dependencies [783cc75]
- Updated dependencies [db07d8f]
- Updated dependencies [f33a665]
  - kibi-plugin-builtin@0.2.0
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

### Patch Changes

- b1682f1: Agents receive clearer guidance for repairing the actual supplied mutation request and preserving approved predicate bindings. The scoped additions retain the existing workflow while separating payload recovery from conditional relational modeling.
  - Update `kibi-usage` to 2.1.2 in CLI/runtime sources and the generated Codex/Cursor distributions.
  - Preserve the other three skills and all existing resource content.
  - Retain production-adoption safeguards; development comparisons are not held-out evidence.

- ee0dc49: Plugin hooks, the Cursor MCP launcher, and skill validation now expose the
  same entry paths tests already spawn as processes. In-process coverage can
  exercise stdin, CLI guards, and realpath failures instead of leaving those
  lines invisible to Codecov.
  - Export hook CLI helpers and Agent Plugin / launcher internals for tests.
  - Use a namespace `fs` import in skill validation so realpath errors are testable.

- 5999143: Agent-facing skill docs now use the current status field names, so agents following the freshness and E2E receipt workflows look for fields that actually exist in `kb_status` output instead of stale ones.
  - Bundled `kibi-freshness` and `kibi-usage` skills (all agent mirrors) now reference `proofSnapshotChanges` and `proofSnapshot` (previously `verificationSnapshotChanges`/`verificationSnapshot` from the pre-proof-architecture status schema).
  - The skillopt-eval harness reads `proofSnapshot*` status fields and its held-out eval prompts name the current fields, so "dirty editor path" evidence gathering works against live status output again.

  Dry: completes the `verificationSnapshot*` → `proofSnapshot*` rename from the proof architecture change in the surfaces that earlier commit missed.

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

- `kibi-runtime@1.0.0` could not be installed from npm because the publish was
  rejected: the package manifest had no `repository` entry, so npm's provenance
  verification failed with
  "Failed to validate repository information". This release adds the missing
  repository metadata so the package publishes and installs normally, matching
  every other Kibi package.
  - Add the standard `repository` block (`git`, `https://github.com/Looted/kibi.git`)
    to `kibi-runtime/package.json`; no code or behavior changes.

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

### Patch Changes

- e3fd1f2: Clean installations can now build Kibi's shared skill runtime without relying on a dependency supplied by another workspace package. This keeps CI, packed consumers, and direct runtime users consistent with local development.
  - Declare `gray-matter` as a direct runtime dependency because the skill manifest parser imports it.

- 3d7d04f: Generic MCP and CLI agents now discover Kibi's operating rules from bundled skills instead of a long copy-paste prompt. Improving an existing product KB is covered by a `kibi-usage` resource rather than a second manual, so agent guidance stays in one place and cannot drift from the packaged workflow.
  - Add `kibi-usage` `resources/kb-improvement.md` and bump that skill to 2.1.0.
  - Replace `docs/prompts/llm-rules.md` with `docs/generic-agent-onboarding.md`.
  - Remove the obsolete retroactive-init prompt; bootstrap stays in the `kibi-bootstrap` skill.

- 7bc4f61: Symbol coordinates no longer vanish when agents edit symbols, and a stale warm cache can no longer hide the damage. Editing a symbol through Kibi now keeps its exact code location in compiled knowledge, and when compiled state ever loses those coordinates while everything else looks unchanged, the approved coordinate refresh actually repairs it instead of reporting "Imported 0". Refresh failures now stop the operation loudly instead of being logged and ignored, so proof gaps appear immediately rather than after the next full rebuild.
  - Source-first symbol upserts re-extract the canonical manifest + artifact entity before committing; authored `symbols.yaml` stays coordinate-free.
  - Sync cache v2: workspace-root-relative keys, `symbol-coordinates.yaml` fingerprinted with its manifest, explicit refreshes forced through persistence, cache written only after durable save.
  - Generated artifacts become identity-bound v2 records published atomically under a workspace symbol compiler lock; malformed artifacts fail closed everywhere.
  - New MCP/CLI regression suites plus a Prolog proof-stage regression cover persistence, warm-cache repair, and fail-closed behavior.

- Generated symbol coordinates now stay aligned with live source files during sync and source-first mutations, even when operations overlap or fail partway through. Coordinate artifacts are published and restored atomically, so callers do not inherit stale or half-written compiler state.
  - Add workspace-scoped symbol compiler locking and compare-before-restore artifact rollback.
  - Include coordinate artifacts and referenced source files in sync freshness fingerprints.
  - Support explicit `test-suite` granularity for intentionally coarse test anchors.

- 3cb9545: Runtime builds now clean stale bundled skills before copying, so skills removed from source (like the retired `init-kibi` autopilot) no longer linger in `dist/skills/` and leak into packed distributions and the MCP skills list.

  The kibi-runtime build script previously only ran `mkdir -p dist/skills && cp -r src/skills/. dist/skills/`, which never removed directories that had been deleted from `src/skills/`. After the bootstrap-plan onboarding change replaced the `init-kibi` autopilot with the canonical `kibi-bootstrap` skill, every rebuild silently resurrected the removed skill from the previous build output. Consumers listing bundled skills saw a ghost `init-kibi` entry alongside `kibi-bootstrap`, and the MCP skills-adapter contract caught the mismatch. The build now mirrors the CLI package's behavior and runs `rm -rf dist/skills` before repopulating it.
  - build: remove `dist/skills` before copying `src/skills` in `packages/runtime/package.json`

- 8d25c5c: Ship a self-contained engine daemon in the published `kibi-runtime` package so packed consumers can start the Kibi engine.

  The runtime bundle inlines `kibi-cli` operation code whose daemon lookup expects `engine-daemon.js` beside the bundle or under a nested `kibi-cli` install. Published-shaped installs (npm or pnpm isolated mode) have neither, so first-party MCP hosts failed with "The Kibi engine is not built. Run `npm run build:cli`" on first engine use. The runtime build now bundles `packages/cli/src/engine-daemon.ts` into `dist/engine-daemon.js`, giving the existing lookup a working entry point without adding dependencies.

- b97329a: Verification status now remains reusable when the only local changes are operational Kibi artifacts that are excluded from the code snapshot. Those changes still appear in status diagnostics, while source changes continue to mark verification evidence dirty.
  - Derive workspace snapshot dirtiness from snapshot-relevant changes rather than every Git porcelain row.
  - Preserve complete change records and counts for operational diagnostics.

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

- Updated dependencies [1ca62af]
- Updated dependencies [7654339]
- Updated dependencies [400e88c]
  - kibi-core@0.11.0
