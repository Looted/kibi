# kibi-core

## 0.17.0

### Minor Changes

- b3eef89: `kibi check` now blocks a requirement whose advisor ledger still has unmodeled (`missing`) propositions when it `relates_to` a requirement that is modeled with strict property or ground predicate facts. Until now such a requirement passed clean: `domain-contradictions` compares grounded facts only, so a new requirement that quietly described different behavior for the same subject was never compared with the modeled one it linked to. The finding names the modeled subject and property keys (or predicate keys) and asks for the missing propositions to be modeled against them, or for a `supersedes` decision.

  New canonical rule `related-requirement-unmodeled` (Prolog, `check_related_requirement_unmodeled/1`) is registered in `rule-registry.json` and runs by default. It follows `relates_to` in either direction, counts only `status: missing` inventory entries, and reports nothing for requirements without a ledger (strict-readiness lane), for ledgers whose assertive propositions are modeled or explicitly classified, for neighbours that model nothing, and once the older requirement is superseded.

## 0.16.0

### Minor Changes

- b350869: Requirements, scenarios, tests, ADRs and observations now have to say why they exist. `kibi check` blocks a current entity whose body has no real context, `kb_compile_intent` requires a `context` for a new requirement, and bootstrap keeps the quoted source excerpt in the entity instead of only on the approval screen. Existing knowledge bases upgrade to schema 8 with `kibi migrate --yes`, which keeps every body byte-identical and only tags entities that lack context `review:context-missing`, recording their ids in `.kb/manifest.json`; the tag is honored only for those ids, so an agent cannot clear the check by tagging an entity itself. Run `kibi sync` afterwards.

  Entity bodies are split into sections by Markdown headings; `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` headings count as context. A requirement counts only context headings, while scenarios, tests, ADRs and observation or meta facts count all prose. Context needs at least 12 words and a token-set Jaccard similarity below 0.8 against the title (and, for a requirement, `semantic_text`); symbols, flags, events and other fact kinds are exempt. New canonical rule `entity-context-missing` and advisory `entity-context-acknowledged` are registered, and `kb_upsert` (including dryRun) warns about the same finding. `requirementSemanticText` now excludes context sections, and every requirement authoring path writes `semantic_text` explicitly; the schema 8 migration pins it for existing requirements with the previous derivation so claim spans and hashes do not move. `kb_compile_intent` gains `context`, `sourceExcerpt` and `sourceReference` and renders statement, `## Context` and `## Source`; on update it replaces the statement and keeps the existing context sections byte for byte unless new context or source is supplied. `kb_plan_bootstrap` requires `excerpt` for `intent` and `observation` claims and persists it with the source title and reference in the created body. Search snippets come from the first context prose. Bundled skills `kibi-usage` 2.4.0 and `kibi-bootstrap` 3.4.0 document the per-type body contract and say never to invent a reason.

## 0.15.2

### Patch Changes

- 7f08632: Bootstrap no longer drops conditional claims ("If microphone access fails, the editor must ...") or obligations that mention a referent ("... any draft state that refers to it") as `invalid_write`; they become ready requirement candidates. Linking a scenario to an existing requirement with `kb_upsert` no longer requires resending its whole semantic inventory, and a review observation can quote the claim it is about without a `claim_key`. The bundled skills now show how to answer `provide_argument_bindings` from `kb_model` predicates and how to write scenarios from acceptance criteria.

  Technical summary: requirement steps built by `kb_plan_bootstrap`, the `kb_model` requirement path and typed logic plans take each inventory role from the semantic advisor (`advisorPropositionRole`), so the write-time proposition-complete check accepts what Kibi itself generated. The advisor classifies a clause as `definition` only when "means / is defined as / refers to / is called" is the main predicate of a sentence that asserts no obligation; inventories stored with the earlier `definition` role for such clauses still validate. `kb_upsert` on an existing `req` whose payload carries no `semantic_*` or `logic_claims` field and keeps the stored `title` and `text_ref` merges the stored ledger (and the stored `text_ref` when the payload omits it) before validation and writing; a payload that supplies ledger fields or changes the prose is checked as sent. The entity schema, the `kb_upsert` input schema and the Prolog shape check now let an `observation` or `meta` fact carry `claim_text` without `claim_key`; every other fact still needs both. `kibi-usage` 2.3.2 adds a predicate-binding retry example and a review observation payload; `kibi-bootstrap` 3.3.1 makes step 11 write scenarios from acceptance criteria with `assumes` links.

