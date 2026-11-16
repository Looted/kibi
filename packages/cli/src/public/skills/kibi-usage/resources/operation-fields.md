# Kibi Operation Fields

Generated from the public `OperationSpec` catalog by `scripts/generate-operation-fields.ts`. The MCP tool list advertises these input fields with a short description, or leaves them out (the specialist fields of a `kb_upsert` entity, which stay valid input); this is the full rule for each. Fields not listed are advertised in full.

## `workspaceRoot` (every MCP tool)

- `workspaceRoot`: Optional absolute path of the workspace this call is about when it differs from the one the server started in, for example the git worktree you are working in. The server answers from that workspace's knowledge base when it is a worktree of the same repository or lies under the client's MCP roots; otherwise it answers from its own workspace and adds a workspace_mismatch diagnostic. Host hooks fill this in automatically where available.

## `kb_query` (`kibi query`)

- `kb`: Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.
- `factKind`: Typed fact filter: list facts of one kind with their typed fields. 'predicate_schema' returns the catalog of askable predicates (argument names, constants, fact counts). Example: 'predicate_schema'.
- `predicate`: Typed fact filter: predicate name to ask about, e.g. 'has_role' or 'permission_rule'. Combine with where for named arguments. Returns every stored fact of that predicate with its arguments, polarity and allow/deny effect.
- `where`: Named argument values for predicate, order-free, using the argument names from the predicate's schema. Example: {actor: 'admin', decision: 'allow'}. An unknown name returns a warning with the declared names; no match returns the values that do exist.
- `args`: Positional argument values for predicate when it has no schema; null matches any value. Example: ['admin', null, null, 'allow']. Prefer where.
- `distinct`: Optional argument name to count distinct values of across the matching predicate facts, e.g. distinct: 'role' with predicate 'has_role' and where {user: 'alice'} answers how many roles alice has.
- `subjectKey`: Typed fact filter: dotted subject key whose property facts to list, e.g. 'user.role_assignment'. Combine with propertyKey for one property, or with factKind 'subject' for the subject's domain view.
- `includeBody`: With id only: also return the entity's authored Markdown body (the prose after its front matter) as body {id, path, text}, so a stale statement in it can be corrected; kb_upsert document.body replaces it. Default: false.

## `kb_search` (`kibi search`)

- `kb`: Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.
- `limit`: Optional max rows to return after ranking. Default: 10; raise it or page with offset when the answer layer is not enough.
- `rankingMode`: Optional deterministic ranking mode. Default intent-v1: question-aware ranking with semantic facets, source-aware evidence, graph boosts, superseded demotion and abstention. Use legacy for the older lexical ranking.
- `answer`: Intent-v1 only, first page only. When true (default) the result includes an answer layer: current governing requirements with their linked facts, scenarios, tests and ADRs, superseded requirements listed separately, and observation facts labelled as notes. Bounded in size; discovery, not proof.
- `hints`: Intent-v1 only, first page only. When true (default) and the project activates a kibi.search-hints.v1 plugin, a weak or abstained answer adds queryAnalysis.hints: requirements the question may mean, to re-ask with. Hints never change results or the answer layer.
- `semanticFacets`: Optional host-agent semantic interpretation. Kibi uses these strings as deterministic aliases/facets; ranking never calls a model.
- `fields`: Optional result detail. 'summary' returns identifying metadata plus the match snippet for discovery. Use 'full' to include complete entity bodies, or follow up with kb_query for the exact entities you need.

## `kb_status` (`kibi status`)

- `kb`: Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.

## `kb_find_gaps` (`kibi find-gaps`)

- `kb`: Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.
- `missingRelationships`: Relationship types the entity must have none of, in either direction, for example specified_by or verified_by. verified_by and validates satisfy each other.
- `tags`: Keep entities carrying any of these metadata tags. Bootstrap provenance stubs appear in rows only when this names bootstrap:provenance-stub.

## `kb_coverage` (`kibi coverage`)

- `kb`: Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.
- `by`: Report shape: req gives per-requirement proof status and a repair plan, symbol gives per-symbol ownership coverage, type gives counts per entity type.
- `statuses`: Requirement proof-status filter (req mode): include only rows whose proofStatus is listed. Selecting statuses implies include-passing; not_applicable rows carry their typed applicability reason in proofStages.applicability.reason. The summary always reflects the whole KB.

