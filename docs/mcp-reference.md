# MCP Server Reference

The Kibi Model Context Protocol (MCP) server is a peer public interface alongside the CLI's dedicated JSON routes. It serves MCP-capable agents over `stdio` and receives JSON-RPC 2.0 requests; operation schemas and executors are shared with the CLI.

## Public Tools

The public MCP surface is intentionally curated. Agents can call exact lookup, discovery/reporting, mutation, and validation tools through MCP, with equivalent operation access through `kibi <route> --input <file|->`. Every MCP tool also accepts `workspaceRoot`, the directory the call is about; see [Workspace Routing](#workspace-routing).

### Response envelope

Every tool except `kb_job_status` returns `structuredContent` as a protocol 1
envelope: `{ kibiProtocol, operation, status, data, effects, diagnostics,
nextActions }` (plus `error` on failure). The operation's result fields sit
under `data`. Field paths written `structuredContent.<field>` in this
reference (`structuredContent.bindingHints`, `structuredContent.actions`,
`structuredContent.relationshipPlan`, `structuredContent.receipt`,
`structuredContent.warnings`, `structuredContent.violations[]`,
`structuredContent.qualityDiagnostics[]`, ...) are shorthand for
`structuredContent.data.<field>`. The CLI JSON routes print the same envelope.

### Tool list

The server registers 16 tools by default:

| Area | Tools |
|---|---|
| Discovery and reporting | `kb_query`, `kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph` |
| Skills | `kb_skills` |
| Modeling (read-only) | `kb_model` |
| Mutation and validation | `kb_upsert` (also the `dryRun: true` preflight), `kb_delete`, `kb_check`, `kb_ingest_proof` |
| Planning and review | `kb_prepare_impact_review`, `kb_plan_bootstrap`, `kb_compile_intent`, `kb_apply_plan` |

Two more tools are opt-in. Set `KIBI_MCP_OPTIONAL_TOOLS` in the server
environment to a comma-separated list of names, or `all`:

- `kb_sparql_remote`: remote SPARQL `SELECT` queries ([below](#kb_sparql_remote)).
- `kb_job_status`: polls `kb_check` and `kb_apply_plan` jobs started with
  `async: true` ([below](#kb_job_status)). Without it, both tools ignore
  `async: true` and run synchronously.

### Catalog operations, MCP calls, and CLI routes

The shared operation catalog is larger than the MCP tool list. Narrow
operations stay in the catalog and on the CLI; MCP reaches them through a
consolidated tool so hosts load fewer tool definitions. Result payloads still
name catalog operations, for example `recommended_tools: ["kb_model_requirement"]`,
`suggested_next_tool`, `suggested_next_tools`, and repair-plan `workflowSteps`.
Translate them with this table:

| Catalog operation | MCP call | CLI route |
|---|---|---|
| `kb_skills_list` | `kb_skills` with `action: "list"` | `kibi skills list` / `skills-list`, or `kibi skill` with `"action":"list"` |
| `kb_skills_load` | `kb_skills` with `action: "load"`, `id` | `kibi skills load` / `skills-load`, or `kibi skill` |
| `kb_skills_read` | `kb_skills` with `action: "read"`, `id`, `resource` | `kibi skills read` / `skills-read`, or `kibi skill` |
| `kb_semantic_advisor` | `kb_model` with `mode: "analyze"` | `kibi semantic-advisor`, or `kibi model` with `"mode":"analyze"` |
| `kb_model_requirement` | `kb_model` with `mode: "requirement"` | `kibi model-requirement`, or `kibi model` |
| `kb_suggest_predicates` | `kb_model` with `mode: "predicates"` | `kibi suggest-predicates`, or `kibi model` |
| `kb_validate_upsert` | `kb_upsert` with `dryRun: true` | `kibi validate-upsert`, or `kibi upsert` with `"dryRun": true` |
| `kb_sparql_remote` | `kb_sparql_remote` (opt-in) | `kibi sparql-remote` |
| `kb_job_status` | `kb_job_status` (opt-in) | none: jobs live in the server process |

Every other operation has an MCP tool and a CLI route of the same name (for
example `kb_check` and `kibi check`). With diagnostic logging on,
`.kb/usage.log` records a `kb_model` call under its routed operation (`mode:
"predicates"` logs as `kb_suggest_predicates`) and a `kb_upsert` dry run as
`kb_validate_upsert`.

### Host-visible tool names

The canonical MCP names in this reference use the `kb_*` form. Some hosts display tools with the configured MCP server name prefixed. In OpenCode, the same tools commonly appear as `kibi_kb_search`, `kibi_kb_query`, `kibi_kb_upsert`, `kibi_kb_check`, and `kibi_kb_plan_bootstrap`. Use the host-visible prefixed name when an agent must reference an exact tool identifier; the semantics are identical to the canonical `kb_*` names documented here.

### Generic-agent onboarding

For a copy-paste discovery snippet, see [generic-agent onboarding](generic-agent-onboarding.md). Bundled skills are the canonical agent-guidance source; do not copy a long operating manual into the agent.

MCP-capable agents should use the standard `tools/list` capability discovery step, then follow Kibi's progressive-disclosure path instead of assuming that a package `skills/` directory is loaded by the host:

1. Call `kb_skills` with `action: "list"` to obtain the bundled skill manifests.
2. Call `kb_skills` with `action: "load"` and a returned `id`, normally `kibi-usage` for general Kibi workflow guidance. Load `kibi-bootstrap`, `kibi-freshness`, or `kibi-traceability` when the task matches those workflows.
3. Call `kb_skills` with `action: "read"` only for resource paths declared by that manifest.

These skill operations are local, read-only, and do not require Prolog. They return a human-readable `content` item plus structured data for clients that support structured tool results. The `kb_skills` registration advertises `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: false` as client-facing behavior hints. Clients must treat annotations and skill text as untrusted guidance: authorization, schema validation, approval gates, and mutation sequencing remain enforced by the server and repository workflow.

The CLI is a peer surface with the same skill operations through structured JSON routes (select by what the host exposes):

```bash
printf '%s\n' '{}' | kibi skills-list --input -
printf '%s\n' '{"id":"kibi-usage"}' | kibi skills-load --input -
printf '%s\n' '{"id":"kibi-usage","resource":"resources/workflows.md"}' | kibi skills-read --input -
printf '%s\n' '{"action":"load","id":"kibi-usage"}' | kibi skill --input -
```

If neither a visible Kibi MCP surface nor a trusted local CLI is available, the agent must stop and ask the operator to enable one; it must not infer availability from configuration files or read `.kb/` directly.

Day-0 bootstrap uses the `kibi-bootstrap` bundled skill and `kb_plan_bootstrap`: inspect `kb_status.bootstrap`, follow its typed next action, interview the human about knowledge sources outside the code and pass them with cited `intentClaims` in `bootstrapContext`, review the deterministic `kibi.bootstrap-plan.v1`, ask only further questions returned by a `needs_context` result, get explicit approval for its hash, then pass the unchanged plan to `kb_apply_plan`. Hosts that support it also expose `/kibi-bootstrap`.

### `kb_plan_bootstrap`

Discover existing repository evidence and return a deterministic, snapshot-bound
`kibi.bootstrap-plan.v1`. Use this as the backend for the interactive
`/kibi-bootstrap` onboarding workflow. It never mutates the KB.

**Parameters:**
- `includeGenericMarkdown` (optional): Include generic Markdown content as candidate evidence. Defaults to `true`, or to `false` when `bootstrapContext` declares `intentClaims` (a diagnostic says so); set it explicitly to override.
- `minConfidence` (optional): Minimum confidence threshold for generated candidates.
- `maxCandidates` (optional): Budget for candidates Kibi discovers itself (symbols, tests, repository documents), default 50. Declared `intentClaims` sit outside it: they are never capped and never use its slots, so a long claim list still leaves the full budget for discovered candidates. Candidates with a claim take the budget before provenance stubs (below), so raising it only admits more stubs once every candidate with a claim is planned.
- `entityTypes` (optional): Limit generation to selected entity types.
- `bootstrapContext` (optional): Declared project summary, source-of-truth paths/notes, priority roots, verification anchors, and the outcome of the source interview:
  - `knowledgeSources`: sources outside the code the human confirmed, each with `id`, `kind` (`issue_tracker`, `wiki`, `specification`, `design`, `decision_log`, `support`, `chat`, `repository_docs`, `other`), `title`, `locator`, `authority` (`authoritative`, `supporting`, `stale`), an optional `connector`, and an optional `component` its claims are about.
  - `intentClaims`: statements the agent read in those sources, each with `statement`, `sourceId`, an exact `reference` (ticket key, page URL, section), an `excerpt` (required for `intent` and `observation` claims, optional for `open_question`), an optional `kind`: `intent` (default, intended behavior), `observation` (how things are today, without stating intent) or `open_question` (something the sources leave undecided), an optional `component` that overrides the source's, and an optional `rationale` (the reason the source or the human gave; it becomes the requirement's `rationale` and its body's `## Context`).
  - `conflicts`: contradictions between declared claims that the agent leaves for the human, each with `claimReferences` (two to ten `{ sourceId, reference }` pairs that must match declared claims) and a one-sentence `note`.

  Kibi never contacts the declared sources. All three lists are part of `declaredContext` and so of `planHash`; `kind` is omitted there when it is `intent`. A grounded `intent` claim from an authoritative or supporting source becomes a `req` candidate with `sourceKind: intent_claim`, citation evidence, `text_ref: <sourceId>:<reference>` and a body that persists the claim (statement, then `## Source` with the blockquoted excerpt, source title and reference). Generated subject keys follow `component.aspect[.sub]`: the declared `component` (claim, then source; for repository Markdown, the file or directory name) is the first segment and the claim's subject the aspect; a one-word subject, or one equal to the component, makes the constrained property the aspect; an already dotted subject is kept. An aspect longer than four words or 40 characters is shortened deterministically to a noun phrase (the words before the first clause boundary such as `when`, `while`, `for`, `and`, without stop words; if still too long, its first and last content words), and a `subject-key-shortened:` diagnostic names the original and the chosen key so the operator can rename it. When shortening gives two different subjects the same key, the later one gets a third segment from its own wording (or a short digest) and a `subject-key-disambiguated:` diagnostic; claims about the same subject keep sharing one key, and the plan writes one subject fact for that key: every requirement about the subject links to it through `constrains`, the later sources' provenance is added to its tags and body, and a `subject-key-shared:` diagnostic names the key and its sources. A claim with no component and a multi-word subject is reported in `diagnostics` and becomes an authoring follow-up rather than a requirement with a malformed subject key. A claim the strict modeler cannot ground becomes an authoring follow-up. An `observation` or `open_question` claim never becomes a requirement: it becomes a `fact_kind: observation` candidate with the same citation evidence and `text_ref`, and open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict citing an undeclared claim is reported in `diagnostics` and not planned. These facts pass the same write validation as every other candidate. Stale sources produce no candidates, and claims citing an undeclared source are reported in `diagnostics`. When no sources were declared, a `needs_context` plan asks for them.

**Returns:**
Evidence, bounded context questions, dependency-ordered actions, expected
snapshots/source hashes, payoff summary, diagnostics, and `planHash`. Every
suppressed candidate stays in `suppressedCandidates`; `tldr` and one diagnostic
summarize them as a count per reason (for example `over_limit 290,
duplicate_title 75`). A deterministic provider candidate whose source states
no claim (`source_symbols` "Source module: …", `repo_metadata`, `repo_layout`,
and `test_topology` without a recognized framework) is a **provenance stub**:
it is written as `fact_kind: meta` tagged `bootstrap:provenance-stub` with a
body that says so, not as an observation. A `test_topology` entry that names
its framework states a claim and stays an observation. Stubs stay readable
through `kb_query` (filter by the tag) but `kb_search` ranks them after every
other match and drops them below the default threshold, the answer layer never
lists them as notes, `kb_find_gaps` skips them unless `tags` names the tag
(its `summary.provenanceStubs` counts the stubs that matched the filters either
way), and `kb_coverage` `by: "type"` counts them in `summary.provenanceStubs`
instead of the `fact` row. `discoverySummary.candidatesWithClaims`,
`discoverySummary.provenanceStubs` and
`discoverySummary.suppressedProvenanceStubs` report them apart from candidates
with claims; each `over_limit` row carries `provenanceStub`, and the
`over_limit` diagnostic and `tldr` say how many suppressed candidates are
stubs so nobody raises `maxCandidates` for them. Each candidate's writes are validated before it is
offered, with the same checks and semantic advisor the apply uses, so a
conditional claim ("If microphone access fails, the editor must …") is planned
like any other intent claim; a candidate that fails is suppressed as
`invalid_write`, and one that would write an entity another candidate already
writes with different content is suppressed as `duplicate_entity`. Only a
`ready` plan may be approved. Apply it with `kb_apply_plan`; do not replay raw
`kb_upsert` payloads.

`pluginOffers` lists optional plugins that fit the workspace and that
`package.json` neither activates in `kibi.plugins` nor lists in
`kibi.declinedPlugins`; each has `package`, `capability`, `reason`, `fileCount`
and up to five `evidence` paths, and `recommendedActions` repeats it as a
`plugin_offer` action. Today the only offer is `kibi-plugin-ui`, made when
production `*.tsx`, `*.jsx` or `*.component.ts` files exist. Offers are outside
the plan and its hash; the agent asks the human, and Kibi never edits
`package.json` itself.

## Repository Ignore Policy

During read-only discovery (for example `kb_plan_bootstrap`) and other file-based inference, Kibi will exclude files and directories matched by the repository ignore policy:

- repository root `.gitignore` files and nested `.gitignore` files in subdirectories
- `.git/info/exclude`

In addition to these repository-configured ignores, Kibi hard-denies a set of common tool/runtime directories that are never inspected for candidates:

- `.sisyphus/**`
- `.opencode/**`
- `.kb/**`
- `.git/**`
- `node_modules/**`
- `vendor/**`
- `third_party/**`

Notes and migration limitations:

- Global Git excludes (for example `~/.config/git/ignore`) are not read or honored.
- When MCP tools return a non-null migration warning, run `kibi migrate --dry-run`, then `kibi migrate --yes` before relying on strict checks or automated writes.
- Symbol granularity migration marks existing coarse file/module links as `legacy-link`; new MCP `kb_upsert` calls must target the narrow behavioral symbol when one exists, or provide an explicit `granularity_reason`. Interfaces, type aliases, and enums are `type-shape` symbols and do not by themselves block a coarse behavioral link.

When using discovery tools, agents and operators should assume that ignored paths are not considered as evidence for candidate entities and that any candidates requiring approval will come from non-ignored sources only.

## Semantic Modeling Quick Path

When prose contains a machine-checkable rule, do not store it only in `text_ref` or freeform `links`. Use the concise decision tree in `docs/modeling-cheatsheet.md`.

1. Call `kb_model` with `mode: "analyze"` and the complete body when starting from raw prose, or run `kb_upsert` with `dryRun: true` before the real `kb_upsert` for new or updated normative requirements. Verify the returned atomic clause inventory; supply `clauses` when automatic decomposition is incomplete.
2. For property/value requirements, call `kb_model` with `mode: "requirement"` or create a `fact_kind: subject` fact plus a `fact_kind: property_value` fact. Link the requirement with `constrains` and `requires_property`.
3. Model every assertive proposition: use `kb_model` with `mode: "predicates"` for approved ground ontology claims, strict facts for scalar claims, and `kb_model` with `mode: "requirement"` and a validated `kibi.logic.v1` object for conditions, exceptions, modalities, quantifiers, cardinality, or bounded temporal rules. Preserve `claim_key` and `claim_text` on each ground fact/rule, replace stale manifests with the exact current assertive key set, persist the complete `semantic_inventory` plus its `inventory_contract`, and link with `requires_predicate`, `requires_property`, or `requires_rule`. Ambiguity, ontology gaps, and missing interpretations remain explicitly unresolved.
4. Use snake_case field names exactly as the MCP schema shows. `kb_upsert.properties` rejects camelCase aliases such as `subjectKey`, `propertyKey`, `predicateName`, and generic `value`.

Semantic advisor modeling suggestions remain advisory and do not auto-create facts. The proposition ledger is a mutation contract for current requirements: the advisor canonicalizes repeated identical normalized claims to one proposition at the first source occurrence; `kb_upsert` (dry run or real) still rejects source/hash/span drift, duplicate identities in a submitted ledger, omitted assertions, invalid `nonlogical` classifications, and modeled entries whose linked fact claim keys do not match. Review every proposition and still run `kb_check`; successful ingestion proves accounting integrity, not domain truth or contradiction safety.

### `kb_model`

Turn requirement prose into checkable structure without writing the KB. One
tool covers three read-only modes, selected by the required `mode` field; the
other fields are the inputs of the mode's catalog operation, and the result is
that operation's payload plus `mode`. Apply any returned plan with sequential
`kb_upsert` calls.

| `mode` | Catalog operation | CLI route | Use it to |
|---|---|---|---|
| `analyze` | `kb_semantic_advisor` | `semantic-advisor` | Get the clause ledger, grounding, ambiguity, and modeling suggestions for prose. |
| `requirement` | `kb_model_requirement` | `model-requirement` | Turn one claim (or a typed `logic` object) into a strict write set or rule plan. |
| `predicates` | `kb_suggest_predicates` | `suggest-predicates` | Rank ontology predicate schemas and get a predicate-fact plan or ontology-gap observation. |

`text` is required in every mode. A parameter that only another mode
accepts is ignored and named in the result's `warnings` (and text content),
with the equivalent parameter of the chosen mode when there is one
(`subjectKey` in mode `requirement` is `subjectHint` in mode `predicates`).
`kibi model --input -` accepts the same object on the CLI:

```bash
printf '%s\n' '{"mode":"analyze","text":"Sessions expire after at most 30 minutes."}' | kibi model --input -
```

#### `mode: "requirement"` (`kb_model_requirement`)

Model a normative requirement claim into a deterministic strict write-set or a validated `kibi.logic.v1` rule plan for contradiction-ready KB persistence. Accepts an LLM-supplied semantic claim (or a typed `logic` object) and returns a ready-to-apply sequence of `req`, `fact_kind: subject`, `fact_kind: property_value`, `rule_schema`, and `rule` entities with typed relationships. Raw Prolog is rejected.

High-confidence scalar claims (≥ 0.7) produce a strict write-set: one `req`, one `fact_kind: subject`, one `fact_kind: property_value`, and two typed relationships. A valid `logic` input produces a `rule_schema`, a `rule` with canonical JSON/full hash/semantic key, and `requires_rule`. A conditional clause ("X may happen only when C", "X only if C", "X must not happen unless C") without explicit claim fields is modeled the same way: when C is one comparison on one subject property ("the cart total is positive"), Kibi builds a `forbid` rule on the action with C as its exception (confidence 0.8). A conditional it cannot translate (several conditions, pronouns, relations) returns no observation and no strict facts: the plan is empty, or with `requirementId` a requirement update that records the clause as `ontology_gap`, plus an `unresolved_conditional_clause` warning asking for a typed `logic` rule. Other low-confidence claims (< 0.7) produce a single `fact_kind: observation` artifact tagged `review:ontology-gap` that does not enter the contradiction lane and carries no claim key (it does not ground the clause), plus a warning explaining how to retry with explicit claim fields.

**Parameters:**
- `text` (required): One atomic plain-language normative clause to model.
- `source` / `sourceFiles` (optional): Provenance used for stable IDs and references.
- `confidence` (optional): Claim confidence; values below `0.70` produce observation review output.
- `subjectKey`, `propertyKey`, `operator`, and `value` (optional as a complete set): Explicit semantic claim fields. When all are supplied, heuristic extraction is skipped.
- `provenance` (optional): Exact source anchor for the clause.
- `existingLogicClaims` (optional): Existing requirement claim keys. The returned req update merges the new key rather than replacing previously modeled clauses.
- `requirementId` (optional): The requirement the plan updates. The strict write set uses this id for the `req` step and its `constrains`/`requires_property` links instead of minting `REQ-AUTO-<hash>`; fact ids, `subject_key` and the claim key stay derived from the claim. A typed `logic` rule attaches its `requires_rule` link to it, and an untranslatable conditional records its `ontology_gap` on it.
- `logic` (optional): Typed `kibi.logic.v1` IR. Kibi validates range restriction, modalities, units, temporal bounds, closed-world negation, and resource-safe structure before returning a rule plan.

**Returns:**
A `writeSet` discriminated union:
- `isStrict: true` — includes `req`, `subjectFact`, `propertyFact`, `relationships`, and an `applyPlan` ready for sequential `kb_upsert` calls.
- `isStrict: false` — includes a single `observationFact` for non-normative or low-confidence input.

Also returns the stable `claimKey`, merged `logicClaims`, and `migrationWarning` when the workspace KB schema is outdated.

For strict claims, `vocabularyAlignment` reports how the clause subject was resolved against the existing KB vocabulary:
- `subject.decision` is `reuse_existing` or `declare_new`, with `subject.candidates` ranked deterministically (IDF-weighted token overlap over subject keys, subject titles, and titles of requirements already constraining each subject; requirement-derived subjects are never offered). When reusing, the plan links the existing subject fact through `constrains` instead of creating a duplicate subject fact, and `writeSet.subjectFact` names that fact: its `id` and its `source` (`.kb/facts/<id>.md`, the existing fact's own file). A heuristic subject converges onto the chosen existing subject; an explicitly provided `subjectKey` is kept, and a `subject_reuse_review` warning names the better existing subject when there is one. A declared new subject is tagged `vocabulary:new-subject`, and `subject_key_shape_review` fires when it is not dotted `component.aspect[.sub]`.
- `redundancyCandidates` lists existing claims on the same subject whose wording may state the same obligation, and `reviewPlan` holds an optional `review:possible-duplicate` observation step to record that for review. These are candidates, never verdicts; exact duplicates are reported by the deterministic `domain-redundancy` check.
- `stamps`, `fallbackUsed`, and `diagnostics` disclose the provider. The builtin provider is always available; an activated `kibi.vocabulary-alignment.v1` plugin (for example `kibi-plugin-jev`) may refine the decision in `replace`, `augment`, or `shadow` mode and falls back to builtin on any failure.

The modeling call is read-only. Applying its plan is a separate mutation and must follow the caller's authorization boundary. The write-set is deterministic and idempotent—the same claim produces the same stable entity IDs. Apply authorized writes through sequential `kb_upsert` calls.


#### `mode: "predicates"` (`kb_suggest_predicates`)

Suggest ontology predicate candidates for a prose requirement before an agent writes freeform ontology notes. Agents should spell out the requirement claim, call this mode, then either apply a returned `fact_kind: predicate` plan linked with `requires_predicate`, supply exact `argumentBindings` when a fitting schema still has unbound arguments, or record the returned `review:ontology-gap` observation when no predicate fits. The gap observation is a review note, not a semantic claim: it quotes the claim in `claim_text` without a `claim_key`, carries `review:ontology-gap` and `needs_schema_extension` in `tags` (a tag is not an entity, so no relationship points at it), explains in `document.body` that no predicate schema fits, and stays queryable by tag without entering the contradiction lane. Apply it with `kb_upsert` exactly as returned.

When a project-local schema declares `argument_constants`, bound values that are aliases are rewritten to their declared constant and any other undeclared value leaves that argument unbound, so the candidate lists the allowed constants instead of producing an applicable plan with a new atom. `kb_upsert` enforces the same vocabulary for predicate facts.

The tool ranks project-local `fact_kind: predicate_schema` facts when available and falls back to Kibi's built-in predicate catalog covering state, transitions, guards, exceptions, mutual exclusion, dependencies, ownership, retry policies, escalation rules, availability SLAs, notification routing, idempotency, data residency, audit logging, consent, lifecycle actions, conflict resolution, fallback behavior, batch operations, consistency rules, build constraints, environment safety rules, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, preservation rules, abstraction boundaries, security configuration, ordered strategies, refresh policies, scoped authorization, documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, throttling policies, persistence/save/discard behavior, accessibility, retention, resource constraints, feature gates, events, permissions, defaults, uniqueness, state memberships, temporal ordering, conditional behavior, rate limits, acceptance outcomes, reusable launcher contracts (`dependency_resolution_policy`, `ordered_resolution_strategy`, `resolution_failure_policy`, `process_delegation_contract`, and `failure_behavior`), plus consumer-escalated families for fail-closed authorization, deployment preconditions, data-migration sequencing, diagnostic visibility, mutation authority, request deduplication, async boundaries, canonical identifiers, responsive breakpoints, and operational pauses. Built-in candidates include usage hints (`use_when` / `do_not_use_when`) so agents can choose precise predicates instead of matching keywords blindly.

Candidate diagnostics are additive: each candidate may report `eligibility` (`eligible` or `rejected`), `rejection_reasons`, a conservative aggregate `binding_provenance` (the least-reviewable provenance across arguments), per-argument `binding_provenance_by_argument` (`explicit`, `extracted`, `inferred`, or `placeholder`), `applicability_score`, and deterministic score components. Retrieval and argument binding do not by themselves make a candidate applicable; negative evidence and margin-based abstention can reject weak or near-tied candidates. When no schema is genuinely eligible, the response uses `record_ontology_gap` and includes a non-null `recommendedPredicateSchema` draft with proposed name, ordered arguments, extracted bindings, unresolved bindings, rationale, and reuse scope for review. Draft schemas are never applied automatically.

**Parameters:**
- `text` (required): Prose requirement or claim to classify into ontology predicates.
- `requirementId` (optional): Existing requirement ID. When present, the response includes a `relationshipPlan` describing the `requires_predicate` link to attach after preserving existing requirement metadata.
- `source` (optional): Provenance/text reference for generated predicate facts or ontology-gap observations.
- `subjectHint` (optional): Canonical subject key the predicate is about. It binds the argument the schema names `subject`, wherever that argument sits; for a schema without a `subject` argument it becomes the planned fact's `subject_key`. Without it, a `requirementId` whose requirement `constrains` exactly one subject fact binds that fact's `subject_key` the same way (provenance `requirement`); with several subject facts their keys are listed first in the subject's `bindingHints[].examples`. A requirement without a subject fact leaves `subject` unbound; only free text without `requirementId` falls back to keyword guesses. For a requirement that is not written yet or constrains nothing, an explicit `subjectHint` is the planned subject: the candidate's `subject_key` is set from it and `subject_pairing` is computed against it, so the planned fact pairs with the subject fact once the requirement `constrains` it. The parameter is `subjectHint`, not `subjectKey` (a `mode: "requirement"` parameter): a parameter that belongs to another `kb_model` mode is ignored and named in `warnings` (`subjectKey is a mode: requirement argument; mode: predicates ignored it. Use subjectHint in mode: predicates.`).
- `maxCandidates` (optional): Maximum ranked predicate candidates to return.
- `minScore` (optional): Minimum candidate score; higher values make ontology-gap fallback more likely.
- `includeExistingSchemas` (optional): Include project-local predicate schema facts alongside built-ins.
- `schemaId` (optional): Select an exact reviewed built-in or project-local schema ID instead of accepting lexical rank order. An unavailable ID returns `resolve_schema_reference` with no write or ontology-gap plan.
- `argumentBindings` (optional): Exact values keyed by the candidate schema's ordered `argument_names`, taken from the claim text. Use this to resolve an incomplete candidate; unbound values are never emitted as an applicable predicate fact. A value that only repeats its own or another argument name (after snake-case normalization, for example `before_event: "before_event"`) unless the claim itself names it, or a bare stop word or trivial verb (`be`, `is`, `do`, `have`, `the`, `a`, ...), counts as a placeholder and leaves the argument unbound. `true`, `false` and the schema's declared `argument_constants` are always accepted.
- `polarityHint` (optional): Reviewed `assert` or `deny` override for negation-scope false positives. Use only after reviewing the complete claim and selected schema.
- `existingLogicClaims` (optional): Existing requirement claim keys. Returned relationship guidance merges the new key rather than replacing earlier clauses.

**Returns:**
- `candidates`: Ranked predicate suggestions with schema signature, usage hints, ordered `predicate_args`, `binding_status`, `unbound_arguments`, `canonical_key`, score, and rationale. With a `requirementId` that constrains subject facts (or, when nothing is constrained yet, an explicit `subjectHint`), `subject_key` is the subject the predicate is about (the value of its `subject` argument, or for a schema without one such as `permission_rule(actor, action, resource, decision)` the requirement's subject) and `subject_pairing` says whether that is one of the constrained subjects (`paired`, `unpaired`, or `not_required` when the requirement constrains none). An `unpaired` candidate is incomplete: its `unbound_arguments` include `subject` (or `subject_key` for a schema without a `subject` argument), because `kb_check` would keep reporting `strict-req-fact-pairing` after the link. The planned predicate fact records `subject_key` whenever it is known, so the strict lane pairs it with the subject fact whatever argument holds the subject. A value for an entity-, actor- or resource-like argument taken from the claim text that is longer than three words (a clause such as everything before the modal verb) is not a binding: it stays unbound with a `bindingHints` reason; short nouns still bind.
- `recommendedAction`: names the predicate state whether or not the claim is already grounded. `apply_requires_predicate` when the top or explicitly selected candidate fits, every argument is bound, the predicate pairs with the requirement's subject (see `subject_pairing`) and the claim is not yet grounded; `replace_grounding` when such a candidate fits but `requirementId` already grounds this claim (same `claim_key`) through `requires_property`, `requires_predicate` or `requires_rule`; `provide_argument_bindings` when its schema fits but exact values are missing or the predicate is not about a subject the requirement constrains (the summary, `candidates[].unbound_arguments` and `bindingHints` list them, and a warning says when the schema does not name the requirement's subject); `resolve_schema_reference` when an explicitly selected schema is unavailable; `review_nonlogical` when the semantic advisor classifies the input as nonlogical (rationale, example, or subjective context); otherwise `record_ontology_gap`. `record_ontology_gap` is also returned when the top candidate is incomplete solely because the claim names no participant for its `actor`, `actor_scope`, `role` or `owner` argument (the value is empty, the requirement's subject key or a clause of the claim that opens with a gerund such as "Discarding a draft while …", and none of the argument's declared constants or schema example values occurs in the claim text): such a schema does not fit the claim, so the `review:ontology-gap` observation is planned in `applyPlan`, while the candidate stays in `candidates` as `incomplete` and `bindingHints` still explains the unbound argument. A claim that names a participant in other words, or an argument unbound for another reason (a value outside `allowedValues`, a value the claim does not contain), keeps `provide_argument_bindings`. A non-empty `existingGrounding` is the "already grounded" signal and lists the links found. An already grounded claim never gets a predicate `applyPlan` or `relationshipPlan`, because a modeled claim takes exactly one grounding relationship and a second link fails the proposition-complete rule; on `replace_grounding`, `replacementPlan` gives the ordered swap (upsert the predicate fact, `kb_delete` the old grounding relationship, then upsert the requirement with the `requires_predicate` link) and `relationshipTarget` names the planned fact. Each step's `input` is a complete payload to apply unchanged: the requirement step restates the stored `title`, `status`, `priority` and `tags` (kb_upsert keeps the stored proposition ledger). The order is forced and the steps must run back to back: linking `requires_predicate` before the retraction is rejected because the claim would have two groundings, and between the retraction and the link the claim is ungrounded, so a `kb_check` in between reports `logic-coverage` for the requirement. If the last step fails, apply `replacementPlan.rollback`, which restores the retracted link. On `record_ontology_gap` the `review:ontology-gap` observation plan and `recommendedPredicateSchema` are returned even for a grounded claim, since the observation is not a grounding relationship.
- `structuredContent.actions`: A ready-to-apply `kb_upsert` payload for a completely bound top predicate fact, an empty list for an incomplete binding, or an explicit `fact_kind: observation` tagged `review:ontology-gap` and `needs_schema_extension`, with `claim_text`, `value_string`, `text_ref` (when `source` is given), a `document.body` and no relationships.
- `structuredContent.bindingHints`: On `provide_argument_bindings`, one entry per unbound argument of the recommended candidate: `argument`, `position`, `type` (from `argument_types`), `description` when the schema has one, `allowedValues` (the declared `argument_constants`) when the vocabulary is closed, `examples` (for `subject`, and for an `entity` argument of a schema without one, the requirement's constrained subject keys first; then constants, then the values at that position in the schema's `examples`; a `subject_key` hint, `position` -1, lists the constrained subject keys to pass as `subjectHint`), the rejected `currentValue` with its `provenance`, and a `reason`. A participant argument (`actor`, `actor_scope`, `role`, `owner`) is never offered the subject keys: the subject is what the claim is about, not who acts on it, and the planned fact already carries it as `subject_key`. An explicit binding of such an argument to a constrained subject key stays unbound (`placeholder`) with a reason, so the candidate cannot become `complete` through a vacuous actor; when the claim names no participant, the hint says so and points to `record_ontology_gap`, because a schema whose actor the claim never names does not fit the claim. Bind from the claim text using these instead of copying field names. Also returned on a `record_ontology_gap` that was decided for a matched but unfitting candidate; empty for every other action. Built-in schemas close the arguments with a natural vocabulary: `trigger` of `commit_action`, `discard_action` and `transition` (`escape`, `cancel`, `submit`, `navigation`, `click`, `timeout`), `decision` of `permission_rule` and `scoped_authorization_rule` (`allow`, `deny`), `policy` of `refresh_policy_rule` (`automatic`, `manual`, `on_demand`), `decision` of `environment_safety_rule` (`allowed`, `forbidden`, `read-only`), `operator` of `resource_constraint`, `unit` of `retention_policy` (`days`, `months`, `years`), `action` of `coding_standard_rule` (`use`, `avoid`) and of `lifecycle_rule` (`archived`, `deleted`, `expired`). A claim that names a constant in other words (`times out`, `must be denied`) binds it, and aliases such as `navigate` converge onto the constant.
- `structuredContent.replacementPlan`: On `replace_grounding`, the ordered `steps` (write the predicate fact, `kb_delete` the old grounding link, upsert the requirement with `requires_predicate`), a `rollback` upsert that restores the old link, `instructions`, and `expected`: `kbCheckAfterStep` lists the `kb_check` findings for the requirement after each step by rule name (`[[], ["logic-coverage", "strict-req-fact-pairing"], []]`: between the retraction and the link the claim is ungrounded and its subject fact unpaired, so both rules fire), `kbCheckAfterLastStep` is `[]`, and `rollbackWhen` is "kb_check after the last step is not clean". Violations carry the rule as `rule`, quality diagnostics as `rule.<name>`.
- `structuredContent.relationshipPlan`: When `requirementId` is supplied and a predicate fits, the req -> fact `requires_predicate` link plus the merged `logicClaims` manifest to apply after querying/preserving the existing requirement entity. This is separate from `applyPlan` so the tool never emits a foreign-source relationship that `kb_upsert` would reject. `structuredContent.relationshipTarget` names the planned predicate fact id (`FACT-PRED-…`) that the `requires_predicate` link must target; `candidates[].id` (`SUGGEST-…`) values are never relationship targets.

**Example:**
```json
{
  "mode": "predicates",
  "text": "When the user navigates away with unsaved annotation edits, the editor must auto-save the draft and return to idle mode.",
  "requirementId": "REQ-EDITOR-004",
  "source": "requirements/editor.md#L12",
  "subjectHint": "editor.annotation"
}
```


#### `mode: "analyze"` (`kb_semantic_advisor`)

Analyze requirement prose without mutating the KB. Use this before constructing a `kb_upsert` payload when you have raw requirement text and want modeling suggestions.

**Parameters:**
- `text` (required): Requirement prose to inspect.
- `type` (optional): Entity type context. Currently `req` is supported.
- `id` (optional): Requirement ID used for draft relationship guidance.
- `title` (optional): Requirement title for draft apply plans.
- `source` (optional): Provenance for draft suggestions.
- `status` (optional): Requirement status for draft suggestions.
- `clauses` (optional): Caller-reviewed atomic proposition split. Use it when a sentence contains multiple obligations, conditions, exceptions, definitions, or qualifiers.
- `interpretations` (optional, maximum 3): Typed `kibi.logic.v1` alternatives with `claim_key`, `claim_text`, and `ir`. Kibi canonicalizes and structurally compares them; materially different valid alternatives remain unresolved and confidence never selects one.

**Returns:**
- `structuredContent.receipt`: Semantic advisor receipt with detected signals, a proposition ledger (`propositions[]`), a versioned `inventory_contract` containing the semantic source field and SHA-256 hash, typed interpretation results, deterministic shadow cues, modeling suggestions, candidate lane, payload hash, and suggested next tools.
- `structuredContent.warnings`: Non-blocking warning strings explaining why the prose is not yet contradiction-checkable.

The receipt returns stable provenance `claim_key` values, `claim_text`, exact UTF-8 byte spans, per-clause suggestion indexes, and a `logic_coverage` manifest comparison. Proposition statuses are `modeled`, `ambiguous`, `ontology_gap`, `nonlogical`, or `missing`; an assertive span is never silently dropped. Observation apply plans carry their review category in `tags` (for example `review:ambiguity` or `review:ontology-gap`; a tag is not an entity, so no relationship points at it) and a `document.body` that quotes the prose, so `kb_upsert` accepts them as returned; they remain outside contradiction checks. Suggestion kinds include `strict_property`, `predicate`, `rule`, `ambiguity_observation`, and `ontology_gap`. Supported deterministic suggestions include multi-claim prose, cardinality, thresholds with units, retention/expiry durations, booleans, enum sets, permissions and prohibitions, defaults, uniqueness constraints, state memberships, state transitions, exception rules, mutual exclusion, dependency rules, ownership, retry policies, escalation, availability SLAs, notification routing, idempotency, data residency, audit logging, consent, lifecycle, conflict-resolution, fallback/degradation, batch constraints, cross-entity consistency, conditional behavior, temporal ordering, comparative numeric constraints, rate limits, and ambiguity observations.

For exact predicate suggestions, the receipt `candidate_lane` and `suggested_next_tools` follow the generated suggestion rather than the weaker signal heuristic. For example, a lifecycle rule containing a number still routes to `kb_suggest_predicates` (`kb_model` mode `predicates`), not `kb_model_requirement` (mode `requirement`), when the advisor can ground it as a predicate fact. These receipt fields name catalog operations; see [the mapping table](#catalog-operations-mcp-calls-and-cli-routes).

### `kb_query`

Retrieve entities by `type`, `id`, `tags`, or `sourceFile`. Supports limit and offset pagination.

**Parameters:**
- `type` (optional): Entity type (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`)
- `id` (optional): Entity ID (exact match)
- `tags` (optional): Tag list for filtering
- `sourceFile` (optional): Source-file substring filter
- `limit` (optional): Maximum number of results
- `offset` (optional): Number of results to skip

**Returns:**
Array of matching entities with deterministic ordering.

**Example:**
```json
{
  "type": "req",
  "sourceFile": "src/auth/login.ts",
  "limit": 20
}
```

### `kb_search`

Ask the KB a question or search it. The default `intent-v1` ranking accepts natural-language questions ("what governs checkout rounding?"), deterministic host-agent facets, and changed-code source locations, returns bounded traceability evidence, and abstains explicitly below its confidence threshold. Superseded and deprecated entities are demoted in the ranking. Set `rankingMode: "legacy"` for the older lexical ranking.

**Parameters:**
- `query` (required): Free-text query
- `type` (optional): Entity type filter
- `limit` (optional): Maximum number of ranked results
- `offset` (optional): Number of results to skip
- `rankingMode` (optional): `intent-v1` (default) or `legacy`
- `answer` (optional, default `true`): Intent mode, first page only. Adds the answer layer described below.
- `semanticFacets` (optional): Host-provided `actors`, `actions`, `objects`, `constraints`, or `aliases` arrays
- `sourceLocations` (optional): Workspace-relative `{path, line?, column?, symbol?}` locations for changed code
- `minScore` (optional): Intent acceptance threshold between `0` and `1`; defaults to `0.18`
- `fields` (optional): `summary` (default) or `full`

**Returns:**
Ranked results with match reasons and optional snippets.

By default each result carries identifying metadata only — `id`, `type`, `title`, `status`, `priority`, `tags`, `source`, and `updated_at` — alongside its `score`, `reasons`, and `snippet`. Search is a discovery step, so complete entity bodies are withheld until the caller has chosen what to open: request them with `fields: "full"`, or follow up with `kb_query` for the exact ids. Ranking, ordering, and `count` are identical in both modes.

Candidate retrieval is paged internally, so a large KB no longer serializes its entire matching corpus into one Prolog response.

Intent-mode results additionally carry `evidence` for matched facets, source locations, graph paths, and normalized score. The payload includes `queryAnalysis` with candidate/accepted counts, top score, top-two margin, ranking mode, and `abstained`, plus `truncated`. An abstention is an explicit no-answer signal, not a successful empty lexical search.

On the first intent-mode page, `data.answer` (`kibi.search-answer.v1`) turns the matches into what an agent asking "what governs this?" needs:

- `governing`: current requirements matched by the query or linked to a matched entity. Each has `score`, `via` (how it was reached), and its linked `facts` (with `factKind`), `scenarios`, `tests`, and `adrs`. Tests include those that verify the requirement's scenarios; each test's `via` is `direct` or the scenario it was reached through. Each requirement also carries:
  - `verdict`: what the existing checks report about it. `status` is `contradiction` (a domain-contradiction witness names it), `infeasible` (a scenario-feasibility witness: a success scenario it specifies assumes a value a current requirement forbids, or it forbids another requirement's scenario), `unknown` (only `unknowns` below), or `none`. `witnesses` lists each blocking finding with its `check`, `status`, the other requirement (`with`), the `scenario`, the `facts` involved and a `detail`. `none` means no check named the requirement, not that it is proven; proof-ladder status stays in `kb_coverage`.
  - `exceptions`: requirements that `exempts` it, each with `approvedBy` when a human approved the exception.
  - `unknowns`: what the checks could not decide, each with a `kind` and `detail`: `contradiction_unresolved` (a rule overlap the checks could not classify), `feasibility_unknown` (a success scenario whose assumptions no current requirement constrains), `unresolved_proposition` (a clause still `ambiguous` or an `ontology_gap`), `analysis_incomplete` (no complete clause ledger), or `verdict_unavailable` (the checks could not run).
- `rationale`: ADRs that explain the decisions, each with its `source` path and an `excerpt`: the opening sentences of its Decision section (falling back to Rationale, then the first paragraph), at most 280 characters.
- `notGoverning`: superseded or deprecated requirements, with `supersededBy` when known. They are listed so they are never read as current policy.
- `observations`: observation/meta facts, labelled as notes rather than rules.
- `scope`: the KB the answer was computed from: `branch`, `snapshotId`, and `syncedAt`. `kb_status` says whether that snapshot is stale.
- `truncated`: `true` when a size bound cut the layer short. The whole answer stays under 16 KB: long titles, excerpts and details are clipped, then ADR excerpts are dropped, then lower-ranked requirements and list entries; a verdict keeps its `status` when its witnesses are dropped.
- `note`: how to read the layer. An empty `governing` list is not evidence that nothing governs the change.

The answer layer is graph traversal plus the existing checks scoped to the governing requirements: discovery, not proof. Use `kb_check` and `kb_coverage` for full consistency and proof status. Pass `answer: false` to skip it.

**Example:**
```json
{
  "query": "what governs the login flow?",
  "type": "req",
  "limit": 10
}
```

### `kb_compile_intent`

Compile complete post-change intent into a deterministic, snapshot-bound plan without mutating the KB. The compiler reuses intent-aware discovery and the semantic advisor, accounts for every proposition, checks current contradiction witnesses, proposes canonical traceability links, and emits dependency-ordered `kb_upsert`-style steps only for resolved typed claims. A conditional clause ("only when", "only if", "must not ... unless") on one subject property compiles to a `forbid` rule linked by `requires_rule`; one the advisor cannot translate stays an `ontology_gap` proposition and the plan `needs_resolution`.

**Parameters:**
- `intent` (required): Complete desired behavior, not a patch fragment.
- `context` (required when the plan creates a new requirement, otherwise optional): Why the requirement exists, who asked and constraints, in the requester's words. Rendered as the `## Context` section of the requirement body; on update the statement is replaced and every existing context section is kept byte for byte unless `context` (or the source) is supplied, which replaces that section; a missing value is a validation error naming the field. Write "Reason not stated" rather than inventing one.
- `sourceExcerpt`, `sourceReference` (optional): A verbatim quote and where it came from, rendered as a blockquoted `## Source` section.
- `mode` (required): `create` or `update`.
- `requirementId` (optional): Exact update target; automatic update selection is gated by score and runner-up margin.
- `title`, `clauses`, `semanticFacets`, `sourceLocations`, `interpretations` (optional): Context for title, proposition decomposition, host-agent facets, changed-code evidence, and typed rule IR.
- `scenarioDrafts`, `testDrafts` (optional): Draft traceability artifacts. Each draft's `body` is carried as the step's `document.body`, not as an entity property. Tests are linked through scenarios with `verified_by` (the scenario step carries the link, and tests are ordered before the scenarios that link to them; the requirement step carries `specified_by`); when multiple scenarios are supplied, each test must declare stable `scenarioIds` (a single scenario remains backward-compatible). Draft tests default to ancillary `integration`/`internal` evidence; explicitly declare `end_to_end`/`consumer` when that is the intended proof-bearing scope.
- `proposalDecisions` (optional): Explicit `accept`/`reject` decisions for returned traceability proposals; pending proposals are excluded from executable steps.

**Returns:**
`kibi.compile-plan.v1` with `planHash`, status (`ready`, `needs_resolution`, or `blocked`), branch/KB/workspace snapshot bindings, discovery candidates, proposition ledger, contradiction analysis, traceability proposals, dependency-ordered steps, source before-hashes, and diagnostics. The plan is a review artifact; it is not a mutation request.

Every non-symbol step of a `ready` plan carries `document.path`, the authored document `kb_apply_plan` writes that entity to (the same canonical path `kb_upsert` would pick). The requirement's document is the first `sourceLocations` entry when it is a `.md`/`.mdx` file outside `.kb/`, otherwise its existing document or `.kb/requirements/<id>.md`; its `document.body` is the intent, then `## Context` with `context`, then `## Source` when `sourceExcerpt` or `sourceReference` is given, and `semantic_text` is written explicitly so the context never changes the checked meaning. Code `sourceLocations` are evidence only and are never write targets. `sourceWrites` is empty for compile plans. A step that cannot be applied as written (it fails entity validation or its document path cannot be resolved) makes the plan `needs_resolution` with the diagnostic `A plan step cannot be applied as written: …`.

`contradictionAnalysis` stages the plan in a rolled-back transaction and compares it with the current KB: `introduced`, `removed` and `unchanged` list full contradiction and scenario-infeasibility witnesses (kind `property`, `predicate`, `rule` or `scenario_feasibility`; a scenario witness carries `scenario`, `requirements`, `assumedFacts` and `requirementFacts`). Any introduced contradiction or infeasible scenario makes the plan `blocked`, whichever requirements it names; a pre-existing one blocks only when it names the target requirement. `witnesses` lists the ones that decided `outcome`.

**Example:**
```json
{
  "intent": "Customer data must be retained for 7 years.",
  "mode": "create",
  "sourceLocations": [{"path": "src/retention/policy.ts", "symbol": "retentionYears"}]
}
```

### `kb_apply_plan`

Apply an approved `kibi.compile-plan.v1` after revalidating its canonical hash, branch/KB/workspace snapshots, source before-hashes, and entity/relationship shapes. Every step runs through the same validation chain as `kb_upsert` (schema, proof receipts, relationship sources and targets, strict-lane pairing, supersedes direction, proposition-complete ingestion, grounding claim keys, predicate argument vocabulary), with entities and relationships created by earlier steps treated as present, and the whole plan is staged in a rolled-back transaction before the first write; a plan whose staged state introduces a contradiction or an infeasible success scenario is refused with nothing written.

A compile plan then applies all-or-nothing:

1. Before the first write, Kibi writes a durable journal (`plan-apply-<hash>`) next to the branch store (under `.kb/recovery/plan-apply/` until the store exists). The journal records the plan hash, the exact before and after bytes and hashes of every workspace file the plan changes (its `sourceWrites`, each step's entity document, and the relationship shards its steps append), every store upsert, and a fingerprint of the store entities the plan touches. Plans without source writes get a journal too.
2. Files are published with temp-file + rename, fsynced where the host supports it.
3. All steps commit in one store transaction. That transaction is the only commit point. Each entity is committed with its authored document as its source, so `kibi sync --rebuild` keeps every entity and relationship the plan applied.

Any failure before the commit restores every file from the journal and leaves the store untouched; the error says `no change was applied` and the plan can be applied again. If the process dies mid-application, the next `kb_apply_plan`, `kb_upsert` or `kb_delete` call (or `kb_apply_plan` with that `recoveryJournalId`) finishes the journal before doing anything else. A journal interrupted before the store commit was submitted is rolled back. One interrupted during the commit is decided by the store fingerprint: unchanged means roll back, changed means complete. One whose commit was accepted is completed. Recovery is idempotent, and it refuses (`PARTIAL_COMMIT_REPAIR_REQUIRED`), changing nothing, when a journaled file holds neither its journaled before nor after bytes. Mutating calls on that branch then fail until an operator resolves it. `kibi sync` does not yet settle pending plan journals; run a mutating call or the explicit recovery first.

A bootstrap plan (`kibi.bootstrap-plan.v1`) applies its actions one at a time, checkpointing each in a `bootstrap-<hash>` journal under `.kb/recovery/`. Large bootstrap plans take a while (a few hundred actions can run past a minute), so:

- A synchronous apply sends MCP `notifications/progress` after each action when the request carries a `progressToken`. Clients that reset their request timeout on progress (the MCP SDK's `resetTimeoutOnProgress`) keep waiting, and the server's own `KIBI_MCP_TOOL_TIMEOUT_MS` then bounds the time between progress reports rather than the whole apply.
- `async: true` returns a `kibi.job.v1` receipt immediately and runs the apply as a background job; poll [`kb_job_status`](#kb_job_status) for the result. This needs `KIBI_MCP_OPTIONAL_TOOLS=kb_job_status`; without it the apply runs synchronously.
- The plan is checked before any action runs. An invalid plan, or a missing or wrong `approvedPlanHash`, fails the call itself (also with `async: true`) instead of surfacing later in the job, and approval stays bound to the exact KB snapshot, including the journal generation and revision. A deterministic failure after application began (`BOOTSTRAP_PLAN_REJECTED`) is terminal and needs a corrected plan.
- If the server dies mid-apply, call `kb_apply_plan` with the journal's `recoveryJournalId`. A journal still `applying` whose active action has no checkpoint is resumed without edits: the drift since the last checkpoint is attributed to that action, which is re-applied, and the result notes it. A source lock left by the dead process is reclaimed and recorded in the journal (`lockReclaims`); a lock whose holder is still alive keeps blocking. Any other drift since the last checkpoint is still refused. Never edit the journal by hand.

**Parameters:**
- `plan` (required): Complete plan returned by `kb_compile_intent`.
- `approvedPlanHash` (required): Exact reviewed `planHash`.
- `recoveryJournalId` (instead of `plan`): A `plan-apply-*` journal to complete or roll back, or another typed recovery journal returned by a `committed_with_repairs` result. Recovery never replays the original plan request.
- `async` (optional, default `false`): Start the apply as a background job and return a `kibi.job.v1` receipt; see above. The CLI ignores it.

**Returns:**
`kibi.plan-apply-result.v1` with entity/relationship counts, final snapshots, validation counts, changed paths (every source write and entity document the plan wrote), `recoveryJournalId`, and notes. `outcome` is `applied` when this call committed the plan, or `replayed` / `rolled_back` when a recovery completed or rolled back an interrupted application. Recoveries a call performed before its own work are listed in `validationSummary.recoveredJournals` and in the text content. If the call then fails, its error text ends with `[settled before this failure: ...]`. A store that reports a failure but shows the batch committed yields `committed_with_repairs` with `STORE_COMMIT_REPORTED_FAILURE`. A pending-source receipt failure after the commit yields `committed_with_repairs` with `PENDING_SOURCE_RECEIPT_FAILED` and a `kb_apply_plan` recovery next action; further writes fail with `PLAN_APPLY_RECOVERY_REQUIRED` until that journal is recovered. Re-applying a committed plan fails with `MUTATION_ALREADY_COMMITTED`. It also accepts `kibi.migration-plan.v2`; migration application requires `approvedActionIds`, an exact `approvedPlanHash`, and rejects blocked or non-automatic actions. The `integrationPlan` from `kibi proof inspect --json` is such a plan: its `proof_integration_configure` action writes `.kb/proof/integrations.json`, refusing a create once the file exists and any plan whose source files (`package.json`, lockfiles, runner configs) changed since planning. Migration results (`kibi.migration-apply-result.v1`) report per-action outcomes (`applied`, `failed`, `skipped`, each with a `detail`) and an overall `outcome`:

- `applied`: every approved action applied (`closeout.taskOutcome: complete`).
- `partially_applied`: some actions applied before one failed; the rest were skipped (`closeout.taskOutcome: interim`).
- `refused`: nothing was applied and every failure was a refusal, a precondition that failed before the action changed anything (for example a proof-integration create plan whose file already exists, a source that changed since planning, or an action with no automatic executor). The workspace is unchanged, so there is nothing to reconcile: obtain a new plan. The envelope is an error (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `MIGRATION_PLAN_REFUSED` whose message carries the refused action's `detail`; `closeout.taskOutcome` is `blocked`.
- `reconciliation_required`: nothing was applied but an action failed without being refused, so its partial effect must be inspected before retrying (`closeout.taskOutcome: blocked`).

**Engine daemon after a session.** MCP calls that use the branch store (for example `kb_apply_plan`, `kb_upsert`, `kb_check`) run in the workspace's engine daemon, a detached `engine-daemon` process with its own SWI-Prolog child that holds the branch store's `rdf/lock`. It is shared: later MCP sessions and CLI calls for the same workspace and branch reuse it. After the MCP server exits, the daemon and its lock stay until the daemon has been idle for 10 minutes (`KIBI_ENGINE_IDLE_TIMEOUT_MS` overrides this), then it exits and releases the lock. A lock held by a live daemon is expected, not a stale lock: `kibi engine status` shows it and `kibi engine stop` ends it early. A lock whose process is gone is reclaimed automatically when the next engine starts. A client only uses a daemon started with the same Kibi package versions (`kibi-cli@…,kibi-core@…`) and SWI-Prolog as its own: the daemon reports both in its handshake and refuses other requests from a client that differs, and the client stops such a daemon (for example one an older install started from a git hook) and starts its own. `kibi doctor` reports the package versions of the daemon that is running.

### `kb_ingest_proof`

Ingest a producer-emitted `kibi.proof-run.v1` artifact and evaluate it against each selected test's `kibi.proof-contract.v1` proof obligations. Kibi rechecks the live workspace snapshot, integration command binding, run-level outcome, attempt history, success policy, and proof history ordering, then derives and appends idempotent `kibi.proof-receipt.v1` receipts and compacts each history to the receipts that can still decide proof (`kibi.proof-receipt-compaction.v1`; kept receipts are never edited or reordered). Producers report what happened; Kibi evaluates proof. Caller-authored receipts and trusted outcomes are rejected.

**Parameters:**
- `snapshot` (required): Workspace snapshot captured immediately before execution.
- `artifact` (required): Producer artifact containing `version`, `producer`, `integration`, `command_argv`, `code_snapshot`, typed `environment`, run-level `run` outcome, and `proof_results` (each with `symbol_id`, `target`, `outcome`, `binding`, and factual `attempts`).
- `testIds` (optional): Existing test entities with `kibi.proof-contract.v1`. Omit to evaluate every test contracted to the artifact's integration.

**Returns:**
Per-test outcomes, receipt ids, applied/duplicate flags, receipt counts, the number of superseded receipts compacted away (`compacted`), expected-versus-received gap reports, plus the artifact digest and Kibi-derived environment hash. A changed snapshot, unknown integration, command drift, run-level failure, failed success policy, or append-only violation fails before mutation.

### `kb_status`

Return branch, snapshot, and freshness metadata for the attached KB, plus the deterministic workspace snapshot used to validate execution receipts.

**Returns:**
Branch name, KB snapshot ID, sync state, dirty flag, KB path metadata, and `proofSnapshot` evidence (`available`, `dirty`, file count, and `kibi.workspace-snapshot.v2` version). An unavailable workspace snapshot is reported as `unknown` and cannot prove the proof stage. Receipt-only frontmatter edits do not change the v2 hash.

The response also includes exact `branchAttachment` metadata, bounded sorted
`staleReasons` (with affected entity IDs and truncation totals), and
`proofSnapshotChanges`. Editor/config paths are reported as ordinary
workspace changes; they are not silently ignored.

When migration is needed, the response includes `schemaStatus` and a typed
`migrationPlan` (`kibi.migration-plan.v2`) with canonical hash, scope
completeness, dependencies, safety classes, exact invocations, evidence, and
postconditions. Status never mutates and remains available without Prolog for
missing or damaged stores.

`kb_status` remains diagnostic when the branch store is missing, incomplete,
or unreadable: it reports `branchStore` and a structured stale reason instead
of initialising or repairing storage. Status itself never creates a store,
but a call that attaches the engine does (`kb_check` and other tools that
need the engine over MCP, `kibi check` on the CLI, and `kibi branch ensure`),
and that store stays empty until `kibi sync` compiles it. An incomplete or unreadable exact store is rebuilt only through the
previewed `kibi branch recover --apply` workflow. A store that is missing or
empty (journal sequence 0) while `.kb/` holds authored sources, the state of
a new branch created without the `post-checkout` hook, is one blocking stale
reason, `branch_store_not_compiled` (`blocking: true`, `authoredSources`,
remediation `kibi sync`), and the `migrationPlan` adds the automatic
`branch-store-compile` action (`kibi sync`) after `branch-store-ensure`;
`syncState` is then `"stale"`, whether the store is missing or empty. A
missing store with no authored sources, and an incomplete or unreadable one,
report `syncState: "unknown"`. `kb_check` over MCP and `kibi check` alike then
return the single `branch-store-not-compiled` violation (MCP uses the
runtime's branch attachment, including a `KIBI_BRANCH` override), and
`kb_apply_plan`'s `closeout.kbState` reads `stale` (not `not_evaluated`)
while the store stays uncompiled.

**Example:**
```json
{}
```

### Engine cancellation limits

MCP tool timeouts abort the operation `AbortSignal`, which `adaptProlog` forwards
to `EngineClient` (`query`, `queryEntities`, `searchEntities`, `queryStatusJson`,
`save`). The client rejects pending RPCs and sends a best-effort `cancel`
frame. **Queued** daemon requests on that connection are skipped before
`handle()`. Cancel marks are **per-connection** (request ids are not global).
A request already blocked inside SWI-Prolog (`await prolog.query(...)`) is
**not** interrupted today: the daemon queue stays busy until that Prolog call
returns (up to the engine/Prolog timeout). Read-tool timeouts still must
**not** call `resetProlog` / `terminate()`, so siblings no longer fail with
`Kibi engine connection closed`; they may wait behind the in-flight goal.

To keep one read from holding the queue, set `KIBI_ENGINE_READ_TIME_LIMIT_MS`
and/or `KIBI_ENGINE_READ_INFERENCE_LIMIT` in the MCP server's environment (see
[engine read limits](cli-reference.md#engine-read-limits)). A bounded read runs
under SWI-Prolog `call_with_time_limit/2` and `call_with_inference_limit/3`, so
the engine stops it itself and serves the next queued request. A tool whose
read hit its limit returns an error envelope with `error.code`
`QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded`
(`{ "kind": "time" | "inferences", "limit": <n> }`); it never returns a partial
answer. Write requests are never bounded, but the read-only queries a write
tool such as `kb_upsert` runs before it writes are reads: under a limit they can
stop it with `QUERY_LIMIT_EXCEEDED` before anything is written.

On a detached HEAD that no single local branch points at, read tools answer
from a read-only snapshot of the checkout and add a `detached_head_read_only`
warning diagnostic (commit, branches at HEAD, store path, `writes:
"refused"`); write tools fail with instructions to check out a branch or set
`KIBI_BRANCH`. See [`kibi branch`](cli-reference.md#kibi-branch).

Discovery tools (`kb_query`, `kb_search`, `kb_status`) may opt into
`agentVisibleStructuredData` so envelope `data` is also embedded in `content`
text for hosts that hide `structuredContent`.

### `kb_skills`

Read bundled Kibi agent skills for progressive disclosure. Read-only; does not mutate the KB or require Prolog. The CLI peer is `kibi skill --input -`; the narrower `skills-list`, `skills-load`, and `skills-read` routes remain.

**Parameters:**
- `action` (required): `list`, `load`, or `read`.
- `id` (required for `load` and `read`): Bundled skill ID. Example: `'kibi-usage'`.
- `resource` (required for `read`): Manifest-declared resource path. Example: `'resources/fact-lanes.md'`. Arbitrary file paths are not exposed.

**Returns:**
The payload of the routed operation plus `action`:
- `list`: skill manifests with `id`, `name`, `version`, `description`, and declared `resources`.
- `load`: the skill bundle with `manifest`, `body`, `resources`, `hash`, and `sourceType`. The visible text lists the declared resources so agents can discover follow-up `read` calls without guessing paths.
- `read`: the resource contents as text.

**Example:**
```json
{
  "action": "read",
  "id": "kibi-usage",
  "resource": "resources/fact-lanes.md"
}
```

### `kb_find_gaps`

Run curated missing/present relationship analysis over KB entities.

**Parameters:**
- `type` (optional): Entity type filter
- `missingRelationships` (optional): Required-to-be-absent relationship types
- `presentRelationships` (optional): Required-to-be-present relationship types. In both lists a relationship counts in either direction, and `verified_by` and `validates` (its documented inverse for req/scenario ↔ test links) satisfy each other: a requirement whose test `validates` it is not a `verified_by` gap. `relationshipCounts` still counts each relationship name separately.
- `tags` (optional): Tag filter
- `sourceFile` (optional): Source-file substring filter
- `limit` / `offset` (optional): Pagination controls

**Returns:**
`rows` (the requested page, each with its relationship counts), `count` (matching rows before pagination), `summary` (`total`, the same number, and `provenanceStubs`: the bootstrap facts tagged `bootstrap:provenance-stub` that match the filters but are counted apart from knowledge and left out of `rows` unless `tags` names that tag), and `meta` (status metadata).

**Example:**
```json
{
  "type": "req",
  "missingRelationships": ["specified_by", "verified_by"],
  "sourceFile": "src/auth"
}
```

### `kb_coverage`

Generate curated structural coverage and conservative end-to-end requirement proof reports.

**Parameters:**
- `by` (optional): `req`, `symbol`, or `type`
- `tags` (optional): Tag filter
- `includePassing` (optional): Include requirements with a proven or not-applicable proof outcome in addition to rows that still require repair
- `statuses` (optional, req mode): Requirement proof-status filter (`proven`, `missing`, `unresolved`, `not_applicable`); selecting statuses implies include-passing and returns only rows whose `proofStatus` is listed. `not_applicable` rows carry their typed applicability reason in `proofStages.applicability.reason`. The summary always reflects the whole KB.
- `includeTransitive` (optional): Include transitive symbol coverage
- `includeMigrationPreview` (optional): Add a deterministic read-only legacy proposition migration preview
- `migrationLimit` / `migrationOffset` (optional): Page ready semantic-inventory requirement batches; the default limit is one and the maximum is ten
- `migrationPredicateLimit` / `migrationPredicateMinScore` (optional): Bound exact predicate-schema candidates retained per proposition
- `limit` / `offset` (optional): Pagination controls

**Returns:**
Coverage summary rows, status metadata, and—when `by: "req"`—a deterministic `kibi.repair-plan.v1` read-only migration plan.

For requirement coverage, summaries distinguish evaluated must-priority requirements from rows marked `notApplicable`. Requirement rows retain compatibility-oriented `coverageStatus` and add a separate `kibi.requirement-proof.v3` result with `proofStatus` (`proven`, `unresolved`, `missing`, or `not_applicable` for a non-current requirement), inspectable `proofStages`, blocking `proofGaps`, non-blocking `proofAdvisories`, and ranked `proofRepairs`. A row is proven only when semantic inventory and grounding, contradiction analysis, every linked scenario's qualifying fresh passing E2E receipt evidence, executable test symbols, production ownership/coverage, and exact source coordinates all pass. Every linked E2E proof-bearing test is mandatory: missing, stale, failed, invalid, snapshot-unavailable, or contract-mismatched evidence remains a blocking `proofGap`, with per-scenario diagnostics in `proofStages.passingE2e.scenarioObligations`. Unit/integration-only ancillary evidence remains nonblocking when the scenario has qualifying E2E evidence. A proven row never includes blocking `proofGaps`.

`repairPlan` turns those row-local gaps into dependency-ordered batches across the returned requirement scope. Each batch identifies one requirement and phase, groups same-phase repairs, declares `state: ready|blocked`, lists prior `dependsOn` batches, and carries `workflowSteps`, targeted `validationRules`, and a conservative write policy. Plans are always `readOnly: true`; batches are always `autoApplicable: false`, so callers must query current endpoints, review semantic choices, validate payloads, and execute upserts sequentially. `scope.complete: false` and `status: partial` mean pagination omitted actionable requirements; rerun with `offset: 0` and a larger `limit` before treating the result as a project migration plan. `planId` remains stable for the same snapshot, filters, proof evidence, and gaps while volatile receipt age/check-time fields are ignored.

With `includeMigrationPreview: true`, `legacyMigrationPlan` adds the versioned `kibi.legacy-migration-plan.v1` review surface. It selects only ready semantic-inventory repair batches, defaults to one requirement, binds normalized authored Markdown to an exact SHA-256 hash and UTF-8 spans, and gives every proposition one recommended lane or explicit unresolved disposition. Ranked candidates preserve exact schema identity, signature, origin, polarity, binding status, and unbound arguments, but never produce an applicable write. Authored prose is previewed in requirement-only `semantic_text`, while an independent `text_ref` remains unchanged; a differing pre-existing `semantic_text` blocks the batch as semantic source drift.

The passing-E2E stage evaluates append-only proof-receipt history. New evidence is produced by `kibi prove` as `kibi.proof-receipt.v1`. A current receipt must bind the test and its typed scope, integration command argv, contract hash, execution fingerprint, deterministic current code snapshot, canonical environment hash, timestamps, outcome, artifact digest, and observed proof results. The newest receipt for the live snapshot, current contract hash, and current fingerprint must be passing and no older than seven days. Missing, wrong-snapshot, stale, failed, malformed, mismatched, future-dated, or snapshot-unavailable evidence cannot prove the requirement; durable test status remains structural metadata.

Symbol rows distinguish production symbols from executable test symbols. Executable-only symbols are not applicable to production coverage; mixed-role symbols are uncovered and carry an explicit role error.

**Example:**
```json
{
  "by": "req",
  "includePassing": false,
  "includeTransitive": true
}
```

### `kb_graph`

Run bounded graph traversal from one or more seed IDs.

**Parameters:**
- `seedIds` (required): Starting IDs
- `relationships` (optional): Relationship filter
- `direction` (optional): `outgoing`, `incoming`, or `both`
- `depth` (optional): Maximum traversal depth
- `entityTypes` (optional): Filter returned nodes by type
- `maxNodes` / `maxEdges` (optional): Traversal bounds

**Returns:**
Nodes, edges, truncation flag, and status metadata.

**Example:**
```json
{
  "seedIds": ["REQ-cli-gc"],
  "direction": "both",
  "depth": 2,
  "maxNodes": 100,
  "maxEdges": 200
}
```

### `kb_sparql_remote`

Registered only when `KIBI_MCP_OPTIONAL_TOOLS` names it (or is `all`); the `kibi sparql-remote` CLI route is always available.

Run an opt-in SPARQL `SELECT` query against an external HTTP(S) SPARQL endpoint. This tool is remote-only: it does not query Kibi's local RDF store directly, does not start a local SPARQL endpoint, and does not store credentials.

**Parameters:**
- `endpoint` (required): Remote SPARQL endpoint URL. Must start with `http://` or `https://`; local file paths are rejected.
- `query` (required): SPARQL `SELECT` query text.
- `timeoutMs` (optional): Positive timeout in milliseconds for the remote request.

**Returns:**
Rows returned by the remote endpoint, serialized as structured MCP content. Network availability, endpoint rate limits, and remote endpoint authentication requirements are outside Kibi's control.

**Example:**
```json
{
  "endpoint": "https://query.wikidata.org/sparql",
  "query": "SELECT ?item WHERE { ?item wdt:P31 wd:Q146 . } LIMIT 5",
  "timeoutMs": 15000
}
```

## Internal Prolog Implementation Notes

Kibi's Prolog core may use maintained SWI-Prolog libraries such as `library(aggregate)` for count/reporting helpers and `library(chr)` for isolated derived-fact pilots. These are internal implementation details and do not change public KB semantics, MCP response shapes, or the canonical validation rules unless a future release explicitly documents such a change.

### `kb_upsert`

Create or update a single entity and optional relationships in one call. When
the caller has a filesystem-capable context, the mutation is source-first: the
tracked entity document and relationship shard are authored transactionally,
then the compiled branch store is updated. Kibi never stages or commits those
working-tree files for Git.

**Parameters:**
- `type`: Entity type enum
- `id`: Entity ID
- `properties`: Entity fields, including required `title` and `status` (status values depend on entity type; legacy values may still be accepted for compatibility). For `symbol` entities this may include `sourceFile`, `symbol_role`, and `granularity_reason`; for `fact` entities this includes typed fact fields such as `fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, and one matching `value_*` field.
- `relationships` (optional): Relationship rows with enum-backed `type`, `from`, and `to`
- `dryRun` (optional, default `false`): Validate the payload and write nothing. See [Dry run](#dry-run-validation).
- `document` (optional): `{ path?, body? }` for an explicit tracked source
  target. Existing entities preserve their current body when `body` is omitted;
  new requirements default the body to `semantic_text`. New entities without a
  unique configured target must provide `document.path`.

`symbol_role` values are `behavioral`, `structural`, `type-shape`, `config`, `module`, and `unknown`. Use `behavioral` for manual anchors when behavior is hidden inside factory/expression composition and the extractor cannot create a narrower symbol.

`properties.origin` (optional, every type) records provenance: `{kind: human|agent|migration|import, ref?, approved_by?, recorded_at?}`. A new entity written without it is recorded as `{kind: agent, recorded_at: <write time>}` (a dry run validates a supplied origin but does not add the default to `normalizedPreview`). An update without it never changes the stored origin, and an entity that has none keeps none. A supplied origin is written as given; a missing `recorded_at` gets the write time. See `docs/entity-schema.md#entity-origin`.

For current requirement writes with assertive prose, mutation fails closed unless the payload preserves the complete advisor ledger and source contract. A relationship-only update of an existing requirement does not need to resend the ledger: when the payload carries no `semantic_*` or `logic_claims` field and any `title` or `text_ref` it sends equals the stored value, Kibi merges the stored ledger (`semantic_text`, `semantic_clauses`, `semantic_inventory`, `semantic_inventory_version`, `semantic_source_field`, `semantic_source_hash`, `logic_claims`) and the stored `text_ref` when the payload omits it under the payload, then runs the proposition-complete check on the merged requirement. For example, `{"type":"req","id":"REQ-x","properties":{"title":"<stored title>","status":"open"},"relationships":[{"type":"specified_by","from":"REQ-x","to":"SCEN-x"}]}` links a scenario and keeps the ledger. A payload that supplies any ledger field, or changes `title` or `text_ref`, is checked exactly as sent. Every assertive claim key must appear exactly once in `logic_claims`; every `modeled` entry must have exactly one logical relationship whose target fact carries that same key. Explicit unresolved statuses are accepted as honest inventory states but do not make the requirement proof-complete.

**Returns:**
Confirmation of entity creation/update and relationship creation counts. Successful responses may also include `structuredContent.semanticAdvisor` and `structuredContent.warnings`. Modeling suggestions remain reviewable, while proposition accounting and source/grounding integrity are blocking for applicable requirement writes.

### Dry run validation

Call `kb_upsert` with `dryRun: true` to validate a payload without mutating the KB (catalog operation `kb_validate_upsert`; CLI `kibi upsert` with `"dryRun": true`, or `kibi validate-upsert`). This read-only preflight returns `valid`, `errors`, `warnings`, `semanticAdvisor`, and `normalizedPreview`, plus `dryRun: true` and `skippedEffects: ["kb-write", "workspace-write"]`. With a store attached it runs exactly the validation a real `kb_upsert` runs before its first write: schema, append-only proof receipts, relationship sources and live targets, symbol granularity, strict-lane pairing, supersedes direction, proposition completeness, grounding claim keys and predicate argument vocabulary. For a `req` it then previews the commit-time contradiction check: the entity and its relationships are staged in a transaction that is always rolled back and `check_req_contradiction` runs against that staged store, so a payload the commit would refuse with `Contradiction detected … (stage=contradiction_check)` is reported `valid: false` with the same message (`_skipContradictionCheck` skips the preview as it skips the commit check). A dry run therefore rejects what the write would reject as far as the store can tell. It writes nothing, so it cannot report what only a write reveals: `DOCUMENT_PATH_REQUIRED`, filesystem, lock and pending-receipt failures, a concurrent writer, or findings of `kb_check`-only rules such as `logic-coverage` and `scenario-feasibility`. Without a store it runs only the store-independent checks.

`semanticAdvisor` includes a version, payload hash, source-bound inventory contract, proposition ledger, logic readiness, candidate lane, detected signals, ambiguity witnesses, modeling suggestions, and suggested next tools. A valid preflight proves source accounting at the ingestion boundary; contradiction checks and proof evidence are still separate proof stages.

When invoked through MCP, the dry run also attaches to Prolog and validates live relationship endpoint types before mutation. Invalid tuples such as `verified_by fact -> test` are rejected in preflight with the same relationship guidance `kb_upsert` would return.

### `kb_delete`

Delete one or more entities by ID, or retract exact relationship triples. The
two modes are mutually exclusive. Relationship deletion preflights the whole
batch, preserves endpoints and unrelated edges, and handles legacy relationship
shards through Kibi internals.

**Parameters:**
- `ids`: Array of entity IDs to delete
- `relationships`: Array of exact `{type, from, to}` triples to retract

Provide exactly one non-empty array; `ids` and `relationships` cannot be mixed.

**Returns:**
The response includes `relationships_deleted`, per-selector results, and
`sourceWrites` when a canonical shard was patched. Authored entity deletion
returns a hash-bound `kibi.entity-deletion-plan.v1`; apply that plan through
`kb_apply_plan` after approval. Requirements normally return a `supersedes`
evolution plan instead of destructive deletion. Never edit `.kb/relationships`
directly.

Authored entity deletion deletes nothing in the `kb_delete` call itself and
still returns `status: "success"`, because the call worked: it returned a
plan. Read the counts and `errors`, not the status: `deleted: 0` with
`skipped` above zero means nothing was removed, and `errors` carries the
reason. For other entities it says the plan must be applied through
`kb_apply_plan`; for an authored requirement it is the refusal ("Authored
requirements require an explicit supersession plan…"), and the returned
`deletionPlan` carries `supersessionRequired: true`, which `kb_apply_plan`
refuses with `REQUIREMENT_SUPERSESSION_REQUIRED`.

### `kb_check`

Run KB validation rules after mutations. Agents can also opt into read-only changed-file impact diagnostics for source edits while the edit context is still fresh. The MCP tool and CLI JSON route are peer interactive gates; CLI staged checks and git hooks remain the commit-time enforcement gate.

**Parameters:**
- `rules` (optional): Validation rule subset. The allowed names are maintained in `packages/core/schema/rule-registry.json` (single source for the tool schema, the TS rule registry, and the Prolog check dispatch): `must-priority-coverage`, `symbol-coverage`, `symbol-traceability`, `no-dangling-refs`, `source-relationship-parity`, `branch-store-not-compiled`, `source-path-dangling`, `no-cycles`, `required-fields`, `deprecated-adr-no-successor`, `superseded-requirement-open`, `scenario-feasibility`, `scenario-feasibility-unknown`, `exception-claim-keys`, `numeric-string-value`, `rule-key-arguments-missing`, `domain-contradictions`, `logic-coverage`, `rule-safety`, `rule-verifiability`, `query-plan-safety`, `req-status-vocabulary`, `strict-fact-shape`, `strict-req-fact-pairing`, `predicate-verifiability`, `strict-readiness`, `semantic-completeness`, `related-requirement-unmodeled`, `proof-contract-symbols`, `entity-id-style`, `domain-redundancy`, `domain-implication`, `subject-key-identity`, `subject-key-shape`, `ontology-quality`, `exception-unapproved`, `exception-approval-self-attested`, `agent-requirement-unapproved`, `requirement-rationale-missing`, `entity-context-missing`, `entity-context-acknowledged`, `symbol-owner-superseded`, `adr-unlinked`, `adr-proposed`, `predicate-schema-conformance`, `policy-ownership`, `policy-markers`. Canonical rules populate blocking `violations[]`. When the current branch's store was never compiled (missing, or empty at journal sequence 0) while `.kb/` holds authored sources, `kb_check` returns only the `branch-store-not-compiled` violation, naming `kibi sync`, plus a `migrationPlan` whose automatic `branch-store-compile` action runs it; every other rule would read an empty KB. The vocabulary-convergence rules (`entity-id-style`, `domain-redundancy`, `subject-key-identity`, `subject-key-shape`, `predicate-schema-conformance` as warnings; `domain-implication`, `ontology-quality` as info) are advisory, run by default, and report non-blocking `qualityDiagnostics` whose `evidence.witnesses` carry exact requirement IDs, fact IDs, and signatures; see `docs/cli-reference.md` for their precise definitions. `kb_check` never imports capability plugins, so these results are deterministic and offline. `policy-ownership` and `policy-markers` are canonical but inert unless a package is activated for `kibi.check-policy.v1` (such as the experimental `kibi-plugin-ui`); Kibi then reads that package's policy JSON as data and blocks production symbols in the policy's file set that implement no current requirement grounded in its predicates (`policy-ownership`), and implementing files that lack a marker the KB declares for their requirement's pattern (`policy-markers`). An activated policy that cannot be read blocks under the first selected policy rule. `domain-redundancy` is suppressed for pairs linked by `supersedes` or `restates`. `req-status-vocabulary` rejects requirement statuses outside the canonical+legacy vocabulary (`open`, `in_progress`, `closed`; legacy `active`, `approved`) — e.g. ADR vocabulary such as `accepted` compiles but silently falls out of the proof ladder. `scenario-feasibility` blocks on a success scenario whose assumed values cannot hold, alone or together, with what the current requirements governing it require through `requires_property` facts or typed `requires_rule` rules, within each constraint's scope and validity window (each witness names a minimal set of requirements, assumption facts and requirement facts), unless an exception requirement with a non-empty `approved_by` exempts the requirement (only the clauses in its `exempts_claims`, when set); `scenario-feasibility-unknown` is advisory and lists success scenarios whose feasibility cannot be decided (no `assumes`, assumptions that contradict each other, an assumed property no governing requirement constrains, a type, unit or operator that cannot be compared, governing requirements with no common value, a governing rule the assumptions neither satisfy nor refute, or a conflict only with constraints whose validity window may not cover the scenario). `exception-claim-keys` blocks on an exception whose `exempts_claims` names a key that is not a claim of a requirement it exempts. `numeric-string-value` is advisory and lists `property_value` facts that store a plain decimal as `value_type: string` where the comparison is numeric, since strings are never coerced and such facts drop out of contradiction and feasibility checks. `exception-unapproved` (an exception that `exempts` a requirement but has no `approved_by`), `exception-approval-self-attested` (an agent-authored exception whose `approved_by` is not corroborated by `origin.approved_by` and `approval_ref`) and `agent-requirement-unapproved` (info; agent-authored current requirements without `origin.approved_by`, at most 25 per check plus one summary) are advisory approval checks. `superseded-requirement-open` blocks a requirement that another requirement `supersedes` unless its status is `closed`, and reports requirements that supersede each other (directly or through a chain) once per cycle, naming every member; `no-cycles` follows only `depends_on`. `source-path-dangling` blocks an authored `source` field that names neither an existing workspace path (a `#anchor` suffix is ignored), an existing entity id, nor an http(s) URL; a missing `source` is allowed. The authored field is dead data (the compiled `source` is always the entity's own file and `kb_upsert` never writes the field), so each finding names its automatic fix: `evidence.rewrite` for a pre-canonical `documentation/<lane>/...` or `<lane>/...` value whose file exists under `.kb/<lane>/` and is not the entity's own file, otherwise `evidence.remove` (`self` for a value naming the entity's own file, `dangling` for one Kibi cannot map), plus `evidence.refused` when the edit is not safe. The migration plan turns superseded requirements into a `close_superseded_requirements` automatic action plus one `review_supersession_cycle` per cycle, and dangling sources into the automatic `source_path_rewrite` action (whose evidence lists `rewrites` and `removals`); only a value with `evidence.refused` becomes a `review_source_path_dangling` review. `symbol-owner-superseded` (a symbol whose every `implements` target is superseded or deprecated; at most 25 per check plus one summary), `adr-unlinked` (an accepted ADR no requirement or ADR links with, in either direction), `adr-proposed` (info: an ADR still `proposed` and not superseded) and `requirement-rationale-missing` (a current requirement with `origin.kind` `human` or `agent` and no `rationale` field, no `## Rationale`/`## Why` section and no ADR link; at most 25 per check plus one summary) are advisory lifecycle checks. `entity-context-missing` is canonical and blocks a current `req`, `scenario`, `test`, `adr` or observation/meta `fact` with no body context (see `docs/entity-schema.md`, Body contract); `entity-context-acknowledged` (info) counts the entities the schema 8 migration acknowledged (tagged `review:context-missing` and listed in `.kb/manifest.json`); the tag on any other entity is a violation. `kb_upsert` returns the same finding as a warning, including on dryRun. `subject-key-identity` also reports one subject or claim minted as several active facts (the same `subject_key`, or the same `subject_key`, `property_key`, `operator`, `polarity` (absent means `require`), typed value and `unit`; facts linked only by superseded or deprecated requirements are not counted), and `subject-key-shape` also reports property keys that number a clause (`clause_03_...`). `rule-key-arguments-missing` is advisory and names, for each opposing rule pair that is `unresolved` only because a condition predicate declares no `key_arguments`, the predicate (`namespace:name/arity`) and the key positions that would decide the pair. `strict-fact-shape` is a canonical blocking check as of schema 7. `strict-req-fact-pairing`, `predicate-verifiability`, and `proof-contract-symbols` are advisory modeling checks: they run by default and report as non-blocking `qualityDiagnostics`. A requirement that `constrains` a subject fact is paired either by a `requires_property` fact on the same `subject_key` or by a `requires_predicate` fact about that `subject_key` (the grounding a `replace_grounding` plan leaves): the predicate fact's own `subject_key`, else the argument its project-local `predicate_schema` names `subject` (any position), else its first argument when neither is declared, so `strict-req-fact-pairing` and `strict-readiness` report neither. `proof-contract-symbols` reports unresolved `required_proofs.symbol_id` values, type-shape required proofs, and `proof_bindings.source_file` disagreement with the named symbol `sourceFile`; Kibi does not infer TEST names from filenames. Migration diagnostics (`strict-readiness`, `semantic-completeness`) run only when explicitly selected. `related-requirement-unmodeled` is canonical and blocks a current requirement whose ledger still has `status: missing` propositions while it `relates_to` (either direction) a current requirement modeled with strict property or ground predicate facts; the finding names the modeled keys and asks for those propositions to be modeled against them or for a `supersedes` decision (requirements without a ledger, classified ledgers, unmodeled neighbours and superseded neighbours are not reported). `logic-coverage` is enabled by default, validates explicitly declared requirement manifests against linked ground facts, and leaves requirements without a manifest as gradual-backfill debt reported by quality diagnostics. `domain-contradictions` compares strict property constraints and exact opposite predicate polarities over the same namespace, predicate name, and ordered arguments. It does not infer arbitrary equivalence between differently shaped predicates.
- `sourceFiles` (optional): Repo-relative source paths to inspect for changed-file impact diagnostics.
- `staged` (optional): Inspect staged source changes when building impact diagnostics.
- `includeWorkingTreeDiff` (optional): Include unstaged working-tree content/diffs for the supplied `sourceFiles`.
- `includeImpactDiagnostics` (optional): Include changed-file diagnostics such as `symbol_granularity_violation` and `symbol_semantic_review_needed` in structured output.
- `maxDiagnostics` (optional): Cap returned impact diagnostics. Graph validation violations are not capped by this value.
- `workspaceRoot` (optional): Workspace root for impact diagnostics. Defaults to the MCP server workspace.
- `async` (optional, default `false`): Start the check as a background job and return a `kibi.job.v1` receipt (`jobId`, `status: "running"`, `pollWith: "kb_job_status"`) immediately instead of holding the request until the tool timeout. Use for full checks on large KBs that would exceed `KIBI_MCP_TOOL_TIMEOUT_MS`. This needs the opt-in `kb_job_status` tool (`KIBI_MCP_OPTIONAL_TOOLS=kb_job_status`); without it, `async: true` is ignored and the check runs synchronously. Poll `kb_job_status` until `status` is `succeeded` (full result under `result`) or `failed` (error under `error`). Jobs are process-local: they are not persisted and are dropped on server restart.

**Returns:**
Validation report with any hard violations found and suggested fixes. `structuredContent.violations[]` is the blocking correctness lane: graph, schema, contradiction, query-plan, and staged enforcement failures live there and continue to drive `count` and failure status. `structuredContent.qualityDiagnostics[]` is the additive audit-quality lane for non-blocking modeling, coverage-depth, symbol fanout, duplicate-coordinate, broad-requirement, status, strict-fact, and telemetry-acceptance review signals.

Rule filtering affects the audit-quality lane. When `rules` is omitted, MCP runs the normal full validation profile and also performs the full-KB audit-quality scan that populates `qualityDiagnostics[]`. When `rules` is supplied, MCP preserves the requested scoped validation and skips that full-KB advisory scan so iteration stays fast and predictable. Source impact diagnostics are independent: pass `includeImpactDiagnostics: true` with `sourceFiles` or `staged: true` when you need changed-file review during a filtered check.

When diagnostic mode has produced `.kb/usage.log`, the unfiltered scan evaluates `kibi.telemetry-acceptance.v1` over its latest 200 events. It ranks advisor/preflight bypasses, edits of requirement-linked files that no lookup preceded (from host hook rows), source lookup misses, stalled proof-gap recovery, receipt gaps, and repeated mutation failures as `category: telemetry` recommendations. Diagnostic callers may supply opaque `session_id` and `actor_id` metadata; when both evidence records expose an identifier, advisor/preflight correlation requires equality and never borrows evidence across an explicit boundary. Stale or incomplete evidence stays `insufficient_evidence`; absence of observable fields is never interpreted as a pass. A missing log is skipped because MCP diagnostic logging is opt-in. Use the CLI-only `kibi usage-metrics --format json --require-acceptance` route when a hard completion gate is required, and `kibi usage-remediation --format json` for exact read-only repair evidence.

Quality diagnostics use explicit `severity` and `blocking` fields. `severity: "review"` and `severity: "info"` are advisory and do not fail checks by default; `severity: "warning"` is still non-blocking unless `blocking: true`; `severity: "error"` or `blocking: true` is a hard failure signal. Existing hard violations remain in `violations[]` rather than being downgraded into the advisory lane.

When impact diagnostics are enabled, `structuredContent` also includes `impactDiagnostics`, `sourceFiles`, `extractedSymbols`, `linkedEntities`, and `nextActions`. Impact diagnostics follow the same blocking convention: advisory unless their severity is `error` or `blocking` is true. `symbol_granularity_violation` means a changed behavioral symbol has only coarse ownership when a narrower anchor is available and remains blocking. `symbol_semantic_review_needed` can fire even when graph coverage already exists; it tells the agent to inspect whether linked requirements, scenarios, and tests actually cover the changed behavior or UI copy. Kibi reports the linked entities and suggested MCP calls, but it does not prove prose semantics.

The structured check response also includes `migrationPlan`. Treat its actions
as typed evidence, not prose suggestions; apply only ready automatic actions
with an explicit hash/action approval through `kb_apply_plan`.

**Example:**
```json
{
  "sourceFiles": ["src/app/pages/upload/upload-page.component.ts"],
  "includeImpactDiagnostics": true,
  "includeWorkingTreeDiff": true
}
```

### `kb_job_status`

Registered only when `KIBI_MCP_OPTIONAL_TOOLS` names it (or is `all`).

Poll a background job started by a long-running operation called with
`async: true` (`kb_check` and `kb_apply_plan`). This tool is MCP-server-native: jobs
live in the server process, so there is no CLI counterpart and no persistence
across restarts.

**Parameters:**
- `jobId` (required): The `jobId` from the `kibi.job.v1` receipt returned by the async call.

**Returns:**
A `kibi.job.v1` object: `status` is `running`, `succeeded` (full result
envelope under `result`), `failed` (error message under `error`), or
`unknown` (no such job in this server process).

**Example:**
```json
{ "kb_check": { "async": true } }
{ "kb_job_status": { "jobId": "job-kb_check-1-9f2a" } }
{ "kb_apply_plan": { "plan": { "...": "..." }, "approvedPlanHash": "<64 hex>", "async": true } }
{ "kb_job_status": { "jobId": "job-kb_apply_plan-2-4c1d" } }
```

## Usage Telemetry (opt-in)

Kibi records no usage telemetry by default. Installing a host plugin, enabling
it, or running the MCP server never turns logging on. Until an operator opts in,
`.kb/usage.log` is not created and no row is written.

Opt in per workspace with either signal:

- `--diagnostic-mode` on the MCP command line, when you own that command line.
- `KIBI_DIAGNOSTIC_MODE=1` in the server environment, for hosts where a plugin
  owns the command line. Set it in the host's MCP server `env` block.

`KIBI_DIAGNOSTIC_MODE` is shared by every surface: the MCP server, the CLI JSON
routes (`kibi <route> --input`), and the Claude Code plugin hooks all honor it,
so exporting it once in the environment your agent host inherits covers all of
them. The older CLI-only `KIBI_CLI_DIAGNOSTIC_MODE=1` still works.

Opting out is removing the signal; no other state persists.

While opted in, every row carries `interface`, `host`, `package_version`, and
`workspace_root` so rows stay attributable across worktrees, hosts, and Kibi
versions. Host plugins set `KIBI_MCP_HOST` for attribution only; it is not an
opt-in signal and never enables logging on its own. CLI rows take `host` from
`KIBI_HOST` (or `KIBI_MCP_HOST`) and recognize Claude Code shells; otherwise
they record `unknown`. Rows record business arguments and agent-supplied
telemetry metadata, and the log stays local to the workspace under
`.kb/usage.log`.

The host plugin hooks (Claude Code, Cursor, Codex, ZCode, and OpenCode) add
rows with `interface: "hook"` under the same opt-in. They record the agent
activity around Kibi calls rather than Kibi operations, and every row names its
`host` and the host `session_id`, so one session's lookups and edits can be put
in order. All hosts write two kinds of row:

- `hook_action: "kb_usage"` when a tool call ran a Kibi operation, through MCP
  or a `kibi <route>` shell command, with the canonical name in `kb_operation`
  (`kb_search`, `kb_query`, …);
- `hook_action: "edited"` for each source, test, or `.kb/` file an edit tool
  changed (`path`, `path_kind`), with the requirements the file's symbols
  implement in `requirement_ids`. Docs, config, and generated paths are not
  recorded.

The Claude Code plugin also records whether a requirement snippet was shown or
suppressed and whether the session had used Kibi yet (`kb_used_before`).
Hook rows never enter the bounded window of operation events, so a busy
editing session never pushes operations out of it. The only metric that reads
them is `lookup_before_first_edit`: per host session, did a `kb_search` or
`kb_query` run before the first edit of a file with non-empty
`requirement_ids`? It is `not_applicable` when no hook recorded such an edit.

Counts are only recorded when they can be read. A call whose payload cannot be
parsed records `result_count: null` rather than zero, and acceptance metrics
treat unreadable counts as insufficient evidence instead of a pass.

## Discoverability

- MCP clients discover available tools through `tools/list`.
- MCP clients discover available prompts through `prompts/list` and `prompts/get`.
- Allowed static values are encoded directly in each tool's `inputSchema` enums.
- There are no separate runtime listing tools for entity or relationship types.

## Public Prompts

### `/kibi-bootstrap`

Interactive onboarding workflow for day-0 KB activation. It guides agents to interview the human about knowledge sources outside the code, call `kb_plan_bootstrap` with the declared sources and cited intent claims, ask at most four further bounded questions when requested by the planner, present the complete hash-bound plan for approval, call `kb_apply_plan` once, and finish with `kb_check`/`kb_status`.

## Branch Behavior

- The server attaches to the exact active Git branch name, or `KIBI_BRANCH`
  when set. Git-valid slash, Unicode, `@`, and `#` names are preserved
  verbatim.
- The compiled store lives at `.kb/branches/<sha256(exact-branch)>/` and is
  verified by a versioned `branch.json`. A missing store is compiled from the
  current checkout's tracked sources; Kibi never copies another branch store.
- Git remains the merge and conflict authority. Unresolved authored-file
  conflicts block compilation; Kibi does not select merge winners.
- Branch KBs are revalidated and updated automatically on branch change—no
  server restart is required for normal branch operations.
- You can override the branch selection by setting `KIBI_BRANCH` before
  starting the server; the value is validated without normalization.
- Branch garbage collection is not part of the public MCP interface. Use
  `kibi gc` or automation hooks; deleted stores are quarantined before any
  explicit purge.

### KB Auto-Refresh

For same-branch workflows, MCP validates the attached branch KB against filesystem stat metadata before attach-sensitive operations.
When MCP detects a KB replacement for the same branch, it triggers a controlled re-attach flow.

- The session stores an `attachedBranchStamp` at attachment time.
- MCP recomputes the latest branch stamp with `readBranchKbStamp` and compares it with `sameBranchKbStamp`.
- If stale, MCP runs a full `refreshAttachedBranchKb` attempt.
- For transient refresh failures, MCP retries through `refreshAttachedBranchKbWithRetry`.
- If recovery fails, MCP returns a `KbRefreshError` and the operation fails closed.

This behavior is important after external branch operations such as `kibi sync --rebuild`, where the branch KB snapshot can be replaced while the MCP process stays running.

## Workspace Routing

Hosts start an MCP server once per project and then let the agent work
elsewhere, most often in a git worktree. A server that stayed attached to the
checkout it started in would answer from another branch, and nothing in the
result would say so. Every Kibi tool call is therefore answered from the
workspace the caller is working in, decided per call:

1. An explicit `workspaceRoot` argument (every tool accepts it): the absolute
   path of the directory the call is about. Host plugins with pre-tool hooks
   (Claude Code, Codex, Cursor, ZCode) fill it in from the agent's current
   directory; any agent in any harness can pass its working directory.
2. Otherwise the client's MCP roots, when the client declares the `roots`
   capability: the first root that lies in a Kibi workspace. Roots are cached
   while the client reports `notifications/roots/list_changed` and asked for
   per call otherwise.
3. Otherwise the workspace the server is attached to.

A different workspace is served by a child `kibi-mcp` started there: the
workspace's own project-local install when it has one, so the child matches
that branch's code, else this server's entry. Children are pooled (at most
four), reused across calls, and retired after ten idle minutes; the first call
into a workspace pays its start (one to two seconds) and, for a branch store
that was never compiled, the compile that any attach pays. An async `kb_check`
started in a child is polled by `kb_job_status` in the same child. A routed call
is logged, in diagnostic mode, by the child in that workspace's `.kb/usage.log`.

Routing is limited to worktrees of the attached repository (same git common
directory), directories under the client's declared roots, and the
`KIBI_MCP_ROUTABLE_ROOTS` allowlist (path-delimited). Anything else, a directory
no Kibi workspace owns, or a child that fails to start is answered from the
attached workspace with a `workspace_mismatch` diagnostic:

```json
{
  "code": "workspace_mismatch",
  "severity": "warning",
  "message": "Answered from /repo, not from the requested workspace /other: ...",
  "detail": {
    "requested": "/other",
    "resolved": "/other",
    "answeredFrom": "/repo",
    "reason": "not_routable"
  }
}
```

`reason` is one of `pinned`, `not_a_kibi_workspace`, `not_routable`, or
`unavailable`. A successful route adds nothing to the result; the tool list is
always the attached server's.

`KIBI_WORKSPACE` (or `KIBI_PROJECT_ROOT`, `KIBI_ROOT`) pins the server to one
workspace and disables routing; `KIBI_MCP_ROUTING=0` disables it without
pinning. Host plugin launchers set `KIBI_MCP_ATTACH_ROOT` to the session's
workspace and start the server there; unlike the pinning variables it leaves
routing enabled. Routed children run with `KIBI_MCP_ROUTED=1` and never route further.
For `kb_check`, a `workspaceRoot` that no Kibi workspace owns keeps its older
meaning: the tree to inspect for impact diagnostics. The CLI JSON routes do not
take `workspaceRoot`; they run in the current directory, which makes them the
fallback when a result reports a mismatch.

## Recommended Agent Workflow

1. **Interactive Bootstrap**: Start with the `/kibi-bootstrap` workflow, inspect typed status, and let `kb_plan_bootstrap` return any bounded context questions. Always preview candidates for user approval before applying.
2. **Gather Context**: Use `kb_search` for discovery (ask it a direct question or decompose broad tasks into focused probes; read `data.answer` for the governing requirements) and `kb_query` for exact follow-up.
3. **Inspect Freshness**: Use `kb_status` when branch or stale-state confidence matters.
4. **Analyze**: Use `kb_find_gaps`, `kb_coverage`, and `kb_graph` for curated reporting.
5. **Check Source Impact**: After meaningful source edits, run `kb_check` with `sourceFiles`, `includeImpactDiagnostics: true`, and `includeWorkingTreeDiff: true` before deciding whether requirements/tests/symbol links need updates.
6. **Execute Changes**: Model prose with `kb_model`, preflight with `kb_upsert` and `dryRun: true`, then use `kb_upsert` to create/update entities and relationships.
7. **Validate**: Run `kb_check` after structural changes. Use explicit `rules` during iteration for scoped validation; run an unfiltered `kb_check` before completion to include the full-KB `qualityDiagnostics[]` audit scan.
8. **Clean Up**: Use `kb_delete` only for intentional removals after validating dependencies.

**Modeling note:** Use `flag` for runtime/config gates. Bug and workaround notes belong in `fact` entities, usually with `fact_kind: observation` or `meta`. **Strict facts** drive contradiction checks; observation/meta are non-blocking notes.
## Error Handling

The MCP server returns structured errors for:
- Invalid parameters (missing required fields, invalid enum values)
- Referential integrity violations (attempting to delete entities with dependents)
- Branch KB startup/attach failures
- Validation failures

Always check error responses before proceeding with more mutations. For common validation failures and recovery payloads, see `docs/error-reference.md`. In particular, strict fact writes must use `subject_key`, `property_key`, `value_type`, and exactly one typed `value_*` field; do not use `subjectKey`, `propertyKey`, or generic `value` in `kb_upsert.properties`.

## Determinism Guarantees

- Query results are sorted and de-duplicated for consistency
- MCP responses use explicit field names and fixed shapes
- Validation output is stable across repeated runs on unchanged KB state