## 0.15.1

### Patch Changes

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

- 2c6ce25: `kb_search` with `sourceLocations` no longer reads complete entities for every entity in the given files. Results and rankings are unchanged; a file covered by many tests with long proof receipt histories now costs a fraction of the engine output it used to.

  Source-located intent candidates use the projected search-candidate rows through the new `kb_list_search_candidates/6` (type, source filter, limit, offset), which applies the same source filter as `kb_query_entities/8`. The separate full-entity source lookup used when a host lacks paged entity queries is removed, so every host loads the same candidate set.

## 0.15.0

### Minor Changes

- 89870c1: Bootstrap now checks its write actions before review and application, so ordinary require/forbid claims can be applied without malformed facts or semantic-inventory failures. Invalid and ungroundable claims remain cited authoring follow-ups; product intent receives priority over repository observations, and excluded or unreadable candidates are reported. Deterministic failures stop in a terminal journal with committed actions listed and guidance to re-plan; interrupted writes still recover.

  Encode polarity as an `eq` boolean `true` comparison with a require/forbid modifier in the shared strict builder, retaining existing stable IDs. Add writer-schema and semantic-inventory preflight, per-claim extraction diagnostics, task-list normalization, selection accounting, and terminal failure reporting through CLI/MCP status and result envelopes.

  Migration: KB schema 7 makes `strict-fact-shape` a blocking canonical check. Run `kibi migrate --yes`, then `kibi sync`. The migration rewrites legacy polarity-only property facts to the typed boolean encoding while preserving IDs, polarity, relationships, and document bodies. Other malformed strict facts require explicit correction; they are not treated as proof.

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

## 0.14.1

### Patch Changes

- 555cf95: Kibi's Prolog coverage runner now runs every test file named by `--test`. A failure in a later file fails validation, and its directory appears in annotated coverage output. This improves pre-release verification; the installed `kibi-core` Prolog modules are unchanged, and the SWI-Prolog bundle has not shipped yet.
  - kibi-core: add a regression for repeated test files and distinct coverage roots.
  - Coverage runner: enumerate all requested test files and their directories.

- db5376c: Status and lock-owner timestamps stay accurate when Kibi runs in a non-UTC timezone, and requirement proof now prefers receipts that match the current per-contract binding. Documentation and end-to-end test directories no longer make a knowledge base look stale.
  - Convert sync-file and lock-start timestamps to UTC before formatting the `Z` suffix and serialize lock-owner metadata as a JSON object.
  - Use binding-matched receipts when present, falling back to the snapshot receipts otherwise.
  - Ignore the `tests/e2e` and `tests/benchmarks` directories themselves during documentation freshness scans.

## 0.14.0

### Minor Changes

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

- f7c2d56: A full proof campaign spends much less time repeating the same packed test and rewriting the knowledge base once per receipt. Contracts that declare the identical command now share one execution, and the receipt campaign commits in batches instead of flushing the journal after every test. Selecting which tests to prove no longer loads every receipt history up front.

  Receipt source documents stay protected through the batched commit, and a failed batch restores every uncommitted document while preserving earlier committed batches.
  - Run each distinct proof-step command once and record that attempt on every contract that declared it.
  - Honor `KIBI_PROOF_STEP_CONCURRENCY` (default 1) when distinct commands can run together.
  - Reuse one snapshot-keyed compilation of the packed end-to-end suite across proof steps.
  - Commit proof-receipt upserts with `kb_commit_upsert_batch/2`, one transaction and one journal flush per batch of 25.
  - Select proof campaigns in bounded pages containing only test ids, contracts, and bindings; receipt histories remain unloaded.
  - Hold the workspace source lock through receipt publication and batched Prolog commits, and restore every uncommitted receipt source on failure.

