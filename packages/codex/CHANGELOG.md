# kibi-codex

## 2.9.0

### Minor Changes

- 01c1dbd: The kibi-usage skill (2.36.0) now teaches agents to model the dimension of a quantified claim instead of its verdict. A claim that says every, each, all, at most, exactly, a role, a status or a count is grounded on an integer count or bound, a set or a typed rule over a variable, not on `= true`, so Kibi has something that can vary. The skill tells agents to act on the advisor's unrepresented quantifier or numeric cue, and to try an integer count with `kb_model` (`mode: "requirement"`) before settling for an ontology gap.

  Requirements are now specified by scenarios that carry their inputs. Each scenario sets `expects` and assumes its own `property_value` fact on the grounding's subject and property: a success scenario with an allowed value, at least one rejection or error scenario with a forbidden value, and zero, one and many cases for quantified claims. The skill states that an assumed forbidden value is linked only from the scenario and does not contradict the requirement.

  SkillOpt gains two quantified-claim cases in the rule-lane-modeling family, scored on a non-boolean grounding and on rejection and success scenarios that assume their inputs.

## 2.8.8

### Patch Changes

- a4f7f6b: Exhaustive proofs can now cover a catalog: `domain_source` takes a `field` key, and when the export is a list of records Kibi reads that field of each record as the domain member (an operation catalog's `name`, for example), in TypeScript, JavaScript and Python. A record without the field fails the read, and `field` is accepted only for `kind: exhaustive`.

  Regex and string proofs can now read one field of an object: a dotted `pattern_source.export` such as `BRAND.name` walks the export's fields (object keys, dict keys or class attributes) and names the missing field when one is absent. A proof file that imports `BRAND` counts as importing `BRAND.name`, for exhaustive domains as well.

- 8aea1b0: Source proofs can now prove the order of a list. A set fact with property `precedes` and operator `includes` lists pairs spelled `"A -> B"`; it holds when Kibi's read of the source has both A and B and every A comes before every B, and a failed check names the items that are out of order or missing. JSON and YAML sources take a new `field` key with `select: items`, which reads one key of each list item in document order (for example the `run` command of each workflow step).

  An arithmetic `value_source` export can be dotted (`POLICY.eventLimit`) to read one field of an object export, in TypeScript, JavaScript and Python.

  The kibi-usage skill (2.33.0) documents `field`, `precedes` and dotted exports.

- f3150b5: `kb_search` can now suggest which requirements a weakly answered question probably means, found by meaning instead of shared words. Install the optional `kibi-plugin-search-hints` and activate `kibi.search-hints.v1` in `replace` mode under `package.json` `kibi.plugins`. When the intent answer abstains or its top score is below 0.44, `queryAnalysis.hints` lists up to ten current requirements (a hit on a scenario, test or fact is shown as its requirement, under `via`) and the text names the first five. Hints never change the ranked results, the answer layer or abstention, and `hints: false` turns them off. On Kibi's own KB, 20 reworded questions found the right requirement 2 times in the top three; with hints it is shown 14 times.
  - New package `kibi-plugin-search-hints` bundles the MIT-licensed potion-base-8M static embedding (about 7.7 MB, int8) with a pure JavaScript tokenizer checked against the upstream one. It needs no network, native code or download, and caches entity vectors in Kibi's runtime directory, rebuilding only entities whose text changed. It is optional and not part of the default install.
  - `kibi-plugin-sdk` adds the `kibi.search-hints.v1` capability and `validateSearchHintsResult`: a provider may name only the entities it was given, at most 20, scored between 0 and 1 in score then id order. `augment` mode is rejected for it.
  - A provider that throws, times out, returns an invalid result or cannot load gives no hints and a diagnostic; the search still answers.
  - `kb_plan_bootstrap` offers `kibi-plugin-search-hints` once the KB holds 50 or more requirement documents. Plugin offers now carry the `mode` to activate them in. The `kibi-usage` and `kibi-bootstrap` skills cover hints and the offer.

  Migration: none required. Without the plugin, `kb_search` answers exactly as before.

## 2.8.7

### Patch Changes

- a84493d: Symbol coordinates no longer cause merge conflicts. `.kb/symbol-coordinates.yaml` is now a local cache that every `kibi sync` derives from source; it is gitignored and never committed. Before, each coordinate record carried a hash of its whole source file, so any two branches that edited the same source file conflicted on it, even when they touched different declarations.

  What changes for you:
  - `kibi init` adds `.kb/symbol-coordinates.yaml` to `.gitignore`. Every `kibi sync` refreshes the cache incrementally, re-extracting only symbols whose source or identity changed, and never rewrites `.kb/symbols.yaml`.
  - The staged check judges symbol evidence by the declaration titles in the staged `.kb/symbols.yaml`. When those titles cover every declaration of a staged source file, that is impact evidence for it, so a body-only edit to a modeled symbol now commits with only the `symbol_semantic_review_needed` warning instead of needing a coordinate refresh staged with it. A renamed or added declaration that `.kb/symbols.yaml` does not list still fails, and the message names the uncovered and stale titles.
  - `kibi check-generated --staged` checks only the `.kb/symbols.yaml` layout and rejects a commit that stages the coordinate cache.
  - Schema 13: `kibi migrate` adds the gitignore entry and removes a committed `.kb/symbol-coordinates.yaml` from the Git index while keeping the local file. Commit the result once; until then `check-generated` blocks commits in repositories that still track the file.
  - The reviewed refresh gate for Python decorator coordinates is retired, since there is no committed coordinate refresh left to review.

## 2.8.6

### Patch Changes

- 90e1657: Source proofs no longer prove false claims about module paths, routes and file captures, and they read real projects' schemas, validators and middleware.

  Fixed, where a false claim could be proved:
  - Set fact members that contain a slash (`rxjs/operators`, `node:fs/promises`, `GET /api/users`, `finance/de`) were cut to their last path segment before Kibi compared them, so "the app must never import rxjs/operators" could prove while the app imported it. Members are now compared whole.
  - The environment extractor now reads through `as`, `<T>` and `satisfies` casts, so `(import.meta as X).env.FOO` is read and an environment object (or `import.meta` itself) handed to a variable fails the read instead of hiding later reads.
  - A glob that matches no file, and SQL migrations with no `CREATE TABLE`, now fail the read, so a mistyped pattern cannot decide a `subset_of` or `excludes` fact over an empty set.
  - A `required_fields` or `nullable_fields` fact with `subset_of` or `excludes` is refused with a reason instead of being compared with whatever members the contract selected.

  Readers:
  - The SQL migration replay reads quoted and schema-qualified names (`"public"."messages"`), several actions per `ALTER TABLE`, `ADD PRIMARY KEY` and `DROP CONSTRAINT` of a foreign key, keeps `$$` function bodies whole, and skips actions that change no column, nullability or foreign key (row level security, triggers, ownership, defaults, column types). Supabase migration folders now read.
  - The validator reader reads valibot objects, and any field that is a Standard Schema.
  - `names_from` names middleware that a zero-argument factory export makes (`requireAuthentication()`) after the factory.
  - The `thrown` extractor reads `throw createX()` as `createX`.
  - A glob `capture` with `**` reads `finance/de` instead of `finance/de/`.
  - A source read's dependencies follow tsconfig `extends` and workspace packages linked into `node_modules`, so a change in a sibling package stales the receipt.
  - A claim a source proof derives is bound with the new scope `source`.

  Modeling:
  - "Every X must have Y" becomes a `required_fields` fact only when the sentence names a schema (a table, object, model and similar, or the words field, column or property), so "Every organization must have an owner" stays a behavioural claim.
  - "A member can never become owner" models `member->owner` (the article was read as the state), and the machine may go unnamed.
  - Scoped package names (`@supabase/supabase-js`), "must be exactly A and B" sets and "at least 30 routes under /api/orgs" counts are recognised.
  - `kb_model` in requirement mode accepts the `includes`, `subset_of`, `excludes` and `matches` operators and a list `value` for set facts.

  The kibi-usage skill (2.32.0) and the proof guide describe the reader details, the empty-read rule and the minimum kibi-cli for the certificate builders.

## 2.8.5

### Patch Changes

- c118085: Formal proofs now reach the claims real services make about their routes, database schemas, configuration and code. A new `source` certificate proof kind lets Kibi read a project source itself and check a set fact against what it read, so the test only has to run:
  - `json` and `yaml` read keys, values or items at a path; `glob` reads matching files (or what each `*` matched); `openapi` reads operations, unsecured operations, security schemes or responses.
  - `references` reads environment variables, imports, calls, string arguments, thrown errors or property accesses from TypeScript, JavaScript and Python files. A member Kibi cannot read statically, such as a computed environment variable name, fails the read with its location instead of leaving it out.
  - `schema` reads tables, columns, required or nullable columns and foreign keys from Drizzle, Prisma or SQL migrations.
  - `routes` reads a Hono or Express app's routes and the middleware each route runs, including mounted routers.
  - `validator` reads a zod or pydantic schema's fields, required fields or optional fields.

  A receipt for a source proof goes stale when any file the read touched changes.

  Set facts gain the `subset_of` ("must be one of") and `excludes` ("must never use") operators alongside `eq` and `includes`. Field claims (`required_fields`, `nullable_fields`) accept `table.field` members, and a `middleware` fact with `includes` requires every matching route to run the listed middleware.

  State machine proofs decide temporal claims: a `reachable_pairs` fact with `excludes` ("a cancelled invoice can never become paid") and a `required_waypoints` fact ("every path from draft to paid must pass through approved"). Every machine projection accepts the four set operators.

  A `rule` contract can take a domain from a project source, and a predicate with `harness_for: [SYM-...]` proves its claim at the new `harness` scope when the predicate is a test harness that drives real code. `value_source` accepts `{source, measure: count}`.

  The semantic advisor and `kibi model` turn these sentence shapes into the matching facts. `kibi-cli/proof-certificates` adds `sourceCertificate` and `readProjectSource`.

  The kibi-usage skill (2.31.0) explains the new kind and operators. kibi-traceability (2.3.0) lists every certificate kind that reaches proved and the code or harness scope it needs, kibi-freshness (2.3.0) says a changed file a source proof read also leaves its receipt pending re-proof, and kibi-decisions (1.4.0) says a firm rule a certificate kind can check is proved by a certificate test.

## 2.8.4

### Patch Changes

- 4d55860: Claim-bound proofs are easier to adopt on an existing project.
  - A count claim over a collection reads the collection itself: a `value_source` entry with `measure: count` uses the size of a list, set, map or object export, so "exactly 32 tools" no longer needs a number export added beside the list just for the proof.
  - `kibi migrate`'s claim-binding reviews now list every modeled claim the test reaches through its scenarios, with the binding a certificate of its kind would get (provable, attested only, or why the kind cannot express the fact), instead of an empty list when no claim was provable as modeled.
  - The semantic advisor models "every member of S has P" requirements as a set fact named for P whose value is S, so the property stays in the requirement instead of only in the test.

  Deleting an `implements` relationship now also removes the target from a symbol's legacy `links:` list in `symbols.yaml` (dropping the list when it empties), so the deleted edge no longer comes back on the next `kibi sync --rebuild`.

  The kibi-usage skill (2.28.0) explains count measures and every-member claims.

- 42566ee: Formal proofs now reach claims that are not numbers. Three new certificate proof kinds read their model from the code and decide the claim exactly:
  - `rule`: Kibi calls the code's predicate functions (`predicate_source`) on every combination of the finite domains the code exports (`domains`) and model checks the claim's fact against that table. A `kibi.logic.v1` rule must hold for every assignment of its variables, a predicate fact (including decision predicates such as `permission_rule`) must be decided as it says, and a set fact whose property names a predicate needs it to hold for every member. A failure names the assignment that breaks the rule.
  - `state_machine`: Kibi reads a transition table or a `next(state, event)` function and checks the transitions, states, initial, terminal or reachable states a set fact names, exactly. Rules over a machine can use `transition`, `reachable`, `initial`, `terminal` and `state`.
  - `regex`: Kibi decides whether the code's pattern (a JavaScript `RegExp` or a Python `re.compile`) accepts exactly the strings a fact's pattern describes, with each engine's own semantics for anchors, `.`, `\d` and case folding, and reports the shortest string only one side accepts. Patterns outside the regular subset (backreferences, lookaround, word boundaries and similar) are refused with the reason. A string constant is checked against an exact string fact the same way.

  String facts gain the `matches` operator, and the semantic advisor models "X must match `re`", "X must be `value`" and "X transitions must be one of a -> b, ..." (and terminal, initial or reachable states) as facts these kinds prove. A `typecheck` proof of a set fact with `property_key: required_fields` checks that every member is a required, non-nullable field of the domain type. `kibi-cli/proof-certificates` adds `ruleCertificate`, `stateMachineCertificate`, `regexCertificate` and `failedCalls`.

  The kibi-usage skill (2.29.0) explains the new kinds.

- 4f06fd5: The kibi-usage skill (2.27.1) now links the full proof reference to its published page, https://looted.github.io/kibi/reference/proving.html, instead of a repository path that does not exist in the projects using Kibi.
- 03197d8: The kibi-usage skill (2.29.3) lists all seven certificate proof kinds (`exhaustive`, `typecheck`, `arithmetic`, `smt`, `rule`, `state_machine` and `regex`) where it explains which tests reach `proved`.
- c99f89b: Fixes for the certificate proof kinds and for running Kibi from inside a repository:
  - `kibi` run from a subdirectory of a Kibi workspace now uses the workspace's knowledge base (the nearest enclosing `.kb/manifest.json`), the way git finds its repository. Before, it compiled a second, empty branch store in the subdirectory, so queries returned nothing and `kibi prove` reported no proof integration. Relative `--input`, `--output`, `--certificates` and `--write-certificates` paths still resolve from where the command was typed. `kibi init` and an explicit `KIBI_WORKSPACE` keep the current directory.
  - A receipt whose certificate re-checks but derives none of the claims it names now records `evidence_level: tested`, the level coverage reports, instead of `proved`. The same holds for the `kibi prove` result rows.
  - Kibi compiles typecheck witnesses with the import resolution of the nearest `tsconfig.json` (`module`, `moduleResolution`, `paths` and similar), while the checking options stay fixed and strict. A project that resolves like a bundler no longer needs `.js` extensions in witness imports.
  - TypeScript is loaded from the package nearest the witness first. TypeScript 7, which ships without the compiler API, is skipped for an older install further up, and named in the rejection when there is none ("add typescript@6 as a dev dependency"), instead of being reported as missing.
  - A rejected `required_fields` claim names each field that breaks it ("deletedAt is optional or nullable", "x is not a field"), also when the test's own witness failed to compile.
  - A rejected arithmetic certificate, including a `measure: count` claim, names a value that satisfies the assumptions and breaks the claim ("count = 5 satisfies them and breaks it").
  - The typecheck exhaustiveness check reads the witness's syntax tree: a `never` type or a `satisfies` map counts, the word "never" in a comment does not. It now applies only to contracts without `proves`; with `proves`, Kibi checks each claim with its own witness.
  - Set facts gain the `includes` operator for "every member of the set has the property" claims, which the semantic advisor now proposes. Two `includes` facts on the same property never contradict, and one contradicts an `eq` set only when it names a member the `eq` set leaves out. Before, "every role in owner and admin can invite" and "every role in owner, admin and member can invite" were refused as a value conflict. The KB consistency certificates model `includes` as containment.

  The kibi-usage skill (2.29.1) describes the `includes` operator and the typecheck changes.

- bcbeebe: Follow-up fixes for the certificate proof kinds:
  - A `rule` certificate now derives an `includes` set fact ("every role in owner and admin can invite"), checking the property on each listed member, so a true every-member claim reaches `proved`. Before, an `includes` fact was never read as a set and every binding to it was only attested. A `typecheck` certificate derives an `includes` fact on `required_fields`; the kinds that compare the whole set (`exhaustive`, a set-equality `typecheck`, `state_machine`) reject one, since they would read "at least these" as "exactly these".
  - An arithmetic certificate whose assumptions contradict each other, such as a code count of 5 against a fact of exactly 4, is rejected with both values ("the assumptions contradict each other (count = 4 and count = 5) ...") instead of "the claim holds vacuously".
  - A typecheck certificate whose own compile failed is rejected with the first error Kibi's compile of the witness reports, or with a note that Kibi's compile accepts it, instead of only "the type checker did not accept the witness". The declaration files the nearest `tsconfig.json` includes (a `reset.d.ts`, for example) are now part of the witness program.
  - A receipt whose only derived claims are intent-scope (derived from the knowledge base's facts, with no value read from the code) records `evidence_level: tested`, the level coverage reports, instead of `proved`.

  The kibi-usage skill (2.29.2) describes these and how to wire a count claim.

## 2.8.3

### Patch Changes

- 94dc89d: A certificate now proves the requirement claims it names, and `proved` says which claims a requirement's certificates cover.

  A certificate-kind proof contract (`exhaustive`, `typecheck`, `arithmetic`, `smt`) names the claim keys it proves in the new `proves` field. For each named claim Kibi derives what the certificate has to establish from the claim's grounding fact, so the author never states it:
  - A set fact (the new `value_type: set` with `value_set`) gives a set-equality obligation. An `exhaustive` certificate meets it when its domain, read from the code, is exactly the set and the domain symbol is covered by the test; a `typecheck` certificate meets it when Kibi's own witness, which compares the domain type with the set both ways, compiles.
  - A numeric fact gives a constraint. An `arithmetic` or `smt` certificate meets it when its assumptions are the fact's constraints; a new `value_source` field names the code constants that bound the variable, which `constraint_source` used to require.
  - A fact with no derivation (a behavioral claim) gives an attested binding, which counts as `tested`.

  `kibi prove` records one binding per claim in the receipt's `claim_bindings` (derived, attested or rejected, with the reason) and prints it. Kibi re-judges each binding against the current KB when it reports, so a binding goes stale when its fact changes. A requirement reports `proved` only when every applicable claim has a derived, code-scope binding from a fresh certificate that re-checks.

  The semantic advisor now models closed lists ("must be one of red, green or blue") as set facts. KB consistency certificates support set facts.

  `kibi coverage`, `kibi proof explain` and the HTML report show claim-level evidence (`claimSummary`, `claimEvidence`, "n/m claims proved"), and the `proved` floor gap lists the unproved claims. The new blocking `proof-contract-claims` check reports a certificate contract that names no claims, names a key that is no current claim, or names a claim its kind cannot express. The kibi-usage (2.27.0) and kibi-traceability (2.2.0) skills explain claim binding to agents.

  **Migration (breaking):** KB schema 12. `kibi migrate` pins `proves` on every certificate contract with exactly one claim it could prove and lists the rest for review; until a contract names its claims, `proof-contract-claims` blocks and its certificate proves nothing. A requirement that reported `proved` from a certificate before reports `tested` until its claims are bound and re-proved. The requirement proof payload is now `kibi.requirement-proof.v5`. Facts with a legacy `allowed_values` list are read as sets; nothing is rewritten.

- a71798f: Proof contracts can now earn `proved` evidence with certificate proof kinds that Kibi re-checks itself.

  A proof contract sets `kind` to one of the runner kinds `e2e`, `example` or `property`, which support `tested`, or to a certificate kind, which supports `proved`:
  - `exhaustive` runs a check on every member of a finite domain the code defines. The contract names the domain with `domain_source`; the proof must import that symbol, and Kibi loads the export itself and rejects a certificate that does not cover exactly its members.
  - `typecheck` names a `witness` file that stops compiling when a domain member goes unhandled (an exhaustive switch ending in a `never` check, or a mapped type over the domain). Kibi compiles the witness itself, strict and with the workspace's TypeScript, and checks it is the workspace file and imports the domain.
  - `arithmetic` states a claim about one integer or real variable. Its assumptions must be exactly the constraints of the typed numeric facts the contract names in `constraint_source`, and Kibi decides the claim exactly: the facts must be satisfiable and entail it for every value.
  - `smt` carries an SMT-LIB query that asserts the `constraint_source` facts and the claim's negation. Kibi re-runs z3 or cvc5 on it and accepts only `unsat`.

  `arithmetic` and `smt` prove that the knowledge base's facts entail a claim, not that code follows those facts.

  Tests build certificates with the new `kibi-cli/proof-certificates` helpers and leave them in the directory `kibi prove` names in `KIBI_PROOF_CERTIFICATES`; outside `kibi prove` writing a certificate does nothing. A requirement reports `proved` when it is `tested` and every scenario has a test whose fresh receipt carries a certificate that still re-checks. `kibi coverage`, `kibi proof explain` and the report show the new certificate evidence, the report counts requirements proved by certificate, and a stored certificate that stops re-checking is listed with its reason under `certificateRejections`.

  **Receipts:** `kibi prove` now writes `kibi.proof-receipt.v2`, which adds the contract kind, the evidence level, the certificate, its digest and, when a certificate is rejected, the reason. Existing `kibi.proof-receipt.v1` receipts stay valid and support `tested`. Older Kibi versions do not read v2 receipts, so upgrade every checkout that proves requirements together. The kibi-usage skill (2.26.0) explains certificate kinds to agents.

- 0d68081: Requirements now state the evidence they need, and `kibi check` fails any current requirement whose evidence is below it.

  A requirement can set `required_evidence` to `proved`, `tested`, `asserted` or `unverified`. Without it, a firm requirement needs `tested` evidence and any other requirement needs none. The new canonical `evidence-floor` rule of `kibi check` and `kb_check` reports every current requirement whose evidence level is below its floor, with the level, the floor, where the floor comes from and the proof gaps to fix. Requirements whose only gaps are receipts older than the code count as pending re-proof and pass; `kibi check --fresh-evidence`, meant for CI right after `kibi prove --all`, fails them and also needs a clean proof snapshot.

  The floor replaces snapshot files of every requirement's proof gaps: a pull request that adds a requirement no longer edits a shared baseline, and the floor sits in the requirement a reviewer reads. `kibi proof impact`, which compared coverage with such a baseline, is removed; use `kibi check --rules evidence-floor` and `kibi proof explain <id>`.

  **Migration:** the knowledge-base schema moves to version 11. `kibi migrate` writes `required_evidence: asserted` on every current firm requirement that has no scenario verified by an end-to-end test with a proof contract and a passing receipt, so an upgraded knowledge base passes; raise a floor to `tested` once the requirement has an end-to-end proof. Requirements that keep `tested` are listed, and `kibi check --rules evidence-floor` shows any whose proof still has gaps, such as a stale receipt. For the same reason, requirements `kibi bootstrap` imports from a person's documents are recorded with `required_evidence: asserted`, so a freshly bootstrapped knowledge base passes `kibi check`. A knowledge base below schema 11 is not judged by `evidence-floor` until it is upgraded. The kibi-usage skill (2.25.0) explains floors to agents.

- 1fea8f6: Fixes from running the formal-proof lane on two test projects.

  **Migration note:** a type-shape symbol (interface, type alias, enum) covered by a unit test now counts as covered only while that unit test has a current passing receipt; an authored `status: passing` is no longer enough. After upgrading, give those unit tests a `proof_contract` and run `kibi prove --stale`. Until then coverage lists the symbols in `uncoveredSymbols` with `structural_unit_receipt_not_current`.
  - `kibi migrate` pins a `tested` floor only where the proof ladder would accept it (newest receipt, every gap), so a migrated project no longer starts with dozens of `evidence-floor` violations.
  - `kibi check` prints the evidence-floor suggestion in text output without `--fix`, and the suggestion names the failing receipts, uncovered symbols and missing coordinates.
  - `kibi coverage --status` judges receipts with the same per-contract binding as the unfiltered report.
  - Certificate domains: `domain_source.export` names the export when it differs from the symbol title; TypeScript domains load through bun, the workspace's tsx, or node with a resolve hook for extensionless and `.js` imports; imports of compiled output map back to sources through `tsconfig.json`; Python domains (`Enum`, `dict`, list, tuple, set) load with `python3`.
  - An exported constant matched by name is judged as a narrow symbol by the upsert granularity check, as the staged gate and `kibi check` already did.
  - `kibi prove` no longer prints a raw `git show` error for a newly added test document, attributes a valid all-pass test report per test, and stops the producer's whole process group on Ctrl-C.
  - New `kibi prove --stale` reruns only tests without a current passing receipt.
  - New `success_policy: own_results_first_attempt` judges each obligation by its own native-case result when a run failed only in execution, so one unrelated failing Playwright case no longer fails every receipt of the suite. The Playwright reporter now marks global errors (`setup`), global timeouts (`timed_out`) and interruptions as run-level failures, which still refuse every obligation.
  - `kibi prove` prints each integration it starts and ingests on stderr, records ingested integrations in `.kb/proof/runs/prove-progress.json`, and `kibi prove --resume` skips integrations an interrupted run already ingested at the same snapshot.
  - With `--test`, `--requirement` or `--stale`, a direct `playwright test` integration runs only the selected tests' `proof_bindings[].source_file` spec files; every producer receives them as `KIBI_PROOF_SOURCE_FILES`.
  - New `kibi proof run-steps` runs `proof/steps.json` as a `command` integration and writes the per-test report.
  - Receipt binding ignores a test document's `links`, so adding a link no longer stales its receipts; receipts bound the earlier way stay current.
  - The tree-sitter analyzer keeps a file with more than 64 decorated declarations decorator-only (the last diagnostic summarizes the rest), so `kibi sync --refresh-symbol-coordinates` no longer aborts on it.
  - `kibi sync --refresh-symbol-coordinates` counts refreshed symbols against the stored coordinate artifact.
  - New `coarse_anchor_only_review` diagnostic for requirements implemented only by whole-file anchors.
  - `kibi proof inspect` detects `node --test` and `bun test` in root and workspace scripts.
  - `kibi doctor` warns instead of failing when an augment-mode plugin's secret is missing, and the merge-driver setup names the project's package manager.
  - `kibi coverage` text output groups traceability and proof counts.
  - Claim texts that differ only in whitespace or trailing punctuation match.
  - `pack:all -- --dev-version` stamps local packs `<version>-dev.<sha>`.

- 26bfdd6: Close the remaining proof-lane issues.
  - `kibi upsert` keeps the properties an update leaves out in the compiled store, as the authored file already did. A relationship-only upsert no longer drops `required_evidence` (or `priority`, `owner`, `tags` and the rest) from the stored requirement, so `evidence-floor` stops judging it by firmness until a `kibi sync --rebuild`.
  - A Python certificate domain loads with `KIBI_PYTHON`, the active virtualenv, or a `.venv`/`venv` from the domain file's directory up to the workspace root before `python3` on `PATH`, so a domain that imports project dependencies is checked. A failed load quotes the traceback's exception line (`ModuleNotFoundError: ...`) instead of its header.
  - The `kibi coverage` summary carries `linkCoverageScope: "priority_must"`, and the table titles the link counts `Links (priority: must)`, so `evaluated: 0` on a KB without must-priority requirements no longer reads as if nothing was proved.
  - `kibi sync` counts distinct relationships in both summary blocks: an edge stated in front matter and again in a symbol manifest or shard counts once, so the imported count no longer exceeds the KB total.
  - After an applied migration, `remainingPlan` is a `kibi.migration-plan-digest.v2`: it lists the first 20 automatic actions as `{ id, code, state, autoApplicable, dependsOn }` and counts all of them under `automaticSummary` (`total`, `ready`, `blocked`, `omitted`), instead of embedding every automatic action with its full input.

- e421be0: Skills describe evidence levels and floors. kibi-decisions and kibi-bootstrap record an untested firm rule with `required_evidence: asserted` so `kibi check` passes until an end-to-end proof covers it. kibi-traceability and kibi-freshness report `evidenceLevel` and `evidenceFloor` from coverage. The kibi-commit-review staged gate reference lists `kb-consistency` and notes that `evidence-floor` runs only in a full check. The kibi-usage receipt workflow runs `kibi prove` and appends `kibi.proof-receipt.v2` receipts instead of deriving them by hand.

## 2.8.2

### Patch Changes

- 45036a3: Signoff guidance no longer tells agents to attach `latest.html` as a file. Chat apps (the Claude apps, Slack and most others) show an attached HTML file as raw source or a download, so agents now share the page only as a rendered page, such as a Claude Artifact, and otherwise leave the message text as the whole view. Updates the kibi-decisions and kibi-commit-review skills (1.2.1), the `kibi signoff` page note and the stop-hook reminder.

## 2.8.1

### Patch Changes

- 39721a1: Every requirement now reports how strong the evidence behind it is, and passing end-to-end tests are no longer called proof.
  - `kb_coverage` / `kibi coverage` rows carry `evidenceLevel`: `proved` (a re-checkable certificate covers every case; no proof kind issues one yet, so nothing reaches it today), `tested` (fresh end-to-end receipts cover every linked scenario), `asserted` (a person stands behind the requirement: it was approved, or it is firm by `firmness` or a non-agent origin, but nothing current checks it) or `unverified` (an agent wrote it and no person approved it). Each row lists the `evidence[]` entries that earned the level, with `kind`, `scope` and `level`, and the summary counts rows per level under `evidenceLevels`.
  - The HTML report shows each requirement's level next to its id and counts the asserted and unverified requirements; its headline is now "Tested end to end" and the badge reads `% tested`. `kibi signoff` adds the level to each requirement's proof line when it is weaker than tested. The `kibi coverage` table gains an `Evidence` column and prints the per-level counts as `asserted=… proved=… tested=… unverified=…`. `kibi signoff` now counts a top-level `approved_by` as approval, as the evidence level does, so an approved agent requirement no longer shows as awaiting approval.
  - The `kibi-usage` skill (2.23.0) explains the levels and tells agents never to report an asserted or unverified requirement as tested or proven.

  **Migration (breaking).**
  - The requirement proof contract is now `kibi.requirement-proof.v4`. `proofStatus: proven` is renamed `tested`; filter with `--status tested` (`statuses: ["tested"]`), since `proven` is rejected.
  - Coverage summaries rename `proofProven` to `proofTested`. `kibi proof impact` results rename `proofProven` / `currentUnproven` to `proofTested` / `currentUntested`, `kb_apply_plan` closeout `proofState: proven` is now `tested`, and the diagnostic usage field `coverage_proven_count` is `coverage_tested_count`.
  - `proof/baseline.json` files move to `kibi.proof-baseline.v3` with `proofTested`, `currentUntested` and `proofStatus: tested`. `kibi proof impact` still reads a committed v2 baseline, treating its `proven` rows as `tested`, so rewrite the file in the same commit you upgrade in or the next one.
  - No knowledge-base migration is needed: nothing stored in `.kb/` changes.

- a1c7479: `kibi check` and `kb_check` now prove that the knowledge base is consistent, and leave a certificate for each answer that an independent checker re-checks.

  The new canonical `kb-consistency` rule states four theorems about the facts current requirements name and produces a `kibi.certificates.v1` certificate for each: property facts are consistent (a model per subject, property and scope, or an irreducible contradiction core with one model per dropped fact), predicate facts and allow/deny decisions are consistent (one truth value per atom, one decision per key, or the two facts that disagree), and stored rules are stratified (a stratum per rule predicate, or a negation cycle). A separate checker module re-checks every certificate by evaluation only; it never runs the search that found it and does not load `checks.pl`. Each contradiction it re-verifies is a blocking violation that names the core facts and the requirements behind them, with the certificate under `evidence.certificate`; a certificate the checker rejects also blocks.

  The property theorem is joint, so facts that contradict only together (every pair still admits a value) are reported even though the pairwise `domain-contradictions` rule is silent. `kibi check --staged` runs the rule too, so a commit that introduces such a contradiction is blocked. Contexts the checker cannot compare (mixed value types or units, unsupported operators or polarities, cores whose validity windows never overlap) are reported by the new advisory `kb-consistency-unresolved` rule and never count as consistent. Opposing rule pairs and scenario feasibility are not certified yet.

  Certificates are regenerated on each run and are not committed. `kibi check --write-certificates <file>` saves the bundle, and `kibi check --certificates <file>` re-checks a saved one and prints the `kibi.verification.v1` report (a verdict of `proved`, `disproved` or `unresolved` per theorem, and every rejected certificate with the reason). The kibi-usage skill (2.24.0) tells agents how to act on the new findings. The kibi-freshness skill (2.1.0) now checks consistency with `domain-contradictions`, `kb-consistency` and `kb-consistency-unresolved` instead of the pairwise rule alone, reports a `kb-consistency` core as a conflict to resolve by superseding or changing a requirement, and reports an unresolved context as unresolved.

  **Migration (breaking for KBs with joint contradictions).** No knowledge-base change is needed. A knowledge base whose facts contradict only jointly now fails `kibi check` until one of the requirements is changed or superseded; the violation names the core and the requirements to choose from. Integrations that pass a fixed `--rules` list or `rules` input are unaffected until they add `kb-consistency`.

  Evidence levels and `kibi signoff` now count an agent-written requirement as approved only through `origin.approved_by`, the field `agent-requirement-unapproved` already reads. The top-level `approved_by` approves an exception, and an agent can write it, so on its own it no longer raises a requirement to `asserted` or shows it as approved in signoff.

## 2.8.0

### Minor Changes

- 5e3541e: Two new bundled skills cover the moments where agents most often went wrong with Kibi.
  - `kibi-decisions` loads when a person states a rule ("must", "never", "from now on"), when a hook asks before an edit to code that implements a firm requirement, when the session ends without recording what changed, or when a request conflicts with a recorded rule. It shows how to read a requirement's firmness and origin, record a person's rule as firm with a reference to their words, supersede a rule with a "Why this changed" section, work through `kb_compile_intent` review candidates, and ask before overriding a firm rule.
  - `kibi-commit-review` loads when `kibi check --staged` or the pre-commit hook blocks a commit, or when preparing a commit or pull-request impact review. It explains the per-file `Detail:` lines, how to add the missing symbols and refresh coordinates, which Kibi files to stage, how to prepare an impact-review record with `kb_prepare_impact_review`, and how merge commits and migration renames are judged.

  `kibi-usage` now points to these skills instead of repeating their detail, and the OpenCode guidance routes rule and commit questions to them.

- 180196c: The requirements signoff view now reads well on every host, not only in the hosts that draw Kibi's fenced block.
  - `kibi signoff` prints plain Markdown by default (`--format chat`): headings, quoted statements and lists that render in any chat window, and in messaging tools for agents whose replies go through one (cloud and project sessions). The path of the self-contained page `.kb/briefs/signoff/latest.html` goes to stderr, so an agent can attach or publish it next to the message. `--format md` keeps the fenced block for the OpenCode terminal card, and `KIBI_SIGNOFF_FORMAT` sets the default per host.
  - After a session writes a requirement, the Claude Code, Codex, Cursor and ZCode stop hooks ask once for the signoff view before the work is reported done, unless `kibi signoff` already ran since. A requirement the agent wrote is put to the person through the view, not retold in the agent's words.
  - `/kibi-signoff` is a new command in Claude Code, Cursor and ZCode.
  - The `kibi-decisions` and `kibi-commit-review` skills (1.2.0) say how to show the view on each host, and `kibi-usage` (2.22.0) points to `kibi signoff` when it says to leave `approved_by` to the person. The OpenCode guidance asks for `--format md` so the terminal card still renders.
  - The Claude Code plugin README shows the `.claude/settings.json` snippet that loads the plugin in cloud sessions.

### Patch Changes

- 7a3edce: Signoff is now one readable view instead of loose chat text. `kibi signoff` lists the requirements a change adds, rewrites, retires or affects, each quoted with its firmness, origin, scenarios and proof state, and `kibi signoff --questions` numbers the decisions waiting for you next to the recorded rule each one would change or conflict with. The output is a fenced Markdown block for the agent's reply, a self-contained HTML page (`--format html --open`) or JSON, and every run keeps the latest view in `.kb/briefs/signoff/`.

  Claude Code renders the block as Markdown through a new `MessageDisplay` hook (`KIBI_SIGNOFF_DISPLAY=0` turns it off), OpenCode 2 draws it as a framed card with a `/kibi-signoff` command and a toast, and VS Code offers a **Kibi: Show Requirements Signoff** panel that refreshes as the agent updates it. The `kibi-decisions` and `kibi-commit-review` skills now tell agents when to run it.

- 3b43238: The `kibi-decisions` skill now makes a conflict with a recorded rule the verdict of the answer, naming the rule and what it requires before asking the person anything. A stated rule counts as recorded only once its requirement, scenario and `implements` link have actually been written and `kb_check` is clean. After a `kb_compile_intent` plan is applied, the skill makes the new requirement firm with `origin.ref`, gives a must-priority requirement its `specified_by` scenario, and reruns `kb_check` until nothing is reported about it. In the 2026-10-22c SkillOpt campaign the mean rose from 71.33 to 89.5 and hard passes from 16 to 24 of 30. Compile-intent review went from 31.67 to 85.83. One closeout cell dropped from 100 to 90.
- 8493b53: The `kibi-freshness` and `kibi-traceability` skills now spell out the order of Kibi calls the agent should make and how to finish authorized writes.
  - `kibi-freshness` runs `kb_status`, then `kb_query`, then `kb_check` before it answers. Consistency questions run `kb_query`, `kb_check` and then `kb_coverage`, and any unmodeled clause is reported as incomplete analysis rather than consistent.
  - `kibi-traceability` starts with `kb_search`, then runs `kb_query` and `kb_graph`, and ends with `kb_status`. It grounds scenario feasibility in the queried entities.
  - Both skills treat a passing `dryRun` upsert as validation only. They then perform the real write and read it back before the final checks.

  In the 2026-10-21 SkillOpt campaign, on the Claude Code host, the freshness mean rose from 68.67 to 96.67 and the traceability mean from 45.67 to 76.67, with no family regressing. The campaign report is `documentation/evaluations/skillopt/reports/2026-10-21-report.md`.

- 98254ef: The `kibi-traceability` skill now explains which edge belongs on which symbol when linking coverage. A production symbol keeps its `implements` link and gets `covered_by` to its test, and `executable_for` is reserved for a symbol that stands for the test itself. If a real `kb_upsert` is refused after a dry run passed, the skill repairs the same target instead of working around it with a new entity. In the 2026-10-21b SkillOpt campaign the traceability mean rose from 82.33 to 93.17, and executable coverage from 51.67 to 95.83, with no family regressing.
- 0a9c431: Two skills pick up SkillOpt-confirmed guidance.
  - `kibi-usage`: before editing a source file Kibi tracks, the skill runs `kb_search` with that file and then reads each governing requirement by id with `kb_query`. It treats the search answer as discovery only. In the 2026-10-22 campaign the mean rose from 85.5 to 88, and intent consultation rose from 47.5 to 60.
  - `kibi-commit-review`: the skill never reads files under `.kb` directly, even read-only. It reads the governing requirement before deciding what a staged change is, and it sends an authorized write exactly once, after a dry run with the same payload. In the 2026-10-22b campaign the mean rose from 44.67 to 72.67, hard passes rose from 7 to 16 of 30, and security failures (all direct `.kb` reads) fell from 8 to 0.

- 06fb484: The `kibi-usage` skill now limits the consultation before a source edit that keeps the governing rule to two calls: `kb_search` with the file, then one `kb_query`. Status, check and coverage run after the edit. For a modeling task, the skill spells out the full order: the exact `kb_query` of the target comes before any `kb_model` call, and the task does not stop at a dry run. In the 2026-10-22d SkillOpt campaign, over 42 cells per arm, the mean rose from 89.64 to 95.95 and hard passes from 33 to 38. Intent consultation went from 50 to 100. Two fact-predicate modeling cells lost an argument (100 to 80).

## 2.7.3

### Patch Changes

- b95b32c: The Codex plugin manifest now carries author, homepage, repository, license and keyword metadata, so plugin listings and marketplaces can show who maintains it and under which license.

  Adds the missing recommended fields to `.codex-plugin/plugin.json` and a `.codexignore` for the plugin package.

- 63e0e1f: The Claude and Codex plugin packages now ship their own license and security policy files, so the terms and the vulnerability reporting route travel with the installed plugin. The tree-sitter analyzer also words one PHP diagnostic without a literal call-syntax example.

  Adds `LICENSE` and `SECURITY.md` to both plugin packages' `files`, rewords the PHP `eval` diagnostic message in the analysis worker, and refreshes the integrity manifest and release approval hashes for the rebuilt worker.

## 2.7.2

### Patch Changes

- 10c158c: Bootstrap plans now name what to compare for intent claims they cannot model, not only for the claims they plan. A claim left as "Intent claim needs authoring" next to a prose-only current requirement on the same topic gets a `conflict-review:` diagnostic naming that requirement, with an instruction to compare the two when the claim is compiled with `kb_compile_intent` and to report the verdict through `conflictReviews`; the knowledge-source summary and `recommendedActions` count those claims. The pre-commit hook (`kibi check --staged`) now blocks an entity document the commit adds or edits without the body context that full `kibi check` requires (`entity-context-missing`), so a commit can no longer carry an entity `kb_upsert` warned about.

  Migration: commits that add or edit a requirement, scenario, test, ADR or observation fact without body context are now refused by the hook. Entities that already lacked context at the last commit, and entities the schema 8 migration acknowledged in `.kb/manifest.json`, are not blocked, so migration commits and edits to legacy entities keep passing; add a `## Context` section (requirements) or a prose body to new entities.

  A `kb_upsert` refused for a coarse symbol link now returns a coded error (`SYMBOL_GRANULARITY_VIOLATION`) in the MCP error envelope and the CLI JSON route, with the same message; before, only a dry run carried a code. The candidates in that message, and in the hook's `symbol_granularity_violation`, list functions, methods and accessors before properties. `kb_status` `schemaStatus.warning` on a legacy KB without a manifest now says to run `kibi migrate --yes`, matching `bootstrap.nextAction` and `kibi doctor`.

## 2.7.1

### Patch Changes

- 5552b1f: `kb_compile_intent` no longer reports "no conflict" for intent it could not check. Prolog compares only requirements that have a logical model, so a claim the advisor left as an ontology gap, or one next to a current requirement that exists only as prose, used to come back as `no_conflict` even when discovery had just returned a requirement saying the opposite. The plan now says the check is unresolved, names the related requirements the agent must compare, and blocks when the agent reports a conflict. Bootstrap plans name the same requirements for review before approval.
  - `contradictionAnalysis` gains `reasons` (`unmodeled_target` with the claim keys, `unmodeled_related` with the requirement ids, `analysis_unavailable`), `reviewCandidates` (up to five related current requirements with discovery score at least 0.1: id, title, the sentence sharing the most terms with the intent, statement, score, `modeled`, `review`) and `nextAction`. Any reason makes `outcome` `unresolved`.
  - New `kb_compile_intent` input `conflictReviews: [{requirementId, verdict: "conflict" | "no_conflict", note?}]`. A `conflict` verdict makes the outcome `conflict` and the plan `blocked`; `no_conflict` clears that candidate. A verdict on a current requirement discovery did not rank is honored; one that names no current requirement is ignored with a diagnostic.
  - Pending reviews do not change the plan status: a plan whose propositions are modeled stays `ready` with `Contradiction check incomplete: …` in its diagnostics and becomes `no_conflict` once every candidate is reviewed. An unmodeled target keeps the plan `needs_resolution` as before, and its outcome stays `unresolved` after review.
  - `kb_plan_bootstrap` adds `review_against:<id>` evidence and a `conflict-review:` diagnostic for each planned intent claim that has prose-only current requirements on the same topic.
  - `kibi-usage` 2.20.0 and `kibi-bootstrap` 3.15.0 tell the agent to compare and report instead of reading `unresolved` as consistent.

## 2.7.0

### Minor Changes

- 00d2871: The Codex, Cursor and ZCode hooks now act on recorded decisions while the work happens, as the Claude Code hooks do.
  - **Firm requirements before the edit.** When an edit changes code that implements a current firm requirement, the pre-edit hook tells the agent to ask the person before an edit that breaks that rule, naming the rule; once per requirement per session. These hosts cannot put the question to the person from a hook (Codex has no "ask", Cursor does not enforce one, and the ZCode adapter stays advisory), so this is a notice to the agent. Set `KIBI_CONFIRM_FIRM_EDITS=0` to turn it off.
  - **Stated rules are captured.** A prompt that reads as a rule ("must", "never", "from now on") gets the note that recording it with `kb_upsert` is part of the change: through a new `UserPromptSubmit` hook in Codex and ZCode, and in Cursor through a new `beforeSubmitPrompt` hook whose note arrives with the next pre-edit message. When a session changed source files and wrote nothing with `kb_upsert`, the stop hook asks once for the decision to be recorded (Codex continues the turn with it; Cursor adds it to the stop follow-up; ZCode adds it to the Stop context).
  - **Codex unlinked-file candidates** are ranked by the latest prompt's words as well as the path's.

  `kibi-agent-core`: new `kibi-agent-core/decision-guard` entry with the host-neutral pieces (`firmRequirementsTouched`, `firmEditNotice`, `confirmFirmEdits`, the prompt and stop notes, and per-session markers). `kibi-claude` now imports its firm-edit and capture texts from it; behavior is unchanged.

## 2.6.6

### Patch Changes

- b9ec91d: The Claude Code hooks now act on recorded decisions while the work happens, not only after it.
  - **Firm requirements are confirmed before the edit.** When an `Edit`, `MultiEdit`, `Write` or in-place shell write lands in a symbol that implements a current firm requirement (marked `firmness: firm`, or written by a person rather than an agent), the `PreToolUse` hook returns `permissionDecision: "ask"` with the symbol and requirement in the prompt, so the person decides before the code changes. Once an edit is allowed, that requirement is not asked about again in the session; a declined edit is asked again. The agent is told that a declined edit means the requirement stands. In a `claude -p` run with nobody to answer, Claude Code refuses the edit and the agent reads the reason. Set `KIBI_CONFIRM_FIRM_EDITS=0` to turn the prompt off.
  - **Stated rules are captured.** A new `UserPromptSubmit` hook tells the agent, when a prompt reads as a rule ("must", "never", "from now on"), that recording it with `kb_upsert` is part of the change. At `Stop`, a session that changed source files and wrote nothing to the knowledge base is asked once to record the decision or say there was none.
  - **An unlinked file is no longer an all-clear.** The discovery note for a file no symbol links ranks candidate requirements by the latest prompt's words as well as the path's, and, when nothing matches, says that nothing recorded is known to cover the file and that a decision made for it is recorded before the work is reported done (Codex shows the same note).

  `kibi-agent-core`: `requestTopicWords`; `rankRequirementCandidates` and `requirementCandidatesForPath` take optional request words (a requirement sharing only request words needs two of them).

## 2.6.5

### Patch Changes

- 445ced0: Bootstrap no longer plans a declared intent claim as a new requirement when it only restates a requirement that is already in the knowledge base. A claim whose statement or excerpt matches an existing requirement's title, its semantic text or one of its sentences (ignoring case, whitespace and punctuation) is counted as already in the KB and names that requirement; a claim that comes close without matching is still planned, with a diagnostic naming the requirement to review. MCP tools that reject their input now return the same error code the CLI does (for example `VALIDATION_FAILED` for a clause that is not a verbatim fragment), in `structuredContent.error`, instead of a plain text failure.
  - `kb_plan_bootstrap`: before planning an `intent` claim, the planner reads every current requirement (`kb:current_req/1`, projected to id, title and `semantic_text`) through the engine it already uses for existing ids, only when intent claims are declared. A normalized exact match of the claim's `statement` or `excerpt` against the title, the whole semantic text or one sentence of it adds an `entity_exists` row with `matchedId`, `matchedBy: "restatement"` and `matchedField`, and the per-source accounting counts it as already in the KB. A token-set Jaccard of 0.8 or more (the entity-context restatement threshold) without an exact match keeps the candidate, adds `possible_restatement:<id>` to its evidence and emits a diagnostic. Requirements are compared in id order, so the plan hash stays stable for the same KB and context.
  - MCP `addTool`: an `InputError` or `OperationError` thrown by a handler (matched by class, or by name and an upper-case `code` when bundled separately) returns `isError: true` with a protocol 1 error envelope (`status: "error"`, `error: { code, message, retryable }`) and the text `Tool <name> failed: [<code>] <message>`, matching the CLI JSON route. Errors without a Kibi code still raise `Tool <name> failed: …`.
  - `kibi-runtime` exports `codedErrorOf` and `CodedErrorFields`.
  - Skills: `kibi-bootstrap` 3.14.0 (claims that restate a current requirement count as already in the KB; review "closely restates" diagnostics before approval).

- d960810: A file with no linked symbols is no longer read as a file no rule covers. Before such a file is edited, the Claude Code and Codex hooks name the current requirements whose titles share the file's path words, and a `kb_check` scoped to the file reports the same candidates, so an agent changing `coach-dashboard.html` is pointed at the coach inbox requirement instead of concluding there is no knowledge-base impact. Agents are also told that recording the behavior a change adds is part of finishing it and needs no permission.
  - `kibi-agent-core`: new `requirement-candidates` module (`pathTopicWords`, `rankRequirementCandidates`, `requirementCandidatesForPath`); `unownedSourceNote` takes the candidates, says that no link does not mean no rule, and drops candidates rather than exceed the snippet budget.
  - `kibi-cli`: an impact-enabled `kb_check` emits `source_file_unowned` (`info`, non-blocking) for each file in `sourceFiles` that no manifest symbol links to a requirement, including files Kibi does not extract symbols from (HTML templates), with `evidence.candidates`. The unlinked-symbol `symbol_semantic_review_needed` suggestion now says recording the behavior needs no permission.
  - `kibi-claude`, `kibi-codex`: the unlinked-file edit note names candidate requirements. The Claude Code session-start context no longer says unlinked files get no context, and says recording new behavior needs no permission; ZCode's session-start context says the same.
  - `kibi-usage` skill 2.19.0: record new behavior without asking; confirm the candidates an unlinked-file note names.

## 2.6.4

### Patch Changes

- a26ba8c: A firm requirement or ADR can no longer be reworded in place by an agent. `kb_upsert` refuses to change its title, statement or ADR body, or to lower its firmness, unless the write cites new words from the person who owns the rule, and `kb_check` reports the same change made directly to the file. Context sections, tags, status and links stay editable, and superseding with a new firm decision still works as before.
  - `kb_upsert` (dryRun and `kb_apply_plan` steps included) rejects an in-place claim change of a current firm decision without a new `origin.ref` (or `approval_ref` on a requirement): `Entity validation failed: <ID> is a firm decision, so kb_upsert does not change its <fields> in place`.
  - New canonical `kb_check` rule `decision-firm-edited` compares current firm decisions with `HEAD` and blocks a changed claim that cites no new human words; it reports nothing outside a Git checkout or before the first commit.
  - A requirement's claim is its title, its `semantic_text` (or the statement its body derives); an ADR's claim is its title and body. Lowering firmness or replacing the origin with an agent's counts as a change.
  - `kibi-usage` skill 2.18.0 tells agents not to edit firm decisions in place; the `firmness` input schema description now states the origin-derived default and the edit rule.

## 2.6.3

### Patch Changes

- cd4723e: Rules a person wrote or imported are no longer treated as an agent's own default choice when they carry no `firmness`. A requirement or ADR without `firmness` now reads as `firm` unless an agent wrote it, so an agent asks before replacing it, and bootstrap records the rules it imports from your documents as firm with a reference to the passage. The usage skill now treats any request that conflicts with a recorded rule as a question: the agent names the rule and asks, whatever the rule's firmness, and changes it only when the person says so. Run `kibi migrate --yes` to move a KB to schema 10; existing supersedes are acknowledged and no source file is rewritten.
  - `effectiveFirmness` takes the entity's origin: an absent value is `default` for `origin.kind: agent` and `firm` otherwise (human, import, migration or no origin). `kb_query` rows and `kb_search` answers show the derived value.
  - Hook snippets label a current firm decision `[firm: ask before changing]` (was `[firm]`) and no longer label retired decisions. The Claude Code and ZCode session-start context adds one sentence: a request that conflicts with a recorded requirement or ADR is a question, so the agent names the rule and asks before changing the code or the rule.
  - `decision-firm-superseded` applies to origin-derived firm targets; `decision-firm-unreferenced` still applies only to an explicit `firmness: firm`.
  - KB schema 10: the `firmness-from-origin-v10` step and the automatic `firm_supersede_acknowledge` plan action record pre-existing supersedes of such decisions in `.kb/manifest.json` `firmSupersedeAcknowledged` (`FROM -> TO`); only listed edges are exempt, and never an explicitly firm target.
  - Bootstrap intent-claim and normative-markdown requirement steps write `origin: {kind: import, ref}` and `firmness: firm`.
  - Skills: `kibi-usage` 2.17.0 (conflicting request means ask; firmness from origin; write firmness explicitly), `kibi-bootstrap` 3.13.0 (imported rules are firm imports, including hand-authored follow-ups).

## 2.6.2

### Patch Changes

- 526a585: The bundled `kibi-usage` skill (2.16.2) tells an agent that a `kb_search` answer may list only part of a requirement's facts (`moreFacts` names how many more and the `kb_query` that lists them), that `kb_model` mode `predicates` without a `requirementId` answers what a proposed rule would conflict with, writing nothing, and that `kb_query` with `includeBody: true` shows a requirement's authored prose.

  Technical summary: the `skills/` mirrors in these packages are regenerated from the runtime skill canon; no code changes.

## 2.6.1

### Patch Changes

- The bundled `kibi-usage` skill (2.16.1) now tells an agent that changes a grounded requirement's text to analyze the new prose with the requirement's `id` first, so the `Claim-key drift against the stored ledger` warning fires before any write, and it explains the two-sided proposition-complete error. Before, the Codex and Cursor packages would have kept shipping the 2.16.0 skill text after the CLI and MCP server already carried the new behavior.

  Technical summary: the `skills/` mirrors in these packages are regenerated from the runtime skill canon; no code changes.

## 2.6.0

### Minor Changes

- 5ad4319: Requirements and ADRs can now say how firmly they were decided, so a later agent knows whether it may change a decision on evidence or must ask a human first. Mark a rule a person stated `firmness: firm` (it must cite their words in `origin.ref`, or `approval_ref` on a requirement), a guess `firmness: exploratory`, and leave the rest unset (`default`). `kibi check` now blocks a firm decision without that reference (Kibi checks that it is present, not that it is genuine), a decision that is not firm superseding a firm one, and a current requirement or ADR that supersedes another without a `## Why this changed` section naming the evidence. `kb_search` and `kb_query` show the firmness of each decision; the editor hooks label firm and exploratory ones.

  Migration: this is a hard rollout with KB schema 9. Run `kibi migrate --yes` once; it records every supersede edge that predates the rule in the manifest (`supersedesReasonAcknowledged`, as `FROM -> TO`), so those do not block, and an advisory `supersedes-reason-acknowledged` diagnostic counts them. No source file is rewritten and no reason is invented. New supersedes must explain themselves, including a new one on an acknowledged decision.

  Technical summary: new optional `firmness` property (`firm` | `default` | `exploratory`) on `req` and `adr` in the JSON schema, the `kb_upsert` input schema, the markdown extractor and the Prolog entity schema; the schema rejects it on other types. `kb_upsert` judges firmness as it will be written: an update that omits `firmness` keeps the stored value (also in the compiled store), and a write that leaves a decision firm without a reference is rejected. `decision-firm-superseded` checks every superseder, retired ones included, so a chain cannot launder a firm decision; shard edges from deleted entities are ignored. New rules `decision-firm-unreferenced`, `decision-firm-superseded` and `supersedes-reason-missing` (canonical, blocking) and `supersedes-reason-acknowledged` (info) read authored requirements, ADRs, front-matter `supersedes` links and relationship shards, so they agree before a sync. `LATEST_KB_SCHEMA_VERSION` is 9; the `decision-firmness-v9` migration step and the `supersedes-reason-acknowledge` fragment action write only `.kb/manifest.json`. Search answer rows and `kb_query` results carry the effective firmness of requirements and ADRs; hook snippets append `[firm]` or `[exploratory]`. The `kibi-usage` skill gains a "Decision firmness" section.

### Patch Changes

- adac6d1: `kb_delete` (and `kibi delete`) now treats a returned deletion plan as a result instead of an error. Deleting an entity authored in a Markdown or YAML file returns `outcome: "plan_returned"`, an empty `errors` list and a `nextActions` entry whose `input` is the exact `kb_apply_plan` call (`{plan, approvedPlanHash}`) to run unchanged; an authored requirement returns `outcome: "supersession_required"` with a `kb_upsert` supersession template. The `approvedPlanHash` input now works: repeating the delete with the plan's hash applies the freshly computed plan in one call, and a stale or different hash fails with `DELETE_PLAN_HASH_MISMATCH` without writing. A new `dryRun: true` input previews relationship and direct entity deletes (counts, source writes with hashes, skipped effects) without touching sources or the store.

  Technical summary: `executeDelete` builds `nextActions` for the authored plan path, lists only real per-id failures in `errors` (plus any resolved non-authored id the plan does not cover), and on a matching `approvedPlanHash` delegates to `executeApplyPlan` under the lock it already holds, which gained an optional `onCommitted` callback so a post-commit failure is still classified as committed. Relationship deletes gain a dry-run branch after preflight that renders shard and authored-source patches without writing, using the new `planRelationshipShardRemovals` (which `removeRelationshipsFromShards` now wraps). The `kibi.kb_delete.v1` result adds optional `outcome`, `dryRun`, `wouldDelete`, `planHash`, `sourcePaths` and `recoveryJournalId`; the input schema adds `dryRun` and documents `approvedPlanHash`. MCP contract fixtures, the MCP, CLI and error references, and the bundled kibi-usage and kibi-traceability skills (with their host mirrors) are updated.

## 2.5.12

### Patch Changes

- dbfe490: Claude Code: when the agent reads a requirement-linked file and then edits it, the edit hook now still says what the lead requirement must keep true (its linked facts and decision) and names the `kb_check` impact call, alongside the symbol the edit lands in; before, the earlier read suppressed everything but that one line, so an agent that read first never saw the facts or the check. A `SessionStart` after a compact or clear resets the session's "already shown" memory, so the next read or edit of a linked file shows its snippet again instead of returning nothing into a context that no longer holds it; a resume keeps the memory. Codex: an `apply_patch` (or `Write`/`Edit`) to a source file no symbol links to a requirement now gets the same one-time discovery note as Claude Code, with the `kb_search` call that finds requirements for it (an unreadable manifest is reported once instead), and `Stop` now reminds of the `kb_check` impact call after `apply_patch` edits, which were not tracked because the patch names its files only in the patch text.

  Technical summary: `kibi-agent-core/snippets` gains `editKnowledgeUpdate` (focus line, `requirementGroundingLines`, impact-check line), the shared `unownedSourceNote` and `unreadableManifestNote` (re-exported by `kibi-claude`), and an optional `noteFor` callback on `editKnowledgeContext` that claims the same once-per-file slot for a file without a snippet. The Claude session journal gets a `context_reset` event that clears the shown, notice and explored sets but keeps pending edits and their reminders; `dispatchHook` appends it for `source: "compact" | "clear"`. The Codex runner passes `noteFor` from the knowledge index's manifest state and tracks dirty paths (and direct `.kb/` edits) through `extractEditedPaths`, which reads `apply_patch` headers.

## 2.5.11

### Patch Changes

- b1d003a: Agents working under the Kibi host hooks now have a guide to the snippet that arrives before a read or edit: which line names the governing requirements, which lists the facts the edit must keep true, which tests prove the file, what the one-line follow-up and the unowned-file and unreadable-manifest notes mean, and which `kb_check` call to run afterwards. The modeling cheatsheet also explains where a `claim_key` comes from and how to repair a mismatch instead of editing the clause text.

  Technical summary: kibi-usage 2.15.2 gains a "Reading a hook snippet" section describing the lines `kibi-agent-core/snippets` renders (`Kibi knowledge for …`, `must keep true`, `Decision`, `Covered by`, `Next layer`, the `kb_check` line, `focusUpdate`, `unownedSourceNote`, `unreadableManifestNote`); host skill mirrors are regenerated. `docs/modeling-cheatsheet.md` gains a "Claim keys" section covering derivation from `claim_text`, the `kb_model` sources of the key, the mismatch error and the grounding-target rule.

- 8f3f586: Permission grants written the way product owners write them now model as permission rules. `kb_model` (mode predicates) accepted "may", "can", "is allowed to" and "are permitted to" but rejected "must be able to", "are able to", "have permission to" and "are entitled to" with "required semantic cue absent", so a requirement such as "An admin must be able to read any analysis request" ended as an ontology gap even with complete argument bindings. The semantic advisor now also treats "have permission to" and "are entitled to" as normative clauses, and inferred permission bindings drop the leading article and singularise the resource, so "any analysis request" and "analysis requests" bind the same actor, action and resource key that the allow/deny contradiction check compares.
  - `predicate-applicability.ts`: the permission_rule cue and the normative-intent gate accept `must/shall/should be able to`, `is/are able to`, `is/are entitled to` and `has/have permission to`, including the common-verb form right after the grant.
  - `clauses.ts`: `has/have (no) permission to` and `is/are (not) entitled to` are normative assertions; bare `is/are able to` stays descriptive so stored inventories keep their roles.
  - `predicate-inference-1.ts`: grant and prohibition forms of the new cues bind actor, action, resource and decision; actors and resources lose their determiner and resources are singular.
  - The builtin semantic classifier's permission signal recognises `permitted`, `able to`, `entitled to` and `permission to`.
  - kibi-usage 2.15.1: the deny example shows the singular resource and lists the grant wordings `permission_rule` accepts.

## 2.5.10

### Patch Changes

- e00adf2: Projects set up with kibi-cli before 2.18.0 keep every symbol on one flow-sequence line of `.kb/symbols.yaml`, and the host hooks read none of it: the Claude Code hooks told agents that no symbol in a linked file was tied to a requirement, on every edit, when the opposite was true. The shared hook scanner now reads flow-layout manifests like block ones, the Claude Code edit hook no longer calls a file unowned when the manifest is unreadable or when the coordinate artifact binds a symbol to it that the scanner could not read (it says once per session that the manifest could not be read instead), and a plain `kibi sync` rewrites such a manifest in block layout once, keeping comments and order.

  Technical summary: `kibi-agent-core` `knowledge-index` gains a flow-collection reader for `symbols: [ … ]` sections (single or multi-line, CRLF safe) and for flow values inside block records, the index reports `manifest` (`missing` | `empty` | `indexed` | `unreadable`), `coordinateFiles` and `unlinkedFiles`, and the cache format moves to v2 so stale indexes rebuild. `kibi-claude` adds `unreadableManifestNote` (once per session) in place of `unownedSourceNote` for an unreadable manifest or a coordinate-bound file with no indexed record; the Claude and Codex hook bundles are rebuilt. `kibi sync` calls `normalizeManifestLayout` on every tracked symbol manifest ahead of its no-op fast path, through the same `blockifySymbolManifest` helper `kb_upsert`'s manifest writer uses.

- d973759: The kibi-usage skill (2.15.0) now tells agents to title a symbol after the behavioral member the extractor can find (`ClassName.methodName`, an exported function, or a class). It also explains that linking a coarse file- or module-level symbol to a requirement is refused when the file already has granular behavioral symbols, unless the symbol sets `granularity_reason`, so agents stop retrying refused symbol writes.

  Technical summary: the "Symbol-First Traceability" section of `kibi-usage/SKILL.md` gains one paragraph on `title` and the granularity gate, listing the allowed `granularity_reason` values (`config-artifact`, `module-level-behavior`, `extractor-miss`, `legacy-link`, `test-suite`). Host skill copies are regenerated.

## 2.5.9

### Patch Changes

- 50b7a65: The kibi-usage skill (2.14.0) now says plainly what moves `proofProven`: only an end-to-end test (by its `verification_scope`) with a fresh passing receipt; unit receipts are recorded but leave the `missing_passing_e2e` gap. Its second-agent recipes now create scenarios with `assumes` links to the facts they rely on, so a new or superseding requirement no longer leaves a "Scenario expects success but assumes nothing" warning. `kibi proof inspect` shows the command each configured integration runs.

  Technical summary: kibi-usage `resources/proof.md` gains a "What counts toward proofProven" section (scope source, unit/integration receipts, the component-scope UI exception, `coverage_depth` following authored status); recipes 1 and 2 of "Second-agent edits" add `assumes` (sent in the scenario's own write) and `expects` only with `assumes`, and re-pointing or closing the old scenario. `kibi proof inspect --json` adds `currentIntegrations: [{ id, producer, command }]` beside the compatible `currentIntegration`, and the text output lists each integration's command. Host skill copies are regenerated.

## 2.5.8

### Patch Changes

- 95d4a9e: A migration plan that `kb_apply_plan` refuses no longer looks like a success. Re-applying a proof-integration plan whose `.kb/proof/integrations.json` already exists (or one whose runner config changed since planning) used to return `status: "success"` with `outcome: "reconciliation_required"`, so an agent reading only the status thought it had worked. It now returns an error result (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `MIGRATION_PLAN_REFUSED`, `data.outcome: "refused"` and the refusal reason in the message; nothing was changed and nothing needs reconciling.

  Technical summary: `kibi.migration-apply-result.v1` gains `outcome: "refused"` (with `closeout.taskOutcome: "blocked"`) for an application that applied no action and whose every failure was a `MigrationActionRefusedError`: the proof-integration executor's refusals, predicate-schema-alignment drift and malformed invocations, and an action code with no automatic executor. `reconciliation_required` keeps meaning an action failed without being refused. `toKibiResult` turns a refused migration result into an error envelope with effects `not_applicable`; the CLI JSON route now exits 1 for any error envelope it returns (also a rejected bootstrap plan), and the MCP tool wrapper sets `isError: true` for one. `docs/mcp-reference.md` documents each migration outcome and how `kb_delete` reports an authored-entity refusal (status success, `deleted: 0`, the reason in `errors`); `docs/error-reference.md` adds `MIGRATION_PLAN_REFUSED`; kibi-usage describes both.

- 2e54379: `kb_model` (`mode: "predicates"`) now recognises everyday permission statements. "Suspended users must not publish articles." — the kibi-usage skill's own deny example — returns an applicable `permission_rule` candidate instead of an ontology-gap observation, and so do claims such as "Only editors may approve drafts.". Subject and actor keys derived from plurals are spelled correctly: "coaches" becomes `coach` (not `coache`), "policies" becomes `policy`, and singular words such as "access" or "analysis" keep their final "s".

  Technical summary: the `permission_rule` applicability gate keeps its action-cue list and also accepts a common action verb (publish, approve, assign, view, edit, create, submit, share, complete and similar) when it directly follows the permission modal (`may`, `can`, `cannot`, `must not`, `is allowed to`, …), so a quota such as "Uploads must not exceed 10 MB." still does not read as a permission. Both `singularize` helpers (predicate modeling and the semantic advisor) now share `singularizeToken`: `-ches`/`-shes`/`-sses`/`-xes` drop "es", `-ies` becomes "y", and tokens ending in "ss", "us" or "is" are kept; each helper keeps its existing exceptions. kibi-usage 2.13.0 shows the four-argument `permission_rule(suspended_user,publish,articles,deny)` fact that `kb_model` plans for the fact-lanes deny example.

- f4cc71c: Agents setting up proof now learn up front that a `command` integration is judged as one run: when `kibi proof inspect` proposes the package's whole `test` script, `integrationPlanReason` (also printed in the human output now) says that any failing test in the run fails every proof obligation that names the integration, and how to narrow it. The new `kibi proof inspect --command "<command>"` option proposes that command instead of the detected one, so `kibi proof inspect --update <id> --command "…" --json` can narrow an existing integration to the proof-bearing tests. The kibi-usage proof resource also states that every `required_proofs[].symbol_id` must name an existing symbol entity (create it first) and that `proof_bindings[].source_file` must match that symbol's `sourceFile`.

  Technical summary: `proposeProofIntegration` and `buildProofIntegrationPlan` accept an explicit argv (`--command`, parsed as space-separated words or a JSON array of strings) ahead of the `package.json` test script and the detected runner; a plan built from the package test script appends the whole-run note to its reason. kibi-usage 2.13.0 `resources/proof.md`, `docs/cli-reference.md` and `docs/proving-requirements.md` document the option and the whole-run semantics (the latter no longer suggests an update plan can switch to a native producer).

## 2.5.7

### Patch Changes

- c841267: `kb_model` `mode: "predicates"` now treats an explicit `subjectHint` as the planned subject when the requirement is not written yet or constrains nothing: the candidate gets that `subject_key`, `subject_pairing` is computed against it, and the planned predicate fact carries it, so after the requirement is written with `constrains` to that subject fact `kb_check` no longer reports `strict-req-fact-pairing` (previously the plan fell back to the `requirement.subject` placeholder). A `kb_model` parameter that belongs to another mode is no longer silently ignored: the result's `warnings` name it and the parameter to use instead (for example `subjectKey` in mode `predicates` points to `subjectHint`). The kibi-usage skill (2.12.0) updates the "new strict requirement with a predicate grounding" recipe: pass `subjectHint` with the subject fact's key, and send `specified_by` (requirement → scenario) in the requirement's write, not the scenario's.

  Technical summary: `buildSuggestion` (`predicate-applyplan.ts`) computes `subject_key`/`subject_pairing` against `plannedSubjects` (the constrained subjects, else `[subjectHint]` when explicit, else none). `dispatchComposite` calls the new `foreignParameterWarnings`, which lists input keys another route of the composite declares but the chosen route does not, with per-operation equivalents (`subjectKey` ↔ `subjectHint`); they are appended to the routed payload's own `warnings` (strings, or `{ kind: "parameter_ignored", message, nextAction }` for `kb_model_requirement`) and to the text content. Skill mirrors regenerated.

- e0fdbbd: Agents can now configure proof without hand-writing `.kb/proof/integrations.json`. `kibi proof inspect --json` proposes a command integration for the detected test runner and returns a reviewed, hash-bound plan that `kb_apply_plan` (or `kibi apply-plan`) applies; `kibi prove` then runs it. Proof errors no longer point at a bootstrap step that never wrote the file.

  `kibi proof inspect` adds `proposedIntegration`, `contractDefaults`, `integrationPlan` (`kibi.migration-plan.v2` with one `proof_integration_configure` action) and `integrationPlanReason`, and a new `--update <id>` option plans adding or replacing one named integration. The migration applier gains a `proof_integration_configure` executor: it refuses a create once the file exists, refuses an update when the file's hash changed, refuses either when `package.json`, a lockfile or a runner config changed since planning, and validates the result against `kibi.proof-integration.v1` before an atomic write. The `No proof integration configuration` and `integration … is not configured` messages, the `kibi-usage` proof resource and the `kibi-bootstrap` skill (3.11.0, new step 11 proof-integration item) name this route.

## 2.5.6

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

## 2.5.5

### Patch Changes

- 6315e95: Bootstrap no longer fills the knowledge base with content-free provider facts. A discovered provider entry whose source states no claim (a source module, a package manifest, a layout root, a test file with no recognized framework) is now a provenance stub: written as `fact_kind: meta` tagged `bootstrap:provenance-stub`, planned after every candidate with a claim, counted apart in the plan, ranked after everything else by `kb_search` (and dropped below its default threshold), never listed as a note in the search answer, and not counted as knowledge by `kb_find_gaps` or `kb_coverage`. On a test project, raising `maxCandidates` to 200 had added 150 such stubs, which then surfaced in search answers; the `over_limit` diagnostic now says how many suppressed candidates are stubs so an operator does not raise the limit for them.

  Technical summary: `providerCandidate` classifies a provider candidate by `data.claim`; `test_topology` sets a claim when it recognizes a framework (and stays an observation), while `source_symbols`, `repo_metadata` and `repo_layout` never do (stubs, `provenanceStubBody`). `selectBootstrapCandidates` puts stubs in a last lane, marks `over_limit` rows with `provenanceStub` and counts them in the diagnostic; `presentBootstrap` adds `candidatesWithClaims`, `provenanceStubs` and `suppressedProvenanceStubs` to `discoverySummary` and reports the stub share in `tldr`. The shared `provenance-stub.ts` helper drives the intent-v1 and legacy rankings (`demoted: provenance stub`, sorted last, intent score times 0.25) and the answer layer; `discovery.pl` skips stubs in `find_gaps_json` unless the tag is requested and reports them as `summary.provenanceStubs` in type coverage. The kibi-bootstrap skill (3.9.0) tells agents not to raise the cap for stubs.

- 6315e95: `kb_model` mode `predicates` no longer lets an actor, role or owner be bound to the requirement's subject key. Binding hints offered the subject key for any naming argument, so an agent bound `actor = <subject key>` on a `permission_rule` and got a complete predicate whose actor said nothing the fact's `subject_key` did not already say. Subject keys are now offered only for the `subject` argument and for `entity` arguments; an explicit participant binding equal to a constrained subject key stays unbound with a reason, and when the claim names no participant the hint says so and points to `record_ontology_gap`.

  Technical summary: `predicate-bindings.ts` adds `isParticipantArgumentType` (`actor`, `actor_scope`, `role`, `owner`) and `subjectKeyParticipantReason`, which `classifyBinding` applies to explicit and extracted values through the new `constrainedSubjects` binding context that `buildSuggestion` now passes; the hinted-first-argument shortcut no longer applies to a participant-typed first argument. `buildBindingHints` restricts subject-key examples to `subject` and `entity` arguments and replaces the "or the requirement's subject key" advice with no-participant guidance for participant arguments. `replacementPlan` (K20) now carries `expected.kbCheckAfterStep` listing both `logic-coverage` and `strict-req-fact-pairing` between the retraction and the link, `kbCheckAfterLastStep: []` and `rollbackWhen`, and its instructions and rollback reason state the rollback condition as a `kb_check` that is not clean after the last step. The kibi-usage skill (2.10.0) describes both.

## 2.5.4

### Patch Changes

- 89d8b8e: `kb_model` mode `predicates` no longer offers a predicate plan that `kb_check` would then reject. The requirement's subject now binds the argument a schema names `subject` wherever it sits, and for a schema without one (such as `permission_rule`) it is recorded as the planned predicate fact's `subject_key`; a predicate that is not about a subject the requirement constrains stays `provide_argument_bindings` with a hint instead of `replace_grounding` or `apply_requires_predicate`. A value taken from the claim for an actor, resource or other participant that is a long clause (more than three words) is no longer accepted as a binding.

  Technical summary: `buildSuggestion` binds `subjectHint` or the single constrained subject into `argument_names.indexOf("subject")` and adds `subject_key` and `subject_pairing` (`paired`, `unpaired`, `not_required`) to each candidate; an unpaired candidate gets `subject` or `subject_key` in `unbound_arguments`, a `bindingHints` entry (position -1 for `subject_key`) and a warning naming the schema. `buildPredicateApplyPlan` writes `subject_key` on the planned fact when it is known, so `replacementPlan` step 1 carries it. `classifyBinding` treats an extracted value of an `entity`, `actor`, `actor_scope`, `resource`, `owner`, `role` or `component` argument with more than three snake-case words as a placeholder (`clauseBindingReason`), and the hint says why. The constrained subjects are now read even when `subjectHint` is passed. The kibi-usage skill (2.9.0) describes `subject_key` and short participant bindings.

## 2.5.3

### Patch Changes

- c9dd5f9: Bootstrap plans now write one subject fact per subject key. When claims from different sources (a handoff document and a ticket, say) name the same subject, every requirement links to that one fact instead of each getting its own copy, so `kb_check` no longer reports `subject-key-identity` right after an applied bootstrap and nobody has to merge the facts by hand. The plan lists each shared key in a `subject-key-shared:` diagnostic naming its sources.

  Technical summary: after candidate selection `kb_plan_bootstrap` keeps the first selected subject fact for each `subject_key`, drops the later ones, retargets their requirements' `constrains` links (and the candidates' `relationships`) to the kept fact, and adds every source's `provenance:` tag and a `document.body` listing the sources to it. The transformation depends only on the candidate order, so `planHash` stays deterministic; action `dependsOn` follows the retargeted links. The kibi-bootstrap skill (3.8.0) and `docs/mcp-reference.md` describe the diagnostic.

- c9dd5f9: `kb_model` mode `predicates` now takes the predicate's subject from the requirement: when `requirementId` names a requirement that constrains a subject fact, the predicate uses that fact's `subject_key`, so the predicate and the subject fact name one subject and contradiction checks see them together. Demo guesses such as `editor.annotation` are no longer applied to a requirement; a requirement without a subject fact leaves `subject` for the agent to bind. `docs/mcp-reference.md` now says that `structuredContent.<field>` paths are shorthand for `structuredContent.data.<field>` inside the protocol envelope.

  Technical summary: `handleKbSuggestPredicates` reads the `subject_key` of every subject fact the requirement `constrains`. With exactly one, it binds the schema's `subject` argument with the new binding provenance `requirement` (applicable like `explicit`); with several, they come first in the subject's `bindingHints[].examples`. `subjectHint` and an explicit `argumentBindings.subject` still win. `inferSubject` takes the requirement context and keeps its keyword heuristics for free text without `requirementId`. The kibi-usage skill (2.8.0) names the `structuredContent.data.bindingHints` path and the requirement-bound subject.

## 2.5.2

### Patch Changes

- 5aab5a2: Bootstrap plans no longer turn a whole clause into a subject key. A key such as `support_inbox.update_in_real_time_when_a_new_ticket_is_assigned_to_the_agent_without_a_page_refresh` is now planned as `support_inbox.update_in_real_time`, and the plan diagnostics name the original key so the operator can pick a better name before approving. Two different subjects that would share a shortened key get distinct keys instead of colliding.

  An aspect longer than four words or 40 characters is shortened deterministically: the words before the first clause boundary (`when`, `while`, `for`, `and`, ...) without leading or trailing stop words, then, if still too long, its content words, then the first and last two content words. Each shortening adds a `subject-key-shortened:` diagnostic; a collision between different subjects adds a third segment from the later claim's wording (or a short digest) and a `subject-key-disambiguated:` diagnostic, while claims about the same subject keep sharing one key. One registry per plan covers repository Markdown and declared intent claims. The kibi-bootstrap skill (3.7.0) and `docs/mcp-reference.md` explain how components are supplied and how aspects are derived.

- 5aab5a2: `kb_model` mode `predicates` no longer accepts argument bindings that only repeat a field name, such as `before_event: "before_event"`, or a bare stop word such as `action: "be"`. Those values used to complete a predicate and produce a write plan for a meaningless fact; the argument now stays unbound. When bindings are missing, the response lists each unbound argument with its type and example values so agents can bind from the claim text instead of guessing.

  `classifyBinding` treats a value equal to its own or another argument name (after snake-case normalization) as a placeholder unless the claim itself names it, and treats trivial verbs, articles and filler words as placeholders; `true`, `false`, the schema's declared `argument_constants` and a subject given through `subjectHint` are still accepted. On `provide_argument_bindings`, `structuredContent.bindingHints` gives `argument`, `position`, `type`, optional `description`, `allowedValues` for a closed vocabulary, `examples` from the constants and the schema's examples, the refused `currentValue` with its `provenance`, and a `reason`; the text summary lists them too. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the rule.

- 5aab5a2: The ontology-gap observation that `kb_model` mode `predicates` returns can now be written with `kb_upsert` exactly as returned. Before, every such plan was rejected because it linked the observation to the `review:ontology-gap` tag as if the tag were an entity, and it carried a `claim_key` that made a review note look like a semantic claim. The `replace_grounding` plan is now also directly applicable: its requirement step restates the stored title, status and tags, and the response says why the steps must run in order.

  The gap observation keeps `claim_text`, `value_string` and `text_ref`, drops `claim_key` and the tag relationship, and adds a `document.body` saying that no predicate schema fits and quoting the claim, so schema 8's `entity-context-missing` passes. Semantic-advisor review observations (`review:ambiguity`, `review:keyword-false-positive`, `review:ontology-gap`, `review:nonlogical`) likewise keep their category in `tags` only and carry a body. `replacementPlan` adds a `rollback` step that restores the retracted link if the last step fails, and its instructions note that `kb_check` reports `logic-coverage` between the retraction and the new link. A new MCP stdio test applies both plans through the real server. The kibi-usage skill (2.7.0) and `docs/mcp-reference.md` describe the shapes, and `docs/mcp-reference.md` and `docs/error-reference.md` explain that the `rdf/lock` left after a session belongs to the shared engine daemon, which exits after 10 idle minutes.

## 2.5.1

### Patch Changes

- be5d25e: Bootstrap plans no longer write subject keys that Kibi's own `subject-key-shape` rule flags. Declare the component a knowledge source or an intent claim is about (`component: "recorder"`) and the plan uses keys such as `recorder.beginning_to_record_while_idle`; a claim Kibi cannot place is reported in the plan diagnostics and left as an authoring follow-up instead. Intent claims can also carry the `rationale` the source or the human gave, which becomes the requirement's `rationale` and `## Context`.

  `bootstrapContext.knowledgeSources[].component`, `intentClaims[].component` and `intentClaims[].rationale` are new optional fields bound into the plan hash only when declared. Subject keys keep an already dotted subject, use a one-word subject as the component with the constrained property as the aspect, and otherwise prefix the declared component; repository Markdown takes its component from the file or directory name. The kibi-bootstrap skill (3.6.0) asks the human for the reason behind a requirement whose source states none, and sets scenario `expects` only when the scenario links `assumes` facts, so draft scenarios tagged `needs-human-review` no longer raise `scenario-feasibility-unknown`. The kibi-usage skill (2.6.0) and `docs/modeling-cheatsheet.md` match.

## 2.5.0

### Minor Changes

- 393f492: Large bootstrap plans no longer fall over when they take longer than the agent's MCP client is willing to wait. `kb_apply_plan` reports progress after every bootstrap action, so clients that reset their timeout on progress keep waiting, and `async: true` returns a `kibi.job.v1` receipt to poll with `kb_job_status` instead of holding the request open. If an apply is still cut off mid-action, `kb_apply_plan` with the journal's `recoveryJournalId` resumes it without hand-editing the journal and reclaims a source lock left behind by the dead process.

  `OperationContext` and `RuntimeOptions` gain an optional `onProgress` reporter (`OperationProgress`, `ProgressReporter` are exported from `kibi-runtime`). The bootstrap executor reports after each applied action; the MCP server forwards reports as `notifications/progress` when the request carries `_meta.progressToken`, and each report also pushes back the server's `KIBI_MCP_TOOL_TIMEOUT_MS`, which then bounds inactivity rather than the whole apply. `kb_apply_plan` accepts `async` (MCP only; it falls back to a synchronous apply when `kb_job_status` is not enabled) and its output contract admits the job receipt. Bootstrap recovery now accepts drift since the last checkpoint only when the journal is still `applying` with an active action that has no result: that action is re-applied, the result notes it, and the journal records it under `interruptedActions`; any other drift is still refused. `acquireWorkspaceMutationLock` takes a `reclaimDeadHolder` option; `kb_apply_plan` grants it only for a bootstrap recovery whose journal is `applying`, moves a dead holder's lock aside atomically, records it under `lockReclaims` in the journal, and keeps failing closed for live, unverifiable, corrupt or legacy owners. Bundled skills `kibi-bootstrap` 3.5.0 and `kibi-usage` 2.5.0 describe progress, async apply and journal recovery, and say never to edit `.kb/recovery`.

## 2.4.0

### Minor Changes

- b350869: Requirements, scenarios, tests, ADRs and observations now have to say why they exist. `kibi check` blocks a current entity whose body has no real context, `kb_compile_intent` requires a `context` for a new requirement, and bootstrap keeps the quoted source excerpt in the entity instead of only on the approval screen. Existing knowledge bases upgrade to schema 8 with `kibi migrate --yes`, which keeps every body byte-identical and only tags entities that lack context `review:context-missing`, recording their ids in `.kb/manifest.json`; the tag is honored only for those ids, so an agent cannot clear the check by tagging an entity itself. Run `kibi sync` afterwards.

  Entity bodies are split into sections by Markdown headings; `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` headings count as context. A requirement counts only context headings, while scenarios, tests, ADRs and observation or meta facts count all prose. Context needs at least 12 words and a token-set Jaccard similarity below 0.8 against the title (and, for a requirement, `semantic_text`); symbols, flags, events and other fact kinds are exempt. New canonical rule `entity-context-missing` and advisory `entity-context-acknowledged` are registered, and `kb_upsert` (including dryRun) warns about the same finding. `requirementSemanticText` now excludes context sections, and every requirement authoring path writes `semantic_text` explicitly; the schema 8 migration pins it for existing requirements with the previous derivation so claim spans and hashes do not move. `kb_compile_intent` gains `context`, `sourceExcerpt` and `sourceReference` and renders statement, `## Context` and `## Source`; on update it replaces the statement and keeps the existing context sections byte for byte unless new context or source is supplied. `kb_plan_bootstrap` requires `excerpt` for `intent` and `observation` claims and persists it with the source title and reference in the created body. Search snippets come from the first context prose. Bundled skills `kibi-usage` 2.4.0 and `kibi-bootstrap` 3.4.0 document the per-type body contract and say never to invent a reason.

## 2.3.1

### Patch Changes

- 7f08632: Bootstrap no longer drops conditional claims ("If microphone access fails, the editor must ...") or obligations that mention a referent ("... any draft state that refers to it") as `invalid_write`; they become ready requirement candidates. Linking a scenario to an existing requirement with `kb_upsert` no longer requires resending its whole semantic inventory, and a review observation can quote the claim it is about without a `claim_key`. The bundled skills now show how to answer `provide_argument_bindings` from `kb_model` predicates and how to write scenarios from acceptance criteria.

  Technical summary: requirement steps built by `kb_plan_bootstrap`, the `kb_model` requirement path and typed logic plans take each inventory role from the semantic advisor (`advisorPropositionRole`), so the write-time proposition-complete check accepts what Kibi itself generated. The advisor classifies a clause as `definition` only when "means / is defined as / refers to / is called" is the main predicate of a sentence that asserts no obligation; inventories stored with the earlier `definition` role for such clauses still validate. `kb_upsert` on an existing `req` whose payload carries no `semantic_*` or `logic_claims` field and keeps the stored `title` and `text_ref` merges the stored ledger (and the stored `text_ref` when the payload omits it) before validation and writing; a payload that supplies ledger fields or changes the prose is checked as sent. The entity schema, the `kb_upsert` input schema and the Prolog shape check now let an `observation` or `meta` fact carry `claim_text` without `claim_key`; every other fact still needs both. `kibi-usage` 2.3.2 adds a predicate-binding retry example and a review observation payload; `kibi-bootstrap` 3.3.1 makes step 11 write scenarios from acceptance criteria with `assumes` links.

## 2.3.0

### Minor Changes

- 44b2d0d: After bootstrap, agents now keep going instead of stopping at a knowledge base that holds only cited requirements. Previously the `kibi-bootstrap` skill ended with "hand off to the normal Kibi workflow" and no instructions, and its rule against direct `kb_upsert` left claims the plan could not write with no way to author them. Now a "deepen" step tells the agent what to author next, in the normal workflow and with the human informed.

  The bundled `kibi-bootstrap` skill is now 3.3.0. A new step 11 ("Deepen") runs after apply and close-out. It loads `kibi-usage` and hands every claim suppressed as `invalid_write` or listed in `sourceOnlySignals` to `kb_model` and `kb_upsert` with its statement and `sourceId:reference` citation. It proposes a scenario from acceptance criteria (`specified_by`) for each persisted requirement, runs `kb_model` with `mode: "predicates"` on each one, and records any undeclared conflict or open question as a `review:conflict` or `review:open-question` observation. The safety boundary now states that the direct-`kb_upsert` prohibition covers the bootstrap plan's own writes, not this post-bootstrap authoring. Step 5 sends unplanned claims to step 11, and the report step is renumbered 12.

### Patch Changes

- ec26130: Bootstrap now keeps what the onboarding interview leaves unsettled. Previously every declared claim was treated as intended behavior, and contradictions between sources or open questions had no place in the plan, so they stayed in the agent's own notes and were lost after apply. Now a claim can be marked as an observation or an open question, and conflicts between claims can be declared. Each is kept in the KB as a cited review fact instead of becoming a requirement.

  `kb_plan_bootstrap` accepts `bootstrapContext.intentClaims[].kind` (`intent` by default, `observation`, `open_question`) and `bootstrapContext.conflicts[]` (`claimReferences` of two to ten `{ sourceId, reference }` pairs plus a `note`). Observation and open-question claims become `fact_kind: observation` candidates with the claim's citation evidence and `text_ref: <sourceId>:<reference>`; open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict naming an undeclared claim is reported in `diagnostics`. Kinds and conflicts are part of `declaredContext` and the plan hash (the default `intent` kind is omitted, so existing plans keep their hash), and the facts go through the same plan-time write validation as every other candidate. The `kibi-bootstrap` skill (3.2.3) updates the harvest, declare and approval steps.

- 094fcae: Bootstrap now links your declared intent to the code even when you declare many claims. Previously declared intent claims used up the shared `maxCandidates` budget, so with 50 or more claims every symbol, test and repository document Kibi found was suppressed as `over_limit`, and the plan to approve listed hundreds of suppression rows. Now claims sit outside the budget, generic Markdown stays out of claim-driven plans unless you ask for it, and suppressions are summarized as one count per reason.

  `kb_plan_bootstrap` applies `maxCandidates` (default 50) only to discovered candidates, independent of how many declared `intentClaims` are planned, and reports one `N discovered candidate(s) exceeded maxCandidates` diagnostic instead of the old "discovered candidates get no slots" note. `includeGenericMarkdown` defaults to `false` when `bootstrapContext` declares `intentClaims` (a diagnostic states it) and to `true` otherwise; an explicit value always wins, and the input schema no longer advertises a fixed default. `tldr` and a new `Suppressed candidates by reason` diagnostic aggregate `suppressedCandidates` per reason; the full rows are unchanged. The `kibi-bootstrap` skill (3.2.2) updates step 5 accordingly.

## 2.2.2

### Patch Changes

- 564b171: Bootstrap plans no longer drop the intent claims you declared from tracker, wiki or spec sources when the repository has many candidates. Previously the default 50-candidate cap could silently discard every claim from one source, and two markdown lines that restated one rule could leave an approved plan half-applied. Now every declared claim is planned, each source reports how many of its claims were planned, and a plan that plans none of an authoritative source's claims asks for context instead of reporting ready.

  `kb_plan_bootstrap` applies `maxCandidates` only to discovered candidates. Candidates that would rewrite an already-planned entity with different content are suppressed as `duplicate_entity`, and the write-time `claim_key` grounding check now also runs at plan time against planned writes, suppressing mismatches as `invalid_write`. The plan adds one `Knowledge source …` diagnostic per declared source. The `kibi-bootstrap` skill (3.2.1) tells agents to read those diagnostics and no longer advises against `maxCandidates`.

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

## 2.2.1

### Patch Changes

- Agents now pick up the `kibi-bootstrap` skill for onboarding work beyond seeding a new knowledge base: reviewing a plan or preview, judging approval readiness, diagnosing a blocked or failed bootstrap, and applying an approved plan. The skill starts every task with `kb_status`, routes review and repair tasks to a read-only preview, and checks before applying that the plan matches the approved one field for field, including `suppressedCandidates`. In paired SkillOpt runs, 10 cells per variant, the new skill scored 95 against 70 for the previous one. It applied approved plans that the previous skill failed to apply, and it had no security failures where the previous skill had two.

  Skill `kibi-bootstrap` 3.2.0 rewrites the frontmatter `description` and the body. Every other frontmatter field and every resource stays the same. The candidate was drafted, evaluated and confirmed on a fresh cohort with the SkillOpt campaign workflow, using the Claude Code target host.

## 2.2.0

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

- 15356de: Host hooks no longer ask for a `kb_check` after a `kb_upsert` dry run. A dry run only validates, so the Cursor, Codex, ZCode and OpenCode hooks now count it as validation rather than a KB write.
  - `extractKbMcpToolCall` reports `kb_upsert` with `dryRun: true` as `kb_validate_upsert`.
  - OpenCode's freshness evidence records a dry-run upsert as `kb_validate_upsert`, which carries no mutation evidence.

- 1012d1c: Kibi keeps answering from the right place when you work in a git worktree, a detached checkout, or on a machine without Prolog. Host launchers no longer pin the MCP server to the first workspace, so per-call workspace routing keeps working, and a missing Prolog runtime points at `kibi doctor` instead of failing opaquely.
  - Claude Code, Codex, Cursor and Z Code launchers set `KIBI_MCP_ATTACH_ROOT` instead of `KIBI_WORKSPACE`; the server starts in that directory without disabling routing. `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT` and `KIBI_ROOT` still pin.
  - A detached HEAD whose commit is the tip of exactly one local branch attaches that branch's KB.
  - `kb_status` reports `swipl_*` error codes with a `kibi doctor` remediation when the Prolog runtime cannot be resolved.
  - CI and publish check that the committed Claude hook bundle matches its source.

## 2.1.0

### Minor Changes

- f93dcdd: Bootstrap no longer learns only from the code. The agent now starts with a short interview: it asks where product intent already lives (issue trackers such as Jira or YouTrack, wikis, specs, decision logs), which sources are authoritative or stale, and reads them through its own connectors. The bootstrap plan records those sources and the intent claims harvested from them, so each requirement taken from a ticket or page cites it and the citation is part of the approved plan hash. Kibi still never contacts those sources itself.
  - feat(cli): `kb_plan_bootstrap` / `plan-bootstrap` accept `bootstrapContext.knowledgeSources` (id, kind, title, locator, authority, optional connector) and `bootstrapContext.intentClaims` (statement, sourceId, reference, optional excerpt). Both are normalized into `declaredContext` and bound into `planHash`. Grounded claims from authoritative or supporting sources become `req` candidates with `sourceKind: intent_claim`, citation evidence, and `text_ref: <sourceId>:<reference>`. Ungroundable claims become authoring follow-ups, stale sources are suppressed with `stale_knowledge_source`, and claims citing undeclared sources are reported as non-blocking diagnostics. A `needs_context` plan without declared sources asks for them.
  - feat(skills): `kibi-bootstrap` 3.1.0 leads with the source interview before planning; the MCP `/kibi-bootstrap` prompt and the Cursor and ZCode commands follow it.
  - docs: README, landing page, quick start, and install guide lead with a copy-paste agent setup prompt; manual installation moves behind a toggle.

### Patch Changes

- 676bac9: The Claude Code, Codex, Cursor, and ZCode plugins now tell the Kibi MCP server which workspace each call is about, so sessions working in a git worktree are answered from that worktree's branch instead of the checkout the server started in. Nothing changes for sessions that stay in one project.
  - Each plugin's pre-tool hook adds `workspaceRoot`, the agent's current Kibi workspace, to every Kibi MCP call. Claude Code, Cursor, and ZCode send it without a permission decision so the host's own approval flow is unchanged; Codex requires `permissionDecision: "allow"` for input rewrites, which does not override a server's tool approval mode.
  - `kibi-agent-core` exports `KIBI_WORKSPACE_ARGUMENT`, `isKibiMcpToolName`, and `stampKibiWorkspace` for the plugins.
  - The Codex hook parser now reads `hook_event_name`, the field Codex actually sends; the Claude and ZCode `PreToolUse` matchers include `mcp__.*__kb_.*`.
  - The ZCode launcher sets `KIBI_MCP_HOST=zcode` so its usage rows are attributed like the other hosts'.

## 2.0.3

### Patch Changes

- db5376c: Projects can now opt into impact reviews that bind a change to its exact source, knowledge decisions and trusted analysis policy. Kibi validates both staged changes and a complete pull-request diff, rejects stale review evidence, and lets agents prepare an unauthored review template through the CLI or MCP instead of hand-assembling one. Every decision and reviewer field stays for an agent to write; preparation never approves or proves anything.
  - Add versioned impact policy and review schemas, immutable review fingerprints, reviewed Python decorator coordinate migration and the trusted aggregate `check-diff` command.
  - Add the read-only `prepare-impact-review --input` CLI route and `kb_prepare_impact_review` MCP operation; regenerate the bundled operation-access catalog for the agent integrations.
  - Keep the sample CI workflow inactive until it is adopted on a protected target.

## 2.0.2

### Patch Changes

- 35cd120: The ZCode, Codex, and Cursor plugins now recognize Kibi tools when the host
  reports them with a prefix, such as `mcp__kibi__kb_check`. Before this fix,
  an agent that correctly ran an impact check through a prefixed tool name
  still got a stop reminder to run it, because the plugin never saw the check.
  - `kb-mcp-tools.ts` in each adapter gains `canonicalKbToolName`, which strips
    `mcp__<server>__`, `MCP:`, and `kibi_` prefixes before matching `kb_*`
    operations.
  - The Codex hook bundle is regenerated.

- 5a06c03: Kibi's agent plugins now share one fast, consistent implementation for source-path classification, Kibi MCP tool recognition, and symbol-manifest indexing. Codex and ZCode now recognize production code outside `src/`, while Cursor reuses the same size-and-mtime-keyed scanner as Claude instead of parsing the full symbol manifest before an edit.
  - Add `kibi-agent-core` as the common Node 18-compatible hook-helper package.
  - Keep host adapters thin while preserving their host-specific event and state contracts.
  - Replace Cursor's YAML parser dependency with the shared cached line scanner.

- f01838e: Usage telemetry stays off by default for every client, and there is now a supported way to turn it on. Previously the only way to capture usage was to hand-write an MCP command line with `--diagnostic-mode`, which meant anyone using a shipped plugin recorded nothing at all and had no documented alternative. Operators can now opt in with an environment variable, and once they do, each row identifies the host, package version, and checkout that produced it, so behavior can be compared across editors, worktrees, and Kibi versions.
  - Honor `KIBI_DIAGNOSTIC_MODE=1` alongside the existing `--diagnostic-mode` flag, for hosts where a plugin owns the MCP command line.
  - Stamp `interface`, `host`, `package_version`, and `workspace_root` on every usage row.
  - Set `KIBI_MCP_HOST` from the Cursor and Codex launchers for attribution only; it never enables logging, and installing or enabling a plugin never starts telemetry.
  - Stop the bundled Cursor worktree resolver from hard-coding `--diagnostic-mode`, so a shipped launcher cannot enable capture on an operator's behalf.
  - Document the opt-in, what a row contains, and how to opt out in `docs/mcp-reference.md`.

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

## 2.0.1

### Patch Changes

- 188f875: No user-facing behavior change: `kibi-runtime` now resolves its bundled-skills directory lazily on first use instead of at import time, `isWithinRoot` drops a redundant same-path comparison, `kibi-cursor` drops a provably dead `planDelivered` early return and an always-true stdin branch, and the hook runners' stdin buffering is simplified to an unconditional `Buffer.from`. The reshaping lets the new mutation-testing suite (`docs/mutation-testing.md`, run via `bun run test:mutation`) prove these paths exhaustively — the suite holds a 100% mutation score over `kibi-runtime`, `kibi-codex`, and `kibi-cursor` sources.
- db07d8f: Proof diagnostics now agree with the Prolog decision: a structural type-shape unit contract is shown as qualifying, `kibi proof impact` compares against the Git HEAD baseline and exits 0 after a successful report, and mixed-role symbols fail the strict proof integrity gate.
  - Mode-aware candidate evaluation in Prolog; receipt fallback uses `test_receipt_evidence(Context, TestId, Evidence)`.
  - `proof impact` reads `HEAD:proof/baseline.json` with no worktree fallback; diagnostic exit 0.
  - Strict proof workflow and baseline checker include canonical `symbol-traceability`.

- f33a665: Proof failures now name the exact requirement, symbol, and why each `covered_by` candidate did not qualify, without changing what counts as proven. Agents can inspect a requirement with `kibi proof explain` and compare current proof state to the committed `proof/baseline.json` snapshot with `kibi proof impact`, instead of reverse-engineering Prolog or guessing from aggregate counts.
  - Keep `kibi.requirement-proof.v3` and add additive production-symbol `explanations` plus TEST `testResolutions` on the same Proof.
  - Ratchet `proof/baseline.json` to v2 with compact requirement fingerprints; aggregate counts stay the ratchet.
  - Add `kibi proof explain` and `kibi proof impact` as Proof projections, mixed-role leftovers in `symbol-traceability`, and advisory `proof-contract-symbols`.
  - Document the proof-regression workflow in `kibi-usage` 2.1.3.

## 2.0.0

### Major Changes

- 812c201: Kibi's proof layer is now runner-neutral: any test runner, script, or harness can prove requirements, and Playwright is no longer built into the proof model.
  - `kibi prove` replaces `kibi verify` as the single command to run configured proof producers and record evidence. Proof contracts (`kibi.proof-contract.v1`) declare explicit obligations (`symbol_id` + `target`) executed by a configured integration in `.kb/proof/integrations.json`; `kibi proof inspect` discovers test infrastructure deterministically; one producer run can satisfy many test contracts, and re-ingestion is idempotent.
  - Evidence moves to the `kibi.proof-run.v1` artifact (typed environment, run-level outcome, factual attempt history with `native_case`/`aggregate_run` provenance) evaluated into `kibi.proof-receipt.v1` receipts bound to the live snapshot, contract hash, and effective execution fingerprint. Command proof is the universal fallback, so every project can prove requirements without a first-party framework adapter; strict first-attempt policy never upgrades unknown attempt history into passing evidence.
  - Breaking removals: `kibi verify`, `kb_ingest_verification`, `kibi.playwright-run.v1`, `verification_contract`/`verification_receipts` entity fields (replaced by `proof_contract`/`proof_bindings`/`proof_receipts`), the `required_case_symbols`×`required_projects` Cartesian contract, and `retries` fields. Migrate by re-running `kibi prove` after bootstrap configures proof for your repository.

  DRY: hard cutover to the proof-evidence protocol across CLI, MCP, runtime skills, Prolog proof evaluation, coverage/repair/report surfaces, agent skills, and repository self-proof (packed e2e steps now execute through `kibi prove --all`).

### Minor Changes

- 6cb8c7f: The Kibi plugin for Codex now stays silent and inactive in workspaces that never
  opted into Kibi, even though the plugin itself is installed and enabled
  globally. Unconfigured workspaces no longer see bootstrap prompts, edit
  tracking, freshness reminders, or MCP startup errors, while opted-in workspaces
  keep the full workflow with reminders scoped per workspace (worktrees
  included).
  - Workspace opt-in is defined by `.kb/manifest.json` at the resolved Kibi
    project root (honoring the standard `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT`,
    and `KIBI_ROOT` environment overrides). Project-root resolution walks up from
    the session directory and stops at the `.git` boundary, so subdirectories map
    to their repository, Git worktrees stay independent, and unrelated enclosing
    repositories never leak opt-in.
  - Every hook event exits successfully and silently in unconfigured workspaces;
    no hook state is written there, and hook state is now namespaced under
    `workspaces/<hash-of-root>` so one project's activity can never surface as
    reminders in another.
  - `.mcp.json` now launches an inline workspace-aware launcher (`node -e`,
    built from `bin/mcp-launcher.cjs`): it serves a clean zero-tool MCP session
    in unconfigured workspaces, proxies the project-local `kibi-mcp`
    (`npx --no-install kibi-mcp`, unchanged resolution semantics) in opted-in
    workspaces, and starts with guidance instead of a handshake failure when an
    opted-in workspace lacks a resolvable `kibi-mcp`. Codex (verified against
    codex-cli 0.153.4) has no workspace-scoped MCP activation, so the launcher is
    the supported way to keep non-Kibi workspaces free of MCP startup errors.
  - Explicit initialization is unchanged and remains opt-in: run `kibi init` or
    the kibi-bootstrap skill; the plugin never initializes a workspace on its own.
  - Packaging: the packed plugin is verified to ship `dist/hook-runner.js` and
    the compiled hook assets; local marketplace installs should run
    `bun run build:codex` before installing (a source-tree install without a
    build is missing the hook runner entirely).

### Patch Changes

- d3a5a6e: Codex plugin installations now include a self-contained hook runner, so lifecycle hooks work directly from a source checkout as well as from a packed package. The runner keeps the existing Kibi workspace opt-in and per-workspace state behavior while covering SessionStart, PreToolUse, PostToolUse, and Stop.
  - Bundle the Codex hook runner into the published `bin` artifact and check it for deterministic drift.
  - Point the hook manifest at the host-provided `$PLUGIN_ROOT` executable path.

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

### Patch Changes

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

- 3d7d04f: Generic MCP and CLI agents now discover Kibi's operating rules from bundled skills instead of a long copy-paste prompt. Improving an existing product KB is covered by a `kibi-usage` resource rather than a second manual, so agent guidance stays in one place and cannot drift from the packaged workflow.
  - Add `kibi-usage` `resources/kb-improvement.md` and bump that skill to 2.1.0.
  - Replace `docs/prompts/llm-rules.md` with `docs/generic-agent-onboarding.md`.
  - Remove the obsolete retroactive-init prompt; bootstrap stays in the `kibi-bootstrap` skill.

- 1cbbc94: Codex users can now install the Kibi plugin and have its MCP server resolve from the active project automatically. The plugin keeps the consumer's local dependency boundary, so it does not accidentally run a cached plugin copy or download a package at startup.
  - Use Codex's `mcpServers` configuration wrapper and inherit the host-provided task cwd.
  - Keep `npx --no-install kibi-mcp` and the existing approval and timeout policies.

- 535dea8: Agents can now keep working in synthetic, detached, or unreadable workspaces while Kibi reports the migration work it can evaluate. Coverage and checks preserve their useful domain results when branch status is unavailable, and the Codex/Cursor skill assets now stay aligned with their published plugin metadata.
  - Keep status-derived migration actions read-only and append them only when branch resolution succeeds.
  - Preserve the shared migration-plan contract across coverage and checks without requiring a Prolog-backed status query in non-Git harnesses.
  - Synchronize plugin manifests and freshness skill CLI examples for the next coordinated patch release.

- c942344: Kibi now keeps long-lived Prolog discovery responses intact even when JSON is printed across multiple lines, and Codex hook state remains durable under concurrent updates. Coverage runs also produce an auditable source manifest and continue collecting all shards so one failure cannot hide the rest of the signal. This makes the initial coverage floor measurable while leaving a clear path to the 100% target.
  - Patch `kibi-cli` for multiline Prolog binding parsing.
  - Patch `kibi-codex` for append-only hook-state persistence and deterministic concurrency handling.

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

- Updated dependencies [6ca08bb]
- Updated dependencies [a2acea9]
- Updated dependencies [33262f8]
- Updated dependencies [9e6fb3f]
- Updated dependencies [3d7d04f]
- Updated dependencies [2d6cc59]
- Updated dependencies [8f71f1a]
- Updated dependencies [a07fad5]
- Updated dependencies [2e68da9]
- Updated dependencies [4cf383b]
- Updated dependencies [7bc4f61]
- Updated dependencies [15b5825]
- Updated dependencies [51fb55b]
- Updated dependencies [1ca62af]
- Updated dependencies [f1a6d5c]
- Updated dependencies [1ca62af]
- Updated dependencies [44fd818]
- Updated dependencies [8fe890c]
- Updated dependencies
- Updated dependencies [7654339]
- Updated dependencies [c77d3f1]
- Updated dependencies [967cef7]
- Updated dependencies [395e38f]
- Updated dependencies
- Updated dependencies [535dea8]
- Updated dependencies [5fdb828]
- Updated dependencies [b97329a]
- Updated dependencies [4c75e4d]
- Updated dependencies [c942344]
- Updated dependencies [07803e4]
- Updated dependencies [b746960]
- Updated dependencies [400e88c]
  - kibi-cli@1.0.0
  - kibi-mcp@1.0.0

## 0.20.3

### Patch Changes

- Existing Kibi installations now receive an agent-guided migration workflow instead of opaque repair advice. Status, checks, and coverage expose one deterministic, hash-bound action plan; agents can safely apply only explicitly approved automatic repairs while semantic, proof, package, and operator work remains visible for review. This makes damaged or legacy KBs recoverable without direct `.kb` edits and gives every run an auditable post-application readback.
  - Add `kibi.migration-plan.v2` fragments to the 21-operation surfaces and support hash/action authorization in `kb_apply_plan` and `kibi migrate --apply-safe`.
  - Add lazy status/planning and deterministic schema, branch, storage, coordinate, and recovery action execution with workspace-root-safe CLI/MCP parity.
  - Refresh agent skills, traceability fixtures, and SkillOpt coverage for migration safety boundaries and five-axis closeout reporting.

## 0.20.2

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

## 0.20.1

### Patch Changes

- Dogfood projects now get branch-local knowledge bases that follow the exact Git ref, actionable stale-source diagnostics, and a sanctioned relationship cleanup path. Verification receipts and packed package provenance are stricter and reproducible, while agents receive conservative symbol-recovery guidance and explicit interim-state signals. This prevents silent `master`/`main` drift and makes passing E2E evidence distinguishable from complete semantic proof.
  - Remove implicit branch-name normalization and add previewed legacy branch migration.
  - Add exact relationship deletion, v2 receipt/schema parity, status diagnostics, dogfood package manifests, and SkillOpt cases.

## 0.20.0

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

## 0.19.1

### Patch Changes

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.
  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

- Codex and Cursor users now receive the same verified prose-to-logic guidance as the Kibi CLI. The bundled `kibi-usage` skill explains proposition coverage, typed Logic IR safety, predicate recovery, and contradiction-aware validation without relying on repository-specific release conventions.
  - Synchronize the Logic IR, fact-lane, workflow, and portable skill guidance into both agent bundles.
  - Keep the bundled skill manifests and canonical hashes aligned with the CLI public skill.

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

- 2f9073c: Kibi now ships optional guidance for recording UI and visual expectations, so agents working on a screen can discover "where things live" and cannot silently drift the layout. A prose requirement anchors the full visual description, checkable positions, alignment, and header ordering decompose into strict facts that reject conflicting writes, and relational alignment uses the built-in `visual_layout_rule` predicate. The lane is per-project: non-UI projects simply never model UI subjects, and no validation rule requires them.

  Also, `kb_status` within a long-lived MCP session now observes same-session file and KB changes instead of returning a stale cached result. Compound Prolog goals (such as the status query) are no longer cached in one-shot mode, so a status check after a source or documentation edit reports the current freshness state.
  - Add `docs/ui-requirements.md` with the three-layer UI modeling guide, payload-shaped examples, and the check workflow.
  - Point the modeling cheatsheet decision tree, agent LLM rules, and the AGENTS quick references at the new UI lane.
  - Add a self-contained `kibi-usage` skill resource (`resources/ui-requirements.md`), declare it in the skill manifest, and add a UI modeling workflow section.
  - Synchronize the updated `kibi-usage` skill into the Codex and Cursor bundles.
  - Keep compound Prolog goals out of the one-shot query cache so `kb_status` reports fresh state after same-session writes.

## 0.19.0

### Minor Changes

- b2b1792: Kibi guidance now helps agents distinguish suitable relational predicates from scalar constraints and review-only claims without replacing readable requirements. CLI, Codex, and Cursor users receive the same predicate-first decision tree and authoritative examples, reducing invented predicates and unsafe modeling.
  - Add built-in, project-local, deny, strict-scalar, ambiguity, false-positive, and ontology-gap guidance to the canonical `kibi-usage` skill.
  - Regenerate the Codex and Cursor mirrors with matching canonical hashes.

### Patch Changes

- 610b5be: The improved Kibi guidance skills will ship to CLI, Codex, and Cursor users in the next package release. This keeps the canonical CLI skill bundle and the generated client-plugin mirrors aligned for downstream installs.
  - Release the canonical skills bundled by `kibi-cli`.
  - Release the generated `kibi-codex` and `kibi-cursor` skill mirrors.

## 0.18.0

### Minor Changes

- a0fee4a: The Codex plugin now supports capability-based Kibi interface selection, using visible MCP tools first and a trusted project-local CLI fallback when needed. Agents can retain the same 18-operation workflow when MCP is unavailable without falling back to direct knowledge-base file access.
  - Add MCP-first, CLI-fallback agent guidance.
  - Ship the generated operation-access resource with all four Kibi skills.

### Patch Changes

- cafa25f: Agents can now select Kibi by available capability instead of stopping at MCP-specific guidance. The bundled skills prefer approved MCP tools, fall back safely to a project-local non-installing CLI runner, and provide executable JSON recipes plus an exact 18-operation access catalog.
  - Document every shared MCP operation's dedicated CLI route, input mode, effects, Prolog requirement, mutability, and telemetry handling.
  - Regenerate Cursor and Codex skill mirrors from the canonical capability-based source.

## 0.17.1

### Patch Changes

- f1db710: Kibi check outputs now have a stable advisory diagnostics lane for auditability review signals. Operators and MCP clients can receive `qualityDiagnostics` alongside hard `violations` without advisory-only findings changing pass/fail counts or exit behavior. Existing staged impact failures, including symbol granularity violations, remain blocking. Source impact analysis now also highlights overly broad symbols, indistinguishable symbol coordinates, and mixed-purpose component/class ownership as review-only guidance.

  Technical summary:
  - Add the public `QualityDiagnostic` type with `error`, `warning`, `review`, and `info` severities plus explicit `blocking` semantics.
  - Preserve existing `violations`, `diagnostics`, and `impactDiagnostics` fields while adding MCP structured `qualityDiagnostics` output support.
  - Preserve explicitly filtered MCP `kb_check` rule semantics so advisory full-KB quality scans only run for unfiltered checks or requested impact diagnostics.
  - Clarify Codex and Cursor bundled agent guidance so targeted checks use explicit rules and final checks omit rules for full-KB `qualityDiagnostics` review.
  - Add quality diagnostic text formatting and shared blocking helpers that treat `blocking: true` or `severity: "error"` as hard failures.
  - Add non-blocking `multi_requirement_symbol_review`, `duplicate_symbol_coordinate_review`, and `component_mixed_purpose_review` impact diagnostics.

## 0.17.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:
  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

## 0.16.1

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.
  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

## 0.16.0

### Minor Changes

- e4d1919: Codex users can now install an optional Kibi adapter package for bundled Kibi skills, MCP configuration, and warning-only lifecycle hooks. This gives teams a managed Codex entry point while keeping `kibi-core`, `kibi-cli`, and `kibi-mcp` as the foundation for project-local Kibi operations. Teams that do not use the plugin can continue to configure Codex manually against the local `kibi-mcp` command.
  - Add the publishable `kibi-codex` package with Codex plugin manifest assets, bundled skills, hook declarations, and MCP config.
  - Add a conservative hook runner with bounded dirty-path state and advisory-only setup/freshness messages.
  - Wire `kibi-codex` into workspace build, pack, release-state, publish, CI unit coverage, docs, and local marketplace verification.

## 0.15.0

### Minor Changes

- Initial Codex plugin package skeleton for Kibi.