## `kb_graph` (`kibi graph`)

- `kb`: Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.
- `relationships`: Relationship types to follow, for example specified_by, verified_by or implements. Omit to follow every relationship type.
- `entityTypes`: Keep only nodes of these types (req, scenario, test, adr, flag, event, symbol, fact) in the result, and the edges between them. Traversal still passes through other types.

## `kb_semantic_advisor` (`kibi semantic-advisor`)

- `clauses`: Optional complete list of atomic requirement clauses supplied by the caller. Each clause must be a verbatim fragment of text (whitespace may differ); a clause that does not occur in text fails the call with VALIDATION_FAILED naming it. Use this for compound prose so every normative clause receives a stable claim key and independent grounding review.
- `interpretations`: Optional host-LLM typed kibi.logic.v1 interpretations. Kibi validates and canonicalizes them; raw Prolog is not accepted.
- `type`: Entity type context for analysis. Requirement, domain-fact, and supporting prose all receive a proposition ledger; only requirements receive deterministic modeling suggestions.

## `kb_model_requirement` (`kibi model-requirement`)

- `source`: Optional primary source path or provenance root used for stable IDs and text refs. Example: '.kb/requirements/customer-retention.md'.
- `confidence`: Confidence score for the extracted claim. >= 0.70 yields strict-lane output; lower confidence yields observation-only review output.
- `operator`: Optional extracted semantic claim operator. Use gt/lt for strict bounds ('greater than zero' is gt 0, not gte 0). A set claim takes a list value with eq (exactly these), includes (at least these), subset_of (only these) or excludes (none of these); matches takes a regular expression string. Example: 'eq'.
- `value`: Optional extracted semantic claim value: a string, number or boolean, or a list of strings for a set claim. Example: ['requireAuth'] with operator includes.
- `provenance`: Optional extracted text reference. Falls back to source when omitted. Example: '.kb/requirements/customer-retention.md#L1'.
- `existingLogicClaims`: Existing requirement logic_claims values. The returned requirement update merges the new atomic claim key into this manifest instead of replacing prior claims.
- `requirementId`: Optional requirement ID. The strict write set updates this requirement instead of minting a REQ-AUTO id, and a typed logic rule attaches its requires_rule relationship to it.

## `kb_suggest_predicates` (`kibi suggest-predicates`)

- `text`: Required prose requirement or claim to classify into ontology predicates. Example: 'When users navigate away, draft edits must auto-save.'.
- `requirementId`: Optional existing requirement ID. When provided, the response includes a relationshipPlan describing the req -> fact requires_predicate link to attach after preserving existing requirement metadata.
- `includeExistingSchemas`: Whether to include existing KB fact_kind=predicate_schema facts alongside Kibi's built-in predicate catalog. Default: true.
- `schemaId`: Optional exact reviewed predicate schema ID. When supplied, Kibi selects that schema instead of lexical rank order and fails closed if it is unavailable.
- `argumentBindings`: Optional exact predicate argument values keyed by a candidate schema's argument_names. Required before applying a candidate whose binding_status is incomplete; Kibi never substitutes guessed values for unbound arguments.
- `polarityHint`: Optional reviewed polarity override for claims whose surface negation does not express predicate denial. Use only after reviewing the selected schema and full claim scope.
- `existingLogicClaims`: Existing requirement logic_claims values. Returned relationship guidance includes a merged manifest so repeated clause modeling does not discard earlier claims.

## `kb_model` (`kibi model`)