- e5ab646: `kibi status` and every CLI command start faster on large knowledge bases. On
  this repository, `kibi status` for a fresh KB drops from about 3 seconds to
  about 1.7, and a command that needs neither schema validation nor symbol
  extraction starts about 0.5 seconds sooner.
  - `kb_status_json` skips the full-entity stale-reason scan when the KB is
    fresh, because a fresh verdict already rules out every stale reason.
  - `kibi-plugin-builtin` loads ts-morph (the TypeScript compiler) on first
    symbol analysis instead of at import time.
  - The CLI compiles its entity and relationship JSON schemas on first use.

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

- 9e17968: `kb_search`, `kb_query`, intent search, and bootstrap planning no longer fail with `ENOBUFS` once a project's proof receipt history grows large. Several discovery paths asked the engine for every candidate entity with all its properties, test receipt histories included, in a single answer. On this repository that answer is 8–14 MiB, past the engine's 8 MiB output cap, so even a `limit: 1` search for an existing requirement failed. Results and ranking are unchanged. Search candidates now carry only the fields ranking needs, and complete entities are loaded only for the page actually returned.
  - kibi-core: `kb_search_entities` returns projected candidate rows (identity, title, status, tags, source and coordinates, text fields). Receipt histories, proof contracts, and other large structured properties stay in the store. New `kb_list_search_candidates/5` (projected, paged listing) and `kb_entity_ids/1` (IDs without properties).
  - kibi-cli: `kb_search` with `fields: "full"` reloads only the returned page's complete entities by ID. Ports without the engine's indexed methods run the same bounded Prolog search through `query` instead of loading every entity.
  - kibi-cli: `kb_query` pages are fetched in bounded chunks (`ENTITY_QUERY_CHUNK_SIZE`, 25 rows) through the engine and through the non-engine fallback, which no longer materializes every matching entity before paginating.
  - kibi-cli: intent search's semantic scan uses the projected listing (same candidate bound), bootstrap generation enumerates IDs only, and symbol repair plans page the symbol inventory.

## 0.13.0

### Minor Changes

- f33a665: Proof failures now name the exact requirement, symbol, and why each `covered_by` candidate did not qualify, without changing what counts as proven. Agents can inspect a requirement with `kibi proof explain` and compare current proof state to the committed `proof/baseline.json` snapshot with `kibi proof impact`, instead of reverse-engineering Prolog or guessing from aggregate counts.
  - Keep `kibi.requirement-proof.v3` and add additive production-symbol `explanations` plus TEST `testResolutions` on the same Proof.
  - Ratchet `proof/baseline.json` to v2 with compact requirement fingerprints; aggregate counts stay the ratchet.
  - Add `kibi proof explain` and `kibi proof impact` as Proof projections, mixed-role leftovers in `symbol-traceability`, and advisory `proof-contract-symbols`.
  - Document the proof-regression workflow in `kibi-usage` 2.1.3.

### Patch Changes

- db07d8f: Proof diagnostics now agree with the Prolog decision: a structural type-shape unit contract is shown as qualifying, `kibi proof impact` compares against the Git HEAD baseline and exits 0 after a successful report, and mixed-role symbols fail the strict proof integrity gate.
  - Mode-aware candidate evaluation in Prolog; receipt fallback uses `test_receipt_evidence(Context, TestId, Evidence)`.
  - `proof impact` reads `HEAD:proof/baseline.json` with no worktree fallback; diagnostic exit 0.
  - Strict proof workflow and baseline checker include canonical `symbol-traceability`.

## 0.12.0

### Minor Changes

- e09882a: The KB check-rule catalog now has a single source of truth. Adding or renaming a validation rule previously required editing three places in lockstep (the TypeScript rule registry, the kb_check input schema, and the Prolog check dispatch) and a missed edit could silently produce a clean-looking check that ran nothing. All rule names, descriptions, enforcement classes, and Prolog predicate mappings are now defined once in `packages/core/schema/rule-registry.json`; a generator emits the TypeScript registry, the kb_check input enum, and the Prolog registry facts, and CI fails when the generated files drift. Selecting an unknown rule name in Prolog now fails loudly with a typed error instead of returning an empty result, and `strict-readiness` — already documented and implemented but missing from the input schema — is now a selectable kb_check rule.
- a379c9a: Requirements can no longer silently fall out of proof, and being out of scope is now stated, not hidden. `status: accepted` (the ADR vocabulary) used to compile fine, pass every check, and then quietly evaluate to `not_applicable` in the proof ladder — seven fully-wired requirements in one dogfood KB sat out of every proof report this way. Three fixes close that trap: a new canonical `req-status-vocabulary` check rule rejects requirement statuses outside `open|in_progress|closed` (legacy `active|approved` still accepted), out-of-scope coverage rows now carry a typed `proofStages.applicability.reason` (superseded, or "status 'accepted' is not a current requirement status"), and a first-class exemption (`proof_exempt: true` + required `proof_exempt_reason`) lets authors park current-but-not-E2E-provable requirements — architectural boundaries, toolchain gates — with their justification attached instead of abusing lifecycle statuses.

  The `productionSymbols` stage now explains itself: a bare `blocked` (the stale-receipts case that used to hide `uncoveredSymbols` behind an opaque word) reports a reason pointing at fresh `kibi prove` evidence, `missing` names the uncovered symbol count, and stage status and reason can no longer disagree because they come from one total clause. Coverage grows a proof-status filter (`coverage_report_json/11`) so `--status not_applicable` enumerates exactly the out-of-scope rows — with their reasons — instead of requiring hand-diffed exports; the summary still reflects the whole KB.

  Technical summary: `checks.pl` adds `check_req_status_vocabulary/1` wired into `check_all`, `check_all_with_options`, and `check_selected` as rule `req-status-vocabulary`; `requirement_proof.pl` adds exemption (`proof_exempt`/`proof_exempt_reason`) and exclusion-reason clauses before the ladder plus `production_stage_status/6` with typed reasons; `schema/entities.pl` declares the two req-only exemption properties; `discovery.pl` adds `coverage_report_json/11` with `req_row_proof_status_in/2` filtering over include-passing rows.

- 11ba1ef: The lock stewardship loop closes. `kibi engine janitor` now sweeps stale engine artifacts: branch-store lock journals whose recorded holder is provably dead are cleaned (journal + rdf lock), a live daemon stranded by a removed worktree is stopped and cleaned, and — with `--all` — runtime-directory sockets left by dead daemons anywhere on the machine are removed. The command reports by default and executes with `--apply`, printing one line per finding (holder pid, workspace, holder state, action). `kibi status` now surfaces a `store_lock_stale` stale reason when the current workspace's branch store carries a dead-holder journal, so the state is visible before it wedges an operation.

  This slice also completes the self-healing loop: the engine daemon's own attach path now performs the same classify-break-retry takeover as the CLI runtime, so a store locked by a crashed engine heals no matter which surface hits it first. Hardening from the code review: attach failures preserve the original error inside the structured context (a permissions problem is no longer re-branded as a lock with an unknown holder), the workspace watchdog requires two consecutive misses before stopping a daemon, and duplicated owner parsing/dead helpers were consolidated.

  Technical summary: `prolog/janitor.ts` adds `sweepStoreLock`/`sweepWorkspaceStoreLocks`/`sweepRuntimeSockets`/`runJanitor` with journal classification via the shared boot-id-aware holder check; `engine.ts` wires `retryAttachAfterBreakingStaleLock` (moved from cli-runtime to `prolog/store-lock.ts`) into the daemon attach and hardens the watchdog; `kb.pl` preserves the original attach error in `kb_store_locked/3` and journals unconditionally with a boot-id read fallback; `discovery-executors.ts` surfaces the `store_lock_stale` stale reason; new `engine janitor` subcommand with report/apply modes and seven behavior tests.