- `clauses`: Optional complete list of atomic requirement clauses supplied by the caller. Each clause must be a verbatim fragment of text (whitespace may differ); a clause that does not occur in text fails the call with VALIDATION_FAILED naming it. Use this for compound prose so every normative clause receives a stable claim key and independent grounding review.
- `interpretations`: Optional host-LLM typed kibi.logic.v1 interpretations. Kibi validates and canonicalizes them; raw Prolog is not accepted.
- `type`: Entity type context for analysis. Requirement, domain-fact, and supporting prose all receive a proposition ledger; only requirements receive deterministic modeling suggestions.
- `source`: Optional primary source path or provenance root used for stable IDs and text refs. Example: '.kb/requirements/customer-retention.md'.
- `requirementId`: Optional requirement ID. The strict write set updates this requirement instead of minting a REQ-AUTO id, and a typed logic rule attaches its requires_rule relationship to it.
- `includeExistingSchemas`: Whether to include existing KB fact_kind=predicate_schema facts alongside Kibi's built-in predicate catalog. Default: true.
- `schemaId`: Optional exact reviewed predicate schema ID. When supplied, Kibi selects that schema instead of lexical rank order and fails closed if it is unavailable.
- `argumentBindings`: Optional exact predicate argument values keyed by a candidate schema's argument_names. Required before applying a candidate whose binding_status is incomplete; Kibi never substitutes guessed values for unbound arguments.
- `polarityHint`: Optional reviewed polarity override for claims whose surface negation does not express predicate denial. Use only after reviewing the selected schema and full claim scope.
- `existingLogicClaims`: Existing requirement logic_claims values. The returned requirement update merges the new atomic claim key into this manifest instead of replacing prior claims.
- `confidence`: Confidence score for the extracted claim. >= 0.70 yields strict-lane output; lower confidence yields observation-only review output.
- `operator`: Optional extracted semantic claim operator. Use gt/lt for strict bounds ('greater than zero' is gt 0, not gte 0). A set claim takes a list value with eq (exactly these), includes (at least these), subset_of (only these) or excludes (none of these); matches takes a regular expression string. Example: 'eq'.
- `value`: Optional extracted semantic claim value: a string, number or boolean, or a list of strings for a set claim. Example: ['requireAuth'] with operator includes.
- `provenance`: Optional extracted text reference. Falls back to source when omitted. Example: '.kb/requirements/customer-retention.md#L1'.

## `kb_plan_bootstrap` (`kibi plan-bootstrap`)

- `includeGenericMarkdown`: Whether to include generic markdown file content as candidate facts. Default: true, or false when bootstrapContext declares intentClaims (the declared sources already carry the intent); set it explicitly to override.
- `maxCandidates`: Budget for candidates Kibi discovers itself (symbols, tests, repository documents). Declared intentClaims sit outside it: they are never capped and never use its slots. Clamped to [1, 200]. Default: 50.
- `bootstrapContext.knowledgeSources`: Knowledge sources outside the code that the human confirmed during the bootstrap interview (issue trackers, wikis, specs, decision logs). Kibi never contacts them; the agent reads them through its own connectors and cites them from intentClaims. Bound into the plan hash.
- `bootstrapContext.knowledgeSources[].authority`: The human's call: authoritative claims become higher-confidence candidates, supporting claims lower ones, and stale sources are cited but never produce candidates.
- `bootstrapContext.knowledgeSources[].component`: Optional component this source's claims are about (for example recorder). It becomes the first segment of each generated subject_key (component.aspect); a claim's own component overrides it.
- `bootstrapContext.intentClaims`: Statements the agent harvested from knowledgeSources, each citing its source. Intent claims (the default kind) that the strict modeler can ground become cited req candidates; the rest become explicit authoring follow-ups. Observation and open_question claims never become requirements: they become cited fact candidates with fact_kind observation, open questions tagged review:open-question. Every intent and observation claim needs an excerpt: the created entity's body keeps the statement, then a '## Source' section with the blockquoted excerpt, the source title and the reference. Bound into the plan hash.
- `bootstrapContext.intentClaims[].excerpt`: Verbatim passage from the source the claim came from. Required for intent and observation claims (optional for open_question): Kibi persists it with the knowledge source title and reference in the created entity's '## Source' section, because the ticket or page may be gone by the next migration.
- `bootstrapContext.intentClaims[].component`: Optional component the claim is about (for example recorder). Generated subject keys take the shape component.aspect with the aspect from the claim's subject. Without a component on the claim or its knowledge source, a claim whose subject is not a single word or already dotted becomes an authoring follow-up with a diagnostic instead of a malformed subject key.
- `bootstrapContext.intentClaims[].rationale`: Optional reason the requirement exists, as the source states it or the human answered when asked. It becomes the requirement's rationale and its body's '## Context' section. Never invent one.
- `bootstrapContext.intentClaims[].kind`: intent: intended behavior (may become a req). observation: how things are today, without stating intent. open_question: something the sources leave undecided. Default: intent.
- `bootstrapContext.conflicts`: Contradictions the agent found between declared intentClaims and leaves for the human to resolve. Each becomes a cited fact candidate with fact_kind observation tagged review:conflict. Every claimReference must match a declared claim's sourceId and reference. Bound into the plan hash.