- 7de82d4: Proof receipts learn what they actually depend on. Opting in with `KIBI_PROOF_BINDING_MODE=per-contract`, each receipt now records a `binding_hash` — a digest of the test's proof contract plus its receipt-stripped authored document — and stays valid while that pair is unchanged, even as unrelated files, requirements, or symbol metadata change around it. A KB-only edit (a new covered_by link, a coordinate refresh) no longer invalidates every receipt in the repository, ending the re-prove-everything treadmill: only the tests whose own contract or document changed go stale, and a scoped `kibi prove --requirement …` refreshes exactly those. The default remains today's strict whole-snapshot binding; per-contract mode is strictly opt-in until it bakes in, and receipts written by older builds keep their snapshot semantics.

  Technical summary: `proof-fingerprint.ts` adds `receiptBindingHash` (contract hash + sha256 over the receipt-stripped document, versioned domain tag); `ingest-proof.ts` writes the optional `binding_hash` field at ingest; `proof-receipt.ts` accepts it as optional in schema and shape validation; `requirement_proof.pl` gains `requirement_proof_context/6` (binding mode + TestBindings dict) with `receipt_for_current_mode/4` selecting receipts by binding hash and falling back to snapshot matching for receipts without a binding hash; `discovery.pl` exposes `coverage_report_json/12` threading the mode and dict through; the coverage spec executor computes the bindings dict only when the opt-in env is set.

- c4c3832: "Access denied or KB locked" finally says who is holding the lock and heals itself when the holder is dead. Kibi engines now record an ownership journal (pid, workspace, boot id, started-at) at the branch-store root while they are attached, published atomically so concurrent readers never see a partial write. When a later attach fails because the store is locked, the error carries the holder's identity, and — when the holder is provably dead (a crashed or killed engine, a `git worktree remove --force`, a reboot) — Kibi breaks the stale lock automatically, reports the takeover, and continues instead of wedging every later operation behind an opaque permission error. Live holders are surfaced by name with the exact remediation ("close that session, or run `kibi engine stop` for its workspace") instead of a generic message.

  Engine daemons also stop outliving their workspace: a daemon whose workspace root disappears is now detected within thirty seconds and shuts down cleanly, releasing the store lock — the orphaned-daemon lock jam no longer requires manual `rdf/lock` cleanup.

  Technical summary: `kb.pl` writes `.kibi-lock-owner.json` on attach (removes it on `kb_detach`) and throws `permission_error(attach, kb_store, …)` with a `kb_store_locked(OwnerJson, LockDir)` context when `rdf_attach_db` cannot take the lock; the CLI error decoder parses that context into a typed `storeLocked` record; the CLI runtime attach path consults a new lock-stewardship module (`prolog/store-lock.ts`) that classifies holders via `kill(pid,0)` plus a Linux boot-id check (defending against PID reuse across reboots) and breaks locks only for provably dead holders; `engine.ts` adds a workspace watchdog interval that shuts the daemon down when its workspace root vanishes.

### Patch Changes

- d53e77a: Requirement proof reports now require every linked scenario to have qualifying,
  current passing end-to-end evidence. Missing, stale, failed, malformed, or
  contract-mismatched evidence remains visible as a blocking proof gap, while
  unit and integration helpers remain nonblocking ancillary evidence.
  - Evaluate receipt obligations per scenario and expose their diagnostics in
    `proofStages.passingE2e.scenarioObligations`.
  - Isolate the core Prolog fixture store per test process and verify two
    simultaneous process stores cannot observe each other's entities.

- 30dbb06: `kb_status` no longer wedges on large KBs after timestamp churn. Computing stale-source reasons ran one full entity-table scan per changed file, so a git checkout or branch switch that touched many authored files at once could make the status query — and every engine command that starts with it — hang for minutes on big knowledge bases. The status scan now builds the source-to-entity lookup in a single pass and finishes in about a second on the same state.

## 0.11.0

### Minor Changes

- 1ca62af: Kibi's public requirement-health report now makes its proof claims inspectable and trustworthy after the page has been sitting on disk or GitHub Pages. Proven no longer shares a card with blocking proof gaps, evidence ages stay honest in a static file, and the report header identifies the repository, branch, and commit when that metadata is available.
  - Classify extra verification-receipt issues as `proofAdvisories` when strict proof already exists; `proofGaps` remain blocking-only.
  - Preserve absolute evidence and generation timestamps, compute relative ages in the viewer, and link proof-chain sources from structured coordinates.
  - Present strict proof coverage, unmapped production symbols, requirements without implementation, proof-gate filtering, filter counts, a Kibi favicon, and a subtle getting-started CTA without loading network assets.

### Patch Changes

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

- 400e88c: Supersession writes now enforce tracked source history when Kibi is running through the journaled engine. Conservative proof also distinguishes executable production behavior from structurally tested TypeScript type shapes, keeping exported types traceable without pretending that erased declarations receive runtime E2E coverage.
  - Read target requirement provenance through the engine's typed entity projection.
  - Retain the raw Prolog fallback for compatible embedded callers.
  - Require E2E `covered_by` and runtime coordinates only for behavioral production symbols; retain type-shape ownership through real unit import contracts.

## 0.10.3

### Patch Changes

- Existing Kibi installations now receive an agent-guided migration workflow instead of opaque repair advice. Status, checks, and coverage expose one deterministic, hash-bound action plan; agents can safely apply only explicitly approved automatic repairs while semantic, proof, package, and operator work remains visible for review. This makes damaged or legacy KBs recoverable without direct `.kb` edits and gives every run an auditable post-application readback.
  - Add `kibi.migration-plan.v2` fragments to the 21-operation surfaces and support hash/action authorization in `kb_apply_plan` and `kibi migrate --apply-safe`.
  - Add lazy status/planning and deterministic schema, branch, storage, coordinate, and recovery action execution with workspace-root-safe CLI/MCP parity.
  - Refresh agent skills, traceability fixtures, and SkillOpt coverage for migration safety boundaries and five-axis closeout reporting.

## 0.10.2

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

## 0.10.1

### Patch Changes

- Dogfood projects now get branch-local knowledge bases that follow the exact Git ref, actionable stale-source diagnostics, and a sanctioned relationship cleanup path. Verification receipts and packed package provenance are stricter and reproducible, while agents receive conservative symbol-recovery guidance and explicit interim-state signals. This prevents silent `master`/`main` drift and makes passing E2E evidence distinguishable from complete semantic proof.
  - Remove implicit branch-name normalization and add previewed legacy branch migration.
  - Add exact relationship deletion, v2 receipt/schema parity, status diagnostics, dogfood package manifests, and SkillOpt cases.

- 7ddbaff: Dogfood projects can now resume proof work without losing their declared test intent. Test entities persist a typed verification contract, workspace snapshots ignore receipt-only churn consistently, and the sync guard no longer mistakes quoted requirement prose for executable escape hatches. Explicit ontology gaps remain unresolved rather than being reported as missing logical proof.
  - Persist and validate `verification_contract.v1` through extraction, mutation, sync, and staged traceability KBs.
  - Version the receipt-stable workspace snapshot as `kibi.workspace-snapshot.v2`.
  - Make logic coverage inventory-aware and support Prolog-encoded semantic inventories.

## 0.10.0

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

## 0.9.1

### Patch Changes

- Upserts now finish as one bounded commit, so an entity, its relationships, audit history, and branch snapshot succeed or fail together. Historical audit journals no longer remain locked after a write, and stale runtimes receive a clear restart instruction instead of hanging indefinitely. Timed-out Prolog work is terminated and reaped, including the process group, so later Kibi operations can continue safely.
  - Add `kb_commit_upsert/5` with branch-lock, snapshot, audit-lock, stage-marker, and single-save handling.
  - Attach persistent audit stores with `sync(close)` and use non-blocking stale-lock probes.
  - Route CLI upserts through the combined commit goal and manage Bun one-shot children asynchronously with TERM/KILL escalation.

## 0.9.0

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

## 0.8.1

### Patch Changes

- Kibi's Prolog rule-safety checks now load without emitting a singleton-variable warning. This keeps validation output clean while preserving the same rule-cycle diagnostics.
  - Rename the intentionally unused rule-property binding in the unstratified-negation check.

## 0.8.0

### Minor Changes

- a52b592: Kibi can now turn a requirement’s assertive prose into reviewable, typed logical models while keeping the original wording for people. Conditional rules, obligations, permissions, prohibitions, exceptions, bounded quantities, and temporal qualifiers are validated before they enter the knowledge base, and contradictions can report structured witnesses instead of relying on executable text. Existing requirements remain compatible and can be migrated or backfilled deliberately.
  - Add versioned `kibi.logic.v1` IR, safe bounded Prolog interpretation, rule schemas, rule facts, provenance, and contradiction checks.
  - Extend the semantic advisor with proposition inventories, typed alternatives, source spans, shadow audits, and logic apply plans.
  - Preserve rule fields and `requires_rule` through CLI, MCP, Markdown, Prolog, and schema validation surfaces.
  - Add rule safety, rule verifiability, and semantic completeness checks plus schema-v4 migration metadata.