## `kb_validate_upsert` (`kibi validate-upsert`)

- `plannedFacts`: dryRun only. Fact upsert payloads (type, id, properties, optional relationships) that will be written before this payload, typically the applyPlan entries kb_model returned. They are validated in order and staged with the payload, so a requires_predicate or requires_property target that does not exist yet resolves, its claim_key is read from the plan, and the contradiction preview runs against the KB as it would be after the whole batch (result: stagedFacts, whatIf). A conflict the batch would introduce, such as an allow and a deny permission_rule on the same key, is refused as the commit would refuse it. Rejected without dryRun: write the facts first.
- `plannedFacts[].relationships`: Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` for strict property facts or `requires_predicate` for ontology predicate facts. Side effect: asserts edges in KB.
- `plannedFacts[].relationships[].type`: Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req/scenario->test, executable_for symbol->test).
- `document`: Optional source-first document write. Paths are workspace-relative; omit body when updating to preserve the existing body bytes (a requirement whose semantic_text changes gets the new statement in place of the old one, with its context sections kept). For a new requirement pass a sectioned body: statement, '## Context' (why, who asked, constraints), '## Source' (blockquoted excerpt and reference); context never changes the checked meaning, which stays in semantic_text.

## `kb_upsert` (`kibi upsert`)

- `id`: Unique entity ID (string). Example: 'REQ-cli-gc'. Name entities by the behavior they govern (<TYPE>-<area>-<behavior>), never by the next free number. Existing ID updates the entity; new ID creates it.
- `properties`: Entity fields to persist. Must include title and status. If created_at, updated_at, or source are omitted, server fills defaults.
- `properties.status`: Required lifecycle state. Allowed values depend on entity type; backward-compatible legacy statuses are also accepted. Examples: 'open', 'passing', 'accepted', 'active'.
- `properties.source`: Optional provenance string. Example: '.kb/requirements/REQ-cli-gc.md'. Defaults to 'mcp://kibi/upsert'.
- `properties.owner`: Optional owner name/team. Example: 'platform-team'.
- `properties.severity`: Optional severity label. Example: 'critical'.
- `properties.origin`: Optional provenance: who authored the entity (kind: human, agent, migration, import) and on what authority (ref, approved_by, recorded_at). Omit it to keep an existing entity's origin; a new entity written without one is recorded as {kind: agent, recorded_at: <write time>}. A supplied origin without recorded_at gets the write time.
- `properties.semantic_text`: Requirement-only authored prose used for semantic inventory hashes and UTF-8 spans. Keep text_ref available for independent document or code evidence.
- `properties.logic_claims`: Requirement-only manifest of every atomic normative claim key returned by kb_model mode analyze (CLI: kibi model). A requirement is logic-complete only when every key is grounded by a linked property_value or predicate fact with the same claim_key.
- `properties.semantic_clauses`: Optional complete atomic decomposition used by kb_model mode analyze and proposition-complete ingestion. Preserve it when automatic sentence splitting needs a reviewed override.
- `properties.semantic_inventory_version`: Requirement-only proposition ledger contract version returned by kb_model mode analyze (CLI: kibi model).
- `properties.semantic_source_field`: Requirement field whose exact UTF-8 bytes anchor semantic_inventory spans.
- `properties.approved_by`: Requirement-only. The human who approved this exception requirement. An exception that exempts a requirement and is specified_by a success scenario makes that scenario feasible only when approved_by is set.
- `properties.failure_side_waiver`: Requirement-only. Why the requirement has no failure side to test (its claims state a capability or output shape). Waives happy_path_only once failure_side_waiver_approved_by is set.
- `properties.failure_side_waiver_approved_by`: Requirement-only. The person who accepted failure_side_waiver.
- `properties.firmness`: req/adr only. firm = a human stated it as a rule (needs origin.ref to their words); its title, meaning or firmness changes only with new human words (a new origin.ref) or by supersede. default = delegated or agent choice; exploratory = flagged guess. Absent = default if an agent wrote it, else firm.
- `properties.required_evidence`: Requirement-only. Weakest evidence level it accepts; the evidence-floor rule fails below it. Absent = tested if firm, else unverified.
- `properties.rationale`: Requirement-only. Why the requirement exists, in one or two sentences in the words of whoever stated the intent. Send it in the same write whenever they gave a reason, and never write one of your own; not part of the checked meaning.
- `properties.exempts_claims`: Requirement-only. Claim keys of the exempted requirement whose constraints this exception waives; omit to waive the whole requirement.
- `properties.semantic_source_hash`: SHA-256 of the exact semantic source text returned in the advisor inventory contract.
- `properties.granularity_reason`: Optional justification for a coarse file/module-level symbol traceability relationship when narrower function/class/type symbols exist.
- `properties.verification_scope`: Optional typed verification scope for test entities. Example: 'end_to_end'.
- `properties.verification_perspective`: Optional typed verification perspective for test entities. Example: 'consumer'.
- `properties.proof_contract`: Semantic proof contract binding this test to explicit proof obligations executed by one configured integration.
- `properties.proof_bindings`: Optional native-runner bindings (native ids, aliases, source coordinates) for proof obligations. Bindings are provenance metadata and never replace the semantic contract.
- `properties.proof_receipts`: Append-only proof evidence. Proof accepts only the newest valid passed receipt bound to the current code snapshot, current contract hash, and effective execution fingerprint within the seven-day freshness window. Ingest rotates the oldest entries at the cap.
- `properties.fact_kind`: Optional fact lane kind for fact entities. Strict lane uses 'subject' and 'property_value'; context lane uses 'observation' or 'meta'; ontology lane uses 'predicate_schema' or 'predicate'. Use kb_model (mode requirement or predicates) when starting from prose.
- `properties.subject_key`: Snake_case only. Optional canonical subject key for strict fact entities. Example: 'user.session'. Do not use subjectKey in kb_upsert.properties.
- `properties.property_key`: Snake_case only. Optional canonical property key for property_value facts. Example: 'session.timeout_minutes'. Do not use propertyKey in kb_upsert.properties.
- `properties.operator`: Optional comparison operator for property_value facts. Example: 'eq'. 'matches' (string facts only): value_string is a JavaScript regular expression (u flag) every value must match as a whole. Set facts only: 'includes' means every member of value_set has the property and other members may have it too; 'subset_of' means every member that has the property is in value_set ('every env var the server reads is one of ...'); 'excludes' means no member of value_set has it ('never imports md5'); 'eq' on a set means exactly those members.
- `properties.value_type`: Optional typed value discriminator for property_value facts. Pair with exactly one value_string, value_int, value_number, value_bool, or value_set (set: a list of members, with operator eq, includes, subset_of or excludes); do not use generic value.
- `properties.value_string`: Optional string value for property_value facts.
- `properties.value_int`: Optional integer value for property_value facts.
- `properties.value_number`: Optional number value for property_value facts.
- `properties.value_bool`: Optional boolean value for property_value facts.
- `properties.value_set`: Optional exact set of values for property_value facts with value_type set, such as the members a domain must have.
- `properties.unit`: Optional unit for numeric property_value facts.
- `properties.scope`: Optional scope qualifier for fact entities.
- `properties.polarity`: Optional polarity for property_value or predicate facts.
- `properties.closed_world`: Optional closed-world marker for strict fact interpretation.
- `properties.canonical_key`: Optional canonical identity key for predicate or strict fact claims.
- `properties.claim_key`: Stable key of the atomic prose clause grounded by this fact, derived from claim_text. Optional: when omitted, Kibi derives it; when sent, it must equal the derived key.
- `properties.claim_text`: Exact atomic requirement clause represented by this fact, retained for human audit. On a grounding fact Kibi derives claim_key from it; an observation or meta fact quotes the clause it is about without a key.
- `properties.dimension_waiver`: Fact-only. Why the quantifier word in claim_text ranges over nothing, so the claim needs no count, set or rule. Waives dimension_unrepresented once dimension_waiver_approved_by is set.
- `properties.dimension_waiver_approved_by`: Fact-only. The person who accepted dimension_waiver.
- `properties.case_waiver`: Fact-only. Why the edge cases derived from this fact are covered some other way or cannot occur. Waives uncovered_case once case_waiver_approved_by is set.
- `properties.case_waiver_approved_by`: Fact-only. The person who accepted case_waiver.
- `properties.predicate_name`: Optional predicate name for ontology predicate facts. Prefer kb_model mode predicates before hand-writing predicate_name.
- `properties.predicate_args`: Optional ordered predicate arguments for ontology predicate facts. Prefer kb_model mode predicates before hand-writing predicate_args.
- `properties.predicate_namespace`: Optional namespace for a project-local predicate schema.
- `properties.predicate_arity`: Required arity for predicate_schema facts.
- `properties.argument_names`: Ordered argument role names for predicate_schema facts.
- `properties.argument_types`: Ordered argument types for predicate_schema facts.
- `properties.argument_descriptions`: Optional ordered argument explanations.
- `properties.key_arguments`: predicate_schema only: argument names that determine the remaining arguments (a functional dependency), e.g. ["sensor"] for reading(sensor, value). Rule contradiction analysis treats two atoms with identical keys as the same fact; without it the predicate is multivalued and opposing rules stay unresolved instead of disjoint.
- `properties.argument_constants`: predicate_schema only: allowed constants keyed by argument name, e.g. {"severity": ["warning", "info"]}. Predicate facts must use a listed constant for those arguments; unlisted arguments stay open.
- `properties.argument_aliases`: predicate_schema only: legacy spellings keyed by argument name, each mapped to a declared constant, e.g. {"severity": {"warn": "warning"}}. kibi migrate rewrites facts that still use an alias.
- `properties.aliases`: Optional vocabulary aliases for predicate discovery.
- `properties.examples`: Optional ground-term examples for a predicate schema.
- `properties.part_of`: subject only: defined subject keys this subject is a part of. A dotted key prefix that is itself a defined subject is broader already.
- `properties.kind_of`: subject only: defined subject keys this subject is a kind of (a read-only review is a kind of review view).
- `properties.distinct_from`: subject facts: similar defined subject keys this subject was checked to differ from; property_value facts: subject_key.property_key of value facts that state a different quantity. The body says how. Silences subject-duplicate or quantity-duplicate for those pairs.
- `properties.semantic_inventory`: Requirement proposition ledger returned by kb_model mode analyze (CLI: kibi model); preserve entries while modeling each assertive span. An unmodeled normative, condition, exception or definition entry must carry `subjects`: the defined subject keys it is about.
- `properties.pair_reviews`: Requirement only: verdicts on stored pairs (a relates_to edge or a shared subject) whose unmodeled claims cannot be modeled. Each entry: with (the other requirement, which a relates_to edge must link), verdict (no_conflict with separated_by naming the condition or term that separates them; interacts with resolved_by naming what resolves it: a scenario either requirement is specified_by, a fact either links, a third current requirement, or a condition or exception claim_key of either, never the two requirements themselves; conflict, which stays blocking until a person decides), claims (the claim_key of each unmodeled claim; a payload_hash is accepted and ignored) and origin (kind human or agent; on a must or firm pair, a verdict whose origin is missing or agent, or that sits on a requirement an agent wrote, counts only with approved_by from a person). Model the claims first; a verdict is the fallback.
- `properties.rule_ir`: Schema-validated kibi.logic.v1 rule IR. It is persisted as data and never executed as caller-supplied Prolog.
- `properties.rule_hash`: Deterministic hash of canonical rule_ir.
- `properties.rule_schema_id`: Rule schema fact ID used to validate this rule.
- `properties.rule_name`: Stable rule schema name.
- `properties.semantic_key`: Canonical semantic identity of the normalized logical model.
- `relationships`: Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` for strict property facts or `requires_predicate` for ontology predicate facts. Side effect: asserts edges in KB.
- `relationships[].type`: Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req/scenario->test, executable_for symbol->test).
- `dryRun`: Validate the payload and return schema/modeling errors, a normalized preview and the semantic advisor receipt without writing the KB or workspace. Use it as the preflight before the real write.
- `plannedFacts`: dryRun only. Fact upsert payloads (type, id, properties, optional relationships) that will be written before this payload, typically the applyPlan entries kb_model returned. They are validated in order and staged with the payload, so a requires_predicate or requires_property target that does not exist yet resolves, its claim_key is read from the plan, and the contradiction preview runs against the KB as it would be after the whole batch (result: stagedFacts, whatIf). A conflict the batch would introduce, such as an allow and a deny permission_rule on the same key, is refused as the commit would refuse it. Rejected without dryRun: write the facts first.
- `plannedFacts[].relationships`: Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` for strict property facts or `requires_predicate` for ontology predicate facts. Side effect: asserts edges in KB.
- `plannedFacts[].relationships[].type`: Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req/scenario->test, executable_for symbol->test).
- `document`: Optional source-first document write. Paths are workspace-relative; omit body when updating to preserve the existing body bytes (a requirement whose semantic_text changes gets the new statement in place of the old one, with its context sections kept). For a new requirement pass a sectioned body: statement, '## Context' (why, who asked, constraints), '## Source' (blockquoted excerpt and reference); context never changes the checked meaning, which stays in semantic_text.
- `implementedBy`: req only: the declarations that implement it, each {sourceFile, symbol} (function, Class.method or exported constant). Kibi creates or reuses each symbol and links it with implements; an entry that resolves to no single granular declaration is refused with candidates.

## `kb_delete` (`kibi delete`)

- `approvedPlanHash`: With ids only: the deletionPlan.planHash a prior call for the same ids returned. The plan is recomputed and applied through kb_apply_plan when its hash still matches; a mismatch fails with DELETE_PLAN_HASH_MISMATCH and writes nothing. Not allowed with relationships or dryRun.
- `dryRun`: Preview without writing. Relationship and direct entity deletes run their preflight and return outcome dry_run with wouldDelete counts, the sourceWrites (paths and hashes) a commit would make, and skippedEffects. Authored ids return the same deletion plan as without dryRun.

## `kb_check` (`kibi check`)

- `rules`: Optional rule subset. Allowed: must-priority-coverage, symbol-coverage, symbol-traceability, symbol-granularity, symbol-coordinates-missing, no-dangling-refs, source-relationship-parity, branch-store-not-compiled, source-path-dangling, no-cycles, required-fields, deprecated-adr-no-successor, superseded-requirement-open, scenario-feasibility, scenario-feasibility-unknown, scenario-outcome-mismatch, exception-claim-keys, numeric-string-value, rule-key-arguments-missing, domain-contradictions, logic-coverage, rule-safety, rule-verifiability, query-plan-safety, req-status-vocabulary, retired-reason-missing, retired-owner-only, strict-fact-shape, strict-req-fact-pairing, predicate-verifiability, strict-readiness, semantic-completeness, related-requirement-unmodeled, claim-subject-missing, claim-subject-undefined, proof-contract-symbols, entity-id-style, domain-redundancy, domain-implication, subject-key-identity, subject-key-shape, ontology-quality, exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved, requirement-rationale-missing, symbol-owner-superseded, adr-unlinked, adr-proposed, predicate-schema-conformance, entity-context-missing, subject-definition-missing, subject-duplicate, quantity-duplicate, subject-hierarchy-invalid, entity-context-acknowledged, decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing, supersedes-reason-acknowledged, policy-ownership, policy-markers, kb-consistency, kb-consistency-unresolved, evidence-floor, agent-requirement-unapproved-implemented, must-positive-scenario, proof-contract-claims. If omitted, server runs canonical and advisory rules plus the full-KB qualityDiagnostics audit scan, including usage telemetry acceptance when evidence exists; migration rules run only when explicitly selected. Advisory and migration findings are non-blocking qualityDiagnostics. If supplied, server preserves scoped validation and skips the full-KB advisory scan.
- `sourceFiles`: Optional repo-relative source files to inspect for early impact diagnostics. Use with includeImpactDiagnostics after meaningful source edits. Scopes the result to those files: blocking violations are listed for entities the changed symbols link to, entities whose KB document changed, and store-level rules; the rest are counted in omittedViolations (count still includes them). The migration plan comes as migrationPlanSummary, and a result over its size budget is cut (truncated: true).
- `includeMigrationPlan`: Return the full migrationPlan (its actions, for kb_apply_plan) instead of migrationPlanSummary, which a check with sourceFiles always gives and any other check gives when the result is over its size budget.
- `includeSymbolDebt`: Without rules or sourceFiles: list the unrecorded declarations per file under symbolDebt.files. By default symbolDebt carries only total and fileCount; the debt never blocks.
- `staged`: When true, inspect staged source changes for impact diagnostics using the shared CLI impact analyzer without shelling out to kibi check.
- `includeWorkingTreeDiff`: When true, inspect current unstaged working-tree diffs for impact diagnostics. Pair with sourceFiles to scope the analysis.
- `includeImpactDiagnostics`: When true, include changed-file impact diagnostics such as symbol_granularity_violation, symbol_semantic_review_needed, source_file_unowned and requirement_statement_unverified (each current requirement the changed code implements, with its statement and firmness, since the check never compares code with a statement) in structured output.
- `async`: When true, start the check as a background job and return a kibi.job.v1 receipt immediately instead of holding the request until the tool timeout. Poll kb_job_status with the returned jobId. Use for full checks on large KBs that exceed the configured tool timeout. The MCP server registers kb_job_status only when KIBI_MCP_OPTIONAL_TOOLS includes it; otherwise async runs the check synchronously.

## `kb_prepare_impact_review` (`kibi prepare-impact-review`)

- `scope`: What to review: {"kind":"staged"} for the staged snapshot, or {"kind":"diff","baseCommit":"<sha>","headCommit":"<sha>"} with full commit hashes.

## `kb_compile_intent` (`kibi compile-intent`)

- `mode`: Create a new requirement or update an existing one. Update auto-selection is allowed only with a high-confidence, well-separated candidate.
- `context`: Why the requirement exists, who asked and anything that does not fit its checked meaning. Required when mode is create (validation error naming this field otherwise); rendered as a '## Context' section of the requirement document, never as part of the checked meaning. Never invent a reason: write 'Reason not stated' when the requester gave none. An update keeps the existing document body unless context is supplied.
- `sourceExcerpt`: Optional verbatim text the intent came from (a ticket, a message, a document passage). Rendered as a blockquote in the requirement's '## Source' section; requires context.
- `sourceReference`: Optional locator of the source text (ticket id, URL, path). Rendered in the requirement's '## Source' section; requires context.
- `clauses`: Optional complete atomic clause decomposition. Each clause must be a verbatim fragment of intent (whitespace may differ); a clause that does not occur in intent fails the call with VALIDATION_FAILED naming it. Each assertive clause receives independent proposition accounting.
- `conflictReviews`: Your verdict on each contradictionAnalysis.reviewCandidates entry of a previous compile: whether the intent contradicts that current requirement, which Kibi could not compare logically. A conflict verdict blocks the plan; a no_conflict verdict clears that candidate. A verdict may also name a current requirement discovery did not rank.

## `kb_apply_plan` (`kibi apply-plan`)

- `plan`: The complete kibi.bootstrap-plan.v1, kibi.compile-plan.v1, kibi.migration-plan.v2, or hash-bound kibi.entity-deletion-plan.v1 object. Migration plans require approvedActionIds and reject blocked actions and review actions Kibi cannot execute.
- `approvedActionIds`: Required for migration-plan.v2. Exact action IDs explicitly approved for this application: automatic actions, or review actions with a cli invocation that Kibi executes only when approved by id (for example semantic_inventory_rederive_drop_grounding).
- `recoveryJournalId`: Typed recovery journal identifier returned by a committed_with_repairs result or a PLAN_APPLY_RECOVERY_REQUIRED error. Recovery replays only the immutable journal and never the original plan request; a compile-plan journal (plan-apply-*) is completed or rolled back deterministically and reports which. A bootstrap journal left `applying` by a process that died mid-action is resumed without edits: the interrupted action is re-applied and a source lock held by the dead process is reclaimed and recorded in the journal.
- `async`: MCP only. When true, start the apply as a background job and return a kibi.job.v1 receipt immediately instead of holding the request open; poll kb_job_status with the returned jobId for the final result. Use for large bootstrap plans (hundreds of actions) that can outlast a client's request timeout. The MCP server registers kb_job_status only when KIBI_MCP_OPTIONAL_TOOLS includes it; otherwise async applies synchronously. A synchronous apply sends notifications/progress after each bootstrap action when the request carries a progressToken. The CLI ignores this field.

## `kb_ingest_proof` (`kibi ingest-proof`)

- `artifact`: Producer-emitted kibi.proof-run.v1 proof artifact. Producers report what happened; Kibi evaluates proof obligations and policies. Produce it via `kibi prove` or direct kb_ingest_proof calls.
- `artifact.proof_results[]`: One observed proof result. binding distinguishes native-case observations from aggregate-run bindings; attempts must report facts only.
- `artifact.certificates`: kibi.code-certificate.v1 objects the run left for certificate-kind contracts, one per test. Kibi re-checks each before a receipt counts as proved.