### Patch Changes

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

## 0.7.1

### Patch Changes

- 28dba1f: Kibi status no longer reports a fresh snapshot as stale just because the repository contains ordinary Markdown notes. Entity-shaped documentation is still tracked for freshness, while generic notes remain informational.
  - Restrict Prolog freshness scans to Markdown files with Kibi entity frontmatter.

## 0.7.0

### Minor Changes

- f1db710: Coverage reports now explain how deep each requirement's test evidence goes without changing existing covered/uncovered semantics. CLI users and MCP clients can distinguish direct passing e2e evidence, scenario-backed e2e evidence, unit-only evidence, nonpassing test evidence, scenario-only coverage, and no evidence at all. Typed test verification fields are honored before legacy e2e tag/path heuristics, so modern test metadata produces more reliable coverage labels.

  Technical summary:
  - Add additive `coverageDepth` / `coverage_depth` fields and coverage evidence lists to requirement coverage rows.
  - Classify coverage depth from direct requirement tests, scenario tests, test statuses, and typed `verification_scope` values.
  - Surface coverage depth in CLI table output and MCP structured coverage results while preserving existing summary and `coverageStatus` fields.
  - Allow typed `verification_scope` and `verification_perspective` test fields through CLI/MCP entity schemas and MCP upsert serialization.

### Patch Changes

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

## 0.6.5

### Patch Changes

- Symbol metadata writes now work consistently through MCP and the underlying Prolog schema. Agents can create source-linked symbol entities with `symbol_role` and `granularity_reason` metadata without hitting a transaction failure after JSON validation succeeds. This keeps behavioral-anchor traceability usable from the MCP-first workflow.

  Technical summary:
  - Add `symbol_role` and `granularity_reason` to the Prolog entity schema copies shipped by `kibi-core` and `kibi-cli`.
  - Serialize `granularity_reason` as a Prolog atom in `kb_upsert` transactions.
  - Add Prolog and MCP regression coverage for symbol metadata fields.

## 0.6.4

### Patch Changes

- 71fcf0b: Symbol-coverage checks no longer false-flag production symbols when other requirements in the same knowledge base have scenarios. Previously, the direct req→test fallback path evaluated negation before binding the requirement ID, so populated graphs could report missing coverage even when `covered_by`, `verified_by`, and semantics were all correct.
  - Reorder `test_covers_requirement/2` subgoals in `packages/core/src/kb.pl` so `requirement_verified_by_test/2` binds `Req` before `requirement_test_fallback_allowed/1` runs NAF.
  - Add `production_symbol_coverage_works_with_unbound_req_when_other_reqs_have_scenarios` regression test in `packages/core/tests/kb.plt`.

## 0.6.3

### Patch Changes

- **Fix reverse relationship lookups in the knowledge base.**

  Previously, querying a relationship with a bound target ID but an unbound source ID (for example, "which requirement does this test verify?") could fail silently. That broke traceability paths that rely on `verified_by` edges — symbol coverage checks and MCP reverse relationship queries could miss valid links even when the data was present.

  **Changes:**
  - **`packages/core/src/kb.pl`**: Add shared `entity_id_to_uri/2` and `entity_uri_to_id/2` helpers; rewrite `kb_relationship/3` to branch on bound source/target IDs (forward, reverse, exact, and enumerate modes); align relationship assert and entity URI builders to the same canonical prefix notation.
  - **`packages/core/tests/kb.plt`**: Add reverse `verified_by` lookup and `production_symbol_covered_for_requirement` coverage tests for the `verified_by`-only path.

## 0.6.2

### Patch Changes

- c810f5f: Symbol-coverage violations now explain that direct `verified_by(Req,Test)` and `validates(Test,Req)` relationships may be blocked when a requirement uses scenarios. The diagnostics now tell you to use `verified_by(Scenario,Test)` or `validates(Test,Scenario)` instead, depending on your test graph.

  This change improves check clarity when requirements are tied to scenarios, and it shortens the fix cycle for missing or blocked coverage.
  - `kibi-core`: improved symbol-coverage diagnostics in `checks.pl` to reflect scenario-aware coverage rules.
  - Added regression coverage in tests for direct requirement-to-test coverage checks with scenarios.

## 0.6.1

### Patch Changes

- 7f4d51e: Kibi now uses more of SWI-Prolog's maintained standard library to make graph reporting clearer and to pilot derived validation facts internally. MCP users also get an opt-in remote SPARQL query tool for querying external RDF endpoints without changing Kibi's local RDF storage model. The new SPARQL surface is explicitly remote-only, validates HTTP(S) endpoints, and keeps network-dependent behavior outside the normal local KB query path.
  - Refactored Prolog relationship counting to use `library(aggregate)`.
  - Added an isolated CHR-derived facts pilot module for bounded validation facts.
  - Added a remote SPARQL client wrapper and `kb_sparql_remote` MCP tool.

## 0.6.0

### Minor Changes

- Kibi can now start representing project-local ontology claims as structured predicate facts instead of prose-only notes. This is the first compatibility slice toward richer domain modeling: teams can define predicate schemas and store ground predicate claims while existing strict property facts continue to work unchanged.

  Add predicate ontology fact fields to the CLI entity schema, public schema export, TypeScript fact types, and Prolog schema validation. The new supported fact lanes are `predicate_schema` and `predicate`, with fields for predicate names, namespaces, arity, arguments, aliases, examples, and predicate polarity.

## 0.5.3

### Patch Changes

- Kibi now supports fully automated requirement modeling and schema migrations, allowing repositories to stay up-to-date with the latest contradiction-safe modeling standards without manual intervention. The new system enforces strict readiness levels for requirement/fact pairings and automatically downgrades low-confidence claims to non-blocking observations to ensure high precision in conflict detection.
  - add `kibi migrate` command for automated KB schema upgrades
  - implement strict readiness checks and confidence-based modeling lanes
  - update MCP guidance and CLI documentation for automated contradiction workflows
  - extend inference rules to support v1 contradiction semantics (exact-value, range, polarity)

## 0.5.2

### Patch Changes

- 699a482: Create append-only contract documentation and release metadata for the Kibi briefing schema-2.0 session-delta migration. This update introduces high-fidelity change tracking anchored to the session start, prioritized change narratives for MCP-cited entities, and deterministic filename-based brief selection for VS Code.

## 0.5.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 3a11e57: Fix `kibi status` JSON serialization before first sync and add `kibi-mcp --help` output
- 0ec1cb1: Accept `sourceFile` as an optional entity property during `kb_upsert`.
  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

## 0.5.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

## 0.4.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 7111197: Accept `sourceFile` as an optional entity property during `kb_upsert`.
  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

## 0.4.0

### Minor Changes

- 0c2c1e7: feat(traceability): document comment-free test workflow with validation parity
  - Add relationship-first traceability guidance: prefer split semantics with `implements` for production ownership, `covered_by` for production coverage, and `executable_for` plus `verified_by`/`validates` for test identity and verification instead of relying only on inline `// implements REQ-xxx` comments
  - Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
  - Synchronize guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
  - Staged enforcement now supports explicit KB relationships in addition to inline comments
  - Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check

## 0.3.0

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

## 0.1.10

### Patch Changes

- 4e05344: Synchronize core status semantics with the documented entity-specific lifecycle values so requirement and ADR derivations treat canonical states like `open`, `in_progress`, `closed`, `accepted`, `deprecated`, and `superseded` consistently.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.

## 0.1.9

### Patch Changes

- 29de3fa: Bump patch version for safe release

## 0.1.8

### Patch Changes

- Fix `kb_entities_by_source` Prolog predicate to use `source=` (matching entity property format) instead of `source-`, and normalize source values via `source_value_atom/2` to handle both atom and string types.

  This resolves inconsistent `kb_query` results when filtering by `sourceFile`.

## 0.1.7

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions
  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior
