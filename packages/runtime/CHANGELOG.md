# kibi-runtime

## 2.25.0

### Minor Changes

- a84493d: Symbol coordinates no longer cause merge conflicts. `.kb/symbol-coordinates.yaml` is now a local cache that every `kibi sync` derives from source; it is gitignored and never committed. Before, each coordinate record carried a hash of its whole source file, so any two branches that edited the same source file conflicted on it, even when they touched different declarations.

  What changes for you:
  - `kibi init` adds `.kb/symbol-coordinates.yaml` to `.gitignore`. Every `kibi sync` refreshes the cache incrementally, re-extracting only symbols whose source or identity changed, and never rewrites `.kb/symbols.yaml`.
  - The staged check judges symbol evidence by the declaration titles in the staged `.kb/symbols.yaml`. When those titles cover every declaration of a staged source file, that is impact evidence for it, so a body-only edit to a modeled symbol now commits with only the `symbol_semantic_review_needed` warning instead of needing a coordinate refresh staged with it. A renamed or added declaration that `.kb/symbols.yaml` does not list still fails, and the message names the uncovered and stale titles.
  - `kibi check-generated --staged` checks only the `.kb/symbols.yaml` layout and rejects a commit that stages the coordinate cache.
  - Schema 13: `kibi migrate` adds the gitignore entry and removes a committed `.kb/symbol-coordinates.yaml` from the Git index while keeping the local file. Commit the result once; until then `check-generated` blocks commits in repositories that still track the file.
  - The reviewed refresh gate for Python decorator coordinates is retired, since there is no committed coordinate refresh left to review.

## 2.24.1

### Patch Changes

- kibi-runtime and kibi-mcp bundle the same Prolog query fix: a query completes only once SWI-Prolog's whole answer frame has been read, so the MCP server's engine no longer stops reading the Prolog child under Bun.

## 2.24.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [90e1657]
  - kibi-core@0.26.1

## 2.23.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [c118085]
  - kibi-core@0.26.0

## 2.22.0

### Minor Changes

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

### Patch Changes

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

- Updated dependencies [4d55860]
- Updated dependencies [42566ee]
- Updated dependencies [c99f89b]
- Updated dependencies [bcbeebe]
  - kibi-core@0.25.0

## 2.21.0

### Minor Changes

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

### Patch Changes

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
- Updated dependencies [94dc89d]
- Updated dependencies [a71798f]
- Updated dependencies [0d68081]
- Updated dependencies [1fea8f6]
- Updated dependencies [26bfdd6]
- Updated dependencies [b3b3cbd]
  - kibi-core@0.24.0

## 2.20.1

### Patch Changes

- 45036a3: Signoff guidance no longer tells agents to attach `latest.html` as a file. Chat apps (the Claude apps, Slack and most others) show an attached HTML file as raw source or a download, so agents now share the page only as a rendered page, such as a Claude Artifact, and otherwise leave the message text as the whole view. Updates the kibi-decisions and kibi-commit-review skills (1.2.1), the `kibi signoff` page note and the stop-hook reminder.

## 2.20.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [39721a1]
- Updated dependencies [a1c7479]
  - kibi-core@0.23.0

## 2.19.0

### Minor Changes

- 5e3541e: Two new bundled skills cover the moments where agents most often went wrong with Kibi.
  - `kibi-decisions` loads when a person states a rule ("must", "never", "from now on"), when a hook asks before an edit to code that implements a firm requirement, when the session ends without recording what changed, or when a request conflicts with a recorded rule. It shows how to read a requirement's firmness and origin, record a person's rule as firm with a reference to their words, supersede a rule with a "Why this changed" section, work through `kb_compile_intent` review candidates, and ask before overriding a firm rule.
  - `kibi-commit-review` loads when `kibi check --staged` or the pre-commit hook blocks a commit, or when preparing a commit or pull-request impact review. It explains the per-file `Detail:` lines, how to add the missing symbols and refresh coordinates, which Kibi files to stage, how to prepare an impact-review record with `kb_prepare_impact_review`, and how merge commits and migration renames are judged.

  `kibi-usage` now points to these skills instead of repeating their detail, and the OpenCode guidance routes rule and commit questions to them.

- 7a3edce: Signoff is now one readable view instead of loose chat text. `kibi signoff` lists the requirements a change adds, rewrites, retires or affects, each quoted with its firmness, origin, scenarios and proof state, and `kibi signoff --questions` numbers the decisions waiting for you next to the recorded rule each one would change or conflict with. The output is a fenced Markdown block for the agent's reply, a self-contained HTML page (`--format html --open`) or JSON, and every run keeps the latest view in `.kb/briefs/signoff/`.

  Claude Code renders the block as Markdown through a new `MessageDisplay` hook (`KIBI_SIGNOFF_DISPLAY=0` turns it off), OpenCode 2 draws it as a framed card with a `/kibi-signoff` command and a toast, and VS Code offers a **Kibi: Show Requirements Signoff** panel that refreshes as the agent updates it. The `kibi-decisions` and `kibi-commit-review` skills now tell agents when to run it.

- 180196c: The requirements signoff view now reads well on every host, not only in the hosts that draw Kibi's fenced block.
  - `kibi signoff` prints plain Markdown by default (`--format chat`): headings, quoted statements and lists that render in any chat window, and in messaging tools for agents whose replies go through one (cloud and project sessions). The path of the self-contained page `.kb/briefs/signoff/latest.html` goes to stderr, so an agent can attach or publish it next to the message. `--format md` keeps the fenced block for the OpenCode terminal card, and `KIBI_SIGNOFF_FORMAT` sets the default per host.
  - After a session writes a requirement, the Claude Code, Codex, Cursor and ZCode stop hooks ask once for the signoff view before the work is reported done, unless `kibi signoff` already ran since. A requirement the agent wrote is put to the person through the view, not retold in the agent's words.
  - `/kibi-signoff` is a new command in Claude Code, Cursor and ZCode.
  - The `kibi-decisions` and `kibi-commit-review` skills (1.2.0) say how to show the view on each host, and `kibi-usage` (2.22.0) points to `kibi signoff` when it says to leave `approved_by` to the person. The OpenCode guidance asks for `--format md` so the terminal card still renders.
  - The Claude Code plugin README shows the `.claude/settings.json` snippet that loads the plugin in cloud sessions.

### Patch Changes

- 140a61c: `kb_model` with `mode: "predicates"` and an explicit `schemaId` now accepts a project-local schema when the claim names the predicate and every one of its arguments. Before, a schema without keywords or examples scored below the applicability threshold and was refused even though the claim stated it directly. When an explicitly selected schema is still refused, the reasons now list which predicate or argument names the claim leaves out.
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
- 3162508: `kb_upsert` with `dryRun: true` now refuses every payload the real write would refuse, with the same message. Before, a dry run could report a payload valid that the write then rejected: a relationship whose target entity does not exist, a symbol that mixes `executable_for` with `implements` or `covered_by` (in one payload or against links it already has), or an authored document path or format the write cannot use. Such a refusal now comes back as an invalid dry run, and a refusal that carries an error code (for example `SOURCE_PATH_INVALID`) also returns it as `errorCode`.
- 668c332: `kb_upsert` with `dryRun: true` no longer reports a broken installation as an invalid payload. When a module Kibi needs for validation cannot be loaded, the dry run now fails as a tool error that names the missing module, instead of answering "payload is invalid" with no way to fix the payload.
- Updated dependencies [3162508]
  - kibi-core@0.22.5

## 2.18.2

### Patch Changes

- 98b9422: The engine daemon now starts with the same Node.js that runs `kibi` (or `KIBI_NODE_PATH` when set), instead of the first `node` on `PATH`. A host that runs Kibi through Node.js 22 by absolute path no longer gets an older daemon that fails to start. `kibi engine status` no longer hangs on SWI-Prolog 9.0, where the storage status query waited on an interactive prompt. Its `status` field is now the storage status object; before, it was the raw Prolog dict text.
- df68ff3: On Linux, the engine socket directory no longer follows `TMPDIR`. Processes with different `TMPDIR` values (an agent host, the CLI, Git hooks) now find the same engine instead of starting a second one that fails with `store_locked`. `KIBI_RUNTIME_DIR` and `XDG_RUNTIME_DIR` still take precedence, and macOS keeps its per-user `TMPDIR`. When `KIBI_RUNTIME_DIR` names a directory Kibi cannot use (not owned by you, not private to you, or with too long a path), Kibi now prints a warning before falling back to a private directory under `/tmp`; before, it fell back silently. When `kibi engine stop` finds no engine, it now says so instead of "stopped", and names the pid still holding the branch store when there is one.

  The first sync of a new branch no longer accepts staged new requirements without a semantic inventory. The semantic baseline that grandfathers uninventoried requirements now covers only committed sources once another branch of the workspace has synced, so a new branch refuses what its parent branch refuses.

- 7997b6d: When `kibi engine stop` finds the branch store held by an engine it cannot reach, it now names that engine's process instead of its SWI-Prolog child. An engine daemon that fails to attach its branch store (for example with `store_locked`) now stops its SWI-Prolog child and exits, instead of staying alive with no socket. A `store_locked` error now names the process that holds the store, read from its ownership journal: the engine daemon, with its SWI-Prolog child alongside; before, it always said "an unidentified holder".
- 5a4f599: An idle connection to the engine daemon no longer keeps its client process alive. `kibi-mcp` now exits once its input closes, also after tool calls that went through the engine such as `kb_model` analyze; before, it stayed running until killed. A failed `kibi sync` now prints its error once; before, the same error block appeared twice.

## 2.18.1

### Patch Changes

- 25d537e: Symbol coordinate refresh no longer treats `sourceFile` as an unrestricted filesystem path. Absolute paths and `..` escapes are rejected at upsert and refused at read time, so MCP/CLI coordinate refresh cannot probe files outside the workspace.

  Tighten Prolog `sourceFile` typing to `workspace_relpath` in `kibi-core` (and the CLI schema mirror), add `resolveWorkspaceSourceAbsolute` confinement (with realpath checks), and cover the escape oracle with regression tests in CLI and MCP.

- 63e0e1f: The Claude and Codex plugin packages now ship their own license and security policy files, so the terms and the vulnerability reporting route travel with the installed plugin. The tree-sitter analyzer also words one PHP diagnostic without a literal call-syntax example.

  Adds `LICENSE` and `SECURITY.md` to both plugin packages' `files`, rewords the PHP `eval` diagnostic message in the analysis worker, and refreshes the integrity manifest and release approval hashes for the rebuilt worker.

- Updated dependencies [25d537e]
  - kibi-core@0.22.4
  - kibi-plugin-builtin@0.5.3

## 2.18.0

### Minor Changes

- 10c158c: Bootstrap plans now name what to compare for intent claims they cannot model, not only for the claims they plan. A claim left as "Intent claim needs authoring" next to a prose-only current requirement on the same topic gets a `conflict-review:` diagnostic naming that requirement, with an instruction to compare the two when the claim is compiled with `kb_compile_intent` and to report the verdict through `conflictReviews`; the knowledge-source summary and `recommendedActions` count those claims. The pre-commit hook (`kibi check --staged`) now blocks an entity document the commit adds or edits without the body context that full `kibi check` requires (`entity-context-missing`), so a commit can no longer carry an entity `kb_upsert` warned about.

  Migration: commits that add or edit a requirement, scenario, test, ADR or observation fact without body context are now refused by the hook. Entities that already lacked context at the last commit, and entities the schema 8 migration acknowledged in `.kb/manifest.json`, are not blocked, so migration commits and edits to legacy entities keep passing; add a `## Context` section (requirements) or a prose body to new entities.

  A `kb_upsert` refused for a coarse symbol link now returns a coded error (`SYMBOL_GRANULARITY_VIOLATION`) in the MCP error envelope and the CLI JSON route, with the same message; before, only a dry run carried a code. The candidates in that message, and in the hook's `symbol_granularity_violation`, list functions, methods and accessors before properties. `kb_status` `schemaStatus.warning` on a legacy KB without a manifest now says to run `kibi migrate --yes`, matching `bootstrap.nextAction` and `kibi doctor`.

## 2.17.0

### Minor Changes

- 5552b1f: `kb_compile_intent` no longer reports "no conflict" for intent it could not check. Prolog compares only requirements that have a logical model, so a claim the advisor left as an ontology gap, or one next to a current requirement that exists only as prose, used to come back as `no_conflict` even when discovery had just returned a requirement saying the opposite. The plan now says the check is unresolved, names the related requirements the agent must compare, and blocks when the agent reports a conflict. Bootstrap plans name the same requirements for review before approval.
  - `contradictionAnalysis` gains `reasons` (`unmodeled_target` with the claim keys, `unmodeled_related` with the requirement ids, `analysis_unavailable`), `reviewCandidates` (up to five related current requirements with discovery score at least 0.1: id, title, the sentence sharing the most terms with the intent, statement, score, `modeled`, `review`) and `nextAction`. Any reason makes `outcome` `unresolved`.
  - New `kb_compile_intent` input `conflictReviews: [{requirementId, verdict: "conflict" | "no_conflict", note?}]`. A `conflict` verdict makes the outcome `conflict` and the plan `blocked`; `no_conflict` clears that candidate. A verdict on a current requirement discovery did not rank is honored; one that names no current requirement is ignored with a diagnostic.
  - Pending reviews do not change the plan status: a plan whose propositions are modeled stays `ready` with `Contradiction check incomplete: …` in its diagnostics and becomes `no_conflict` once every candidate is reviewed. An unmodeled target keeps the plan `needs_resolution` as before, and its outcome stays `unresolved` after review.
  - `kb_plan_bootstrap` adds `review_against:<id>` evidence and a `conflict-review:` diagnostic for each planned intent claim that has prose-only current requirements on the same topic.
  - `kibi-usage` 2.20.0 and `kibi-bootstrap` 3.15.0 tell the agent to compare and report instead of reading `unresolved` as consistent.

- 733b5b7: `kb_upsert` now refuses a coarse symbol link when it is written instead of leaving it for the pre-commit hook. A payload that only adds `implements` or `covered_by` to a stored symbol is judged against the stored `sourceFile` and `granularity_reason`, and a class-level symbol whose public methods are behavioral symbols is refused with those methods as candidates, as `kibi check` (`symbol-granularity`) and the staged hook already did. `symbol-coverage` on a symbol that already has `covered_by` now names the missing link: which test does not verify which implemented requirement, and the `verified_by(SCEN-…, TEST-…)` or `verified_by(REQ-…, TEST-…)` that connects them, instead of asking for `covered_by` again.

  Migration: a `kb_upsert` with `dryRun: true` on an invalid payload now returns an error envelope (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `UPSERT_DRY_RUN_INVALID`; `data.valid: false` and `data.errors` are unchanged. Callers that read `status` to decide whether a dry run passed now see the failure; callers that read `data.valid` need no change. Links-only upserts that relied on the gap to attach a class-level symbol are now refused: move the links to the method symbol or set an allowed `granularity_reason`.

  An invalid `status` lists only the values of the entity's type. A requirement whose grounding fact does not exist yet is told to write the fact from the `kb_compile_intent` plan's earlier step first, instead of being told the fact lacks a `claim_key`.

### Patch Changes

- 61c610a: Three fixes for teams moving a legacy knowledge base onto the current Kibi. The first `kb_upsert` after `kibi migrate` no longer adds an unrelated `type:` line to the file it edits: migrate now writes that line itself, so it lands in the migration commit. On a legacy KB, `kb_status` now names `kibi migrate --yes` as the first step, as `kibi doctor` already did, instead of `kibi init`. And the `kibi sync` summary now shows what the KB holds, not only what the sync recompiled.
  - `kibi migrate --yes` adds the folder-implied `type` (for example `type: req` under `.kb/requirements/`) as the last front matter key of every authored entity file without one, at any schema version, and changes no other line. A KB that was already migrated without it gets the same edit from the next `kibi migrate`, planned as the automatic `entity-type-backfill` action. A status-only `kb_upsert` after the migration then changes only the `status` line.
  - With a legacy `.kb/config.json` and no `.kb/manifest.json`, bootstrap activation reports `root_partial` with the reason `kibi doctor` gives, and `kb_status.bootstrap.nextAction` is `{operation: "kibi migrate --yes", required: true}`.
  - The `kibi sync` summary opens with `KB Totals` by type and the KB relationship count, counted from the store after the sync, followed by `Imported This Sync (changed sources only)`. When the store cannot be counted, the summary falls back to the previous `Entity Counts` block.

- f4c5822: After a migration, the `kb_apply_plan` digest of the remaining plan now says when an automatic action in it is blocked: it waits for the actions in its `dependsOn` and needs no approval until a later plan shows it ready. Before, a blocked automatic action looked like something left to approve. The Claude hook's firm-edit question no longer prints a double full stop after a requirement title that ends in one.

  The digest's `next` text appends a count of blocked automatic actions when there are any. `firmEditConfirmation` in `kibi-agent-core/decision-guard` trims a trailing full stop from the named requirements before closing the sentence.

- Updated dependencies [733b5b7]
  - kibi-core@0.22.3

## 2.16.4

### Patch Changes

- 2057e51: A requirement without a proposition inventory that once failed to compile no longer gets stuck. Before, after `kibi sync` reported a requirement file it could not extract (for example an unknown `status`), restoring the exact committed file with `git checkout`, or fixing only its status, made every later `kibi sync` demand a complete inventory for it, while a status-only `kb_upsert` on the same file was accepted and then failed the next sync. Now the restored file syncs cleanly, and `kb_upsert` and `kibi sync` judge such a file by the same rule.
  - `kibi sync` keeps, with each source it cannot extract, the semantic source hash the source last compiled with. When the source compiles again with the same prose, it keeps the legacy treatment; changed prose still needs the inventory, as before.
  - `kb_upsert` of a requirement the store does not hold judges the write by what the last sync recorded for its file: a legacy file that missed the store's first compilation, or one whose prose is unchanged since it last compiled, may be written without an inventory; a file written after the first compilation needs one. A status-only `kb_upsert` that closes a legacy requirement whose status failed the first sync is now accepted, matching what `kibi sync` accepts after `kibi migrate` maps that status.
  - A branch store where an earlier version already recorded such a failure has no record of the prose that last compiled, so that requirement still needs its inventory there.

- 69c9ea7: Non-ASCII text such as `§`, `¶`, `–` or accented letters now keeps its characters when Kibi runs under a POSIX or other non-UTF-8 locale. Before, the store held U+FFFD replacement characters for every non-ASCII byte, `kb_query` and `kb_search` returned them, and the next `kb_upsert` of an entity wrote them back into its authored file, even into fields the write did not touch. Run `kibi sync --rebuild` once after upgrading to replace corrupted text in the store; authored files that a write already rewrote need their text restored by hand.

  The SWI-Prolog child now switches its standard streams and default file encoding to UTF-8 before loading the KB module, one-shot goals travel to it as base64 of their UTF-8 bytes instead of a raw environment value, and Prolog output is decoded with a streaming UTF-8 decoder so a character divided between two output chunks stays whole.

## 2.16.3

### Patch Changes

- d332f57: Fixes found by evaluating search and migration on a test project. A `kb_apply_plan` migration response no longer repeats every remaining review action: on a large KB it went from about 2 MB to a short digest, and the full plan stays one `kb_status`, `kb_check` or `kb_coverage` call away. `kibi migrate` no longer plans a second `kibi sync` that the `kb_status` plan does not have. `kb_search` gives words written in backticks (`canExport(user)`) more weight, so a requirement that names them among other things is no longer dropped, and an unlinked fact that disagrees with a governing requirement's fact now names the fact that holds.
  - After an applied migration, `remainingPlan` is a `kibi.migration-plan-digest.v1`: the merged plan's hash, status, expected snapshots, scope, summary and diagnostics, every automatic action in full, and the other actions counted by code, safety and state. It cannot be applied; the `kibi migrate --apply-safe` summary reads it as before.
  - `kibi migrate` adds `migration-sync` after a schema upgrade only when sources are rewritten or the status plan has no compile or resync after the upgrade.
  - Intent search weighs the tokens of the question's backticked code spans twice in its lexical score, for the whole question and for each clause.
  - An `ungoverned` predicate fact that shares the predicate, namespace and declared key arguments with a governing requirement's fact, with other arguments or polarity, carries `overriddenBy` (`fact`, `requirement`, `claim`), and the answer note names the pair.

## 2.16.2

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

- Updated dependencies
- Updated dependencies [fcae317]
  - kibi-core@0.22.2

## 2.16.1

### Patch Changes

- a26ba8c: A firm requirement or ADR can no longer be reworded in place by an agent. `kb_upsert` refuses to change its title, statement or ADR body, or to lower its firmness, unless the write cites new words from the person who owns the rule, and `kb_check` reports the same change made directly to the file. Context sections, tags, status and links stay editable, and superseding with a new firm decision still works as before.
  - `kb_upsert` (dryRun and `kb_apply_plan` steps included) rejects an in-place claim change of a current firm decision without a new `origin.ref` (or `approval_ref` on a requirement): `Entity validation failed: <ID> is a firm decision, so kb_upsert does not change its <fields> in place`.
  - New canonical `kb_check` rule `decision-firm-edited` compares current firm decisions with `HEAD` and blocks a changed claim that cites no new human words; it reports nothing outside a Git checkout or before the first commit.
  - A requirement's claim is its title, its `semantic_text` (or the statement its body derives); an ADR's claim is its title and body. Lowering firmness or replacing the origin with an agent's counts as a change.
  - `kibi-usage` skill 2.18.0 tells agents not to edit firm decisions in place; the `firmness` input schema description now states the origin-derived default and the edit rule.

## 2.16.0

### Minor Changes

- cd4723e: Rules a person wrote or imported are no longer treated as an agent's own default choice when they carry no `firmness`. A requirement or ADR without `firmness` now reads as `firm` unless an agent wrote it, so an agent asks before replacing it, and bootstrap records the rules it imports from your documents as firm with a reference to the passage. The usage skill now treats any request that conflicts with a recorded rule as a question: the agent names the rule and asks, whatever the rule's firmness, and changes it only when the person says so. Run `kibi migrate --yes` to move a KB to schema 10; existing supersedes are acknowledged and no source file is rewritten.
  - `effectiveFirmness` takes the entity's origin: an absent value is `default` for `origin.kind: agent` and `firm` otherwise (human, import, migration or no origin). `kb_query` rows and `kb_search` answers show the derived value.
  - Hook snippets label a current firm decision `[firm: ask before changing]` (was `[firm]`) and no longer label retired decisions. The Claude Code and ZCode session-start context adds one sentence: a request that conflicts with a recorded requirement or ADR is a question, so the agent names the rule and asks before changing the code or the rule.
  - `decision-firm-superseded` applies to origin-derived firm targets; `decision-firm-unreferenced` still applies only to an explicit `firmness: firm`.
  - KB schema 10: the `firmness-from-origin-v10` step and the automatic `firm_supersede_acknowledge` plan action record pre-existing supersedes of such decisions in `.kb/manifest.json` `firmSupersedeAcknowledged` (`FROM -> TO`); only listed edges are exempt, and never an explicitly firm target.
  - Bootstrap intent-claim and normative-markdown requirement steps write `origin: {kind: import, ref}` and `firmness: firm`.
  - Skills: `kibi-usage` 2.17.0 (conflicting request means ask; firmness from origin; write firmness explicitly), `kibi-bootstrap` 3.13.0 (imported rules are firm imports, including hand-authored follow-ups).

### Patch Changes

- f14031f: Several fixes found by evaluating search on a test project. In Claude Code, a `sed -i` whose script contains `|` or `;` now gets its edit context before it runs, as `perl -pi`, `tee` and `>>` already did. A `kb_search` question that names a file path no longer drifts to whatever matches the path's words, and the reply suggests passing the path as `sourceLocations`. A requirement's dangling `text_ref` can be cleared with `kb_upsert` and only its title, status and `text_ref: ""`, without sending its proposition ledger again.
  - `commandEditPaths` in the Claude hook looks for `;`, `|`, `&&` and redirections outside quotes only, so a quoted sed script or echoed `>` is no longer cut apart or read as a redirection.
  - Intent search removes workspace file paths written in the question from its topic (`questionPaths`), as it already did for `sourceLocations` paths. The search text names such paths and points to `sourceLocations`.
  - The answer note says that a fact in `ungoverned` decides nothing and that a governing requirement's fact holds where the two disagree.
  - `withStoredRequirementSemantics` keeps the stored ledger when an update changes only `text_ref` and the ledger reads its prose from `semantic_text`. A changed title still has to come with the full contract.
  - The `source-path-dangling` suggestion for `text_ref` says how to clear it, and the `kb_upsert` description says an update keeps the properties and relationships it leaves out.

## 2.15.2

### Patch Changes

- f73e921: `kb_plan_bootstrap` on a repository that already has a knowledge base now plans the intent claims the agent declares instead of returning an empty handoff. Claims already in the knowledge base are counted as such, the rest form a plan that `kb_apply_plan` applies after approval, so an agent no longer has to compile and write each claim one at a time. The per-source claim accounting now says why each claim was not planned, and the seeded handoff tells the agent what to do with its claims.
  - `attached_seeded_handoff` keeps discovered candidates (repository documents, symbols, tests) off but plans declared `intentClaims`, deduplicated against existing entity IDs. A plan holding only claim-derived candidates has `applyBlocked: false` and can be `ready`; without declared claims, or when none can be planned, the result stays a `handoff`.
  - The CLI route now reads existing entity IDs from the engine on an attached root (it already started the engine for status), so claims already in the KB are reported as `entity_exists` there too instead of being planned again.
  - `Knowledge source …` diagnostics split the not-planned count by reason: suppressed by the activation mode (new `suppressed_by_activation` rows in `suppressedCandidates`, one per claim), another `suppressedCandidates` row, a `sourceOnlySignals` follow-up, or diagnostics only. The counts add up to the declared total.
  - Seeded `handoffMessage`, `recommendedActions` and the prompt block name the next step for declared claims: apply the plan when there is one, otherwise compile each remaining claim with `kb_compile_intent`.
  - `kibi-bootstrap` skill 3.12.0 covers the seeded path and the new accounting.

- 2c7b2e7: Fixes from upgrading a test project to 2.22: the staged gate no longer charges a merge commit for files it takes unchanged from the merged branch, it blocks a requirement whose semantic inventory drifted from its prose, it lists every missing symbol, unclosed front matter fails `kibi check`, stale `text_ref` paths are found and migrated, `kibi doctor` and `kibi migrate` explain how to wire `kibi merge-driver`, and the `kibi migrate` preview separates migration steps from the quality backlog.
  - `kibi check --staged` during a merge commit (`MERGE_HEAD` present) compares the staged tree with a base that takes every file the merge copies unchanged from a merged parent, so only what the merge itself resolved or edited is judged. The output says how many files were skipped this way. The staged snapshot exposes them as `mergeInherited`.
  - `kibi check --staged` blocks a staged requirement that declares a semantic inventory contract (in the staged file or in `HEAD`) when the next `kibi sync` would reject it for proposition-complete ingestion, naming the contract errors and the `kibi migrate` repair.
  - `symbols_manifest_stale` and `kibi_impact_evidence_missing` Detail lines name every symbol instead of six plus "… and N more".
  - Front matter delimiters must be whole `---` lines. A `---` glued to the last value no longer closes the block (the file now fails with "Missing closing --- delimiter" instead of passing `kibi check`), and a `---` inside a value, such as a Markdown table separator in a quoted `semantic_text`, no longer cuts the block short.
  - `source-path-dangling` also covers a `text_ref` shaped like one workspace file path that names no file. `kibi migrate` (`source_path_rewrite`, evidence `field: text_ref`) rewrites a pre-canonical knowledge path to its `.kb/` file; any other value, and a `text_ref` that is a requirement's semantic source, becomes a review for a person and is never removed.
  - `kibi doctor` warns ("Manifest merge driver") when `.kb/symbols.yaml` is not routed to `merge=kibi` or `merge.kibi.driver` is unset, and a completed `kibi migrate` prints the same setup.
  - The `kibi migrate` text preview shows migration actions apart from the quality backlog (`quality_*`, `coverage_*` and check review codes), counted per code; `--backlog` lists each one. `--format json` is unchanged.

- 79c843e: `kb_query` can now return a requirement's prose. Entity rows carry only front matter, so an agent that found a stale sentence in a requirement's body had no way to read it before rewriting it. Passing `includeBody: true` with an `id` returns the authored Markdown body of that entity, which `kb_upsert` `document.body` replaces.

  Technical summary: `kb_query` accepts `includeBody` (boolean, default false), refused without `id`. The answer gains `body: { id, path, text, truncated? }`, read from the entity's authored `.md` source inside the workspace (front matter stripped, cut at 32 000 characters); `text` is null for entities without such a document. The text content appends the body. The `kb_query` output contract and the frozen MCP tool-list fixtures include the new field and property.

- a484fa4: Fixes five places where Kibi accepted input it could not handle later, or reported more than it should. A schema 8 migration no longer writes a requirement file that `kibi sync` cannot read when the requirement body contains Markdown table separator rows or a horizontal rule. `kb_upsert` now refuses an update that would leave a current requirement without a complete proposition inventory, so the failure shows up at the write and not at the next sync. `kb_compile_intent` and `kb_model` reject supplied clauses that do not occur in the prose instead of turning them into propositions over unrelated text, `must-priority-coverage` no longer reports retired requirements, and applying a plan that is not ready says what its status is and how to fix it.
  - Schema 8 `semantic_text` pin: `sliceFrontmatter` accepts only a whole `---` line as the opening and closing frontmatter delimiter. `withTopLevelField` writes a value containing `---` as a double-quoted scalar with every second dash of the run escaped (`\x2D`), so a reader that splits on any `---` still finds the frontmatter intact, and it splits and parses the written document again, returning `null` (the pin is skipped with a reason) unless the frontmatter and body read back unchanged.
  - `kb_upsert` on a stored requirement also checks the proposition-complete boundary on the stored status, prose and ledger with the payload's fields on top, which is how the authored file will read after the write. A write that makes an inventory-less requirement current, or changes the prose sync checks, fails with `Proposition-complete ingestion failed: <id> would be written as a current requirement without a complete proposition inventory (...)` and names `kb_model` mode `analyze` with the requirement's id, or superseding it. A requirement that was already current with the same prose keeps accepting updates. The `kibi sync` failure for a requirement with no inventory now points to `kb_model` mode `analyze` with its id, or superseding it, because `kibi migrate` re-derives only inventories that already exist.
  - Supplied `clauses` must be verbatim fragments of the prose (whitespace may differ); otherwise the call fails with `VALIDATION_FAILED` naming each clause. The `clauses` descriptions in the `kb_compile_intent` and `kb_model` input schemas say so. A clause the prose does not contain never gets a length-based slice of the prose as its span.
  - `must-priority-coverage` (`coverage_gap/2`) skips requirements that another requirement supersedes, that have a retired status (`deprecated`, `superseded`, `archived`, `removed`, `deleted`, `rejected`), or that are `closed` without the `implemented` tag.
  - `kb_apply_plan` on a plan that is not ready keeps the message `only ready plans may be applied` and adds the plan's status and the remedy: resolve `ontology_gap` and `missing` propositions or write the requirement with its inventory contract for `needs_resolution`, resolve the contradiction for `blocked`, supply context for a bootstrap plan in `needs_context`.

- 526a585: `kb_search` answers no longer hide a requirement's clauses: a governing requirement lists up to eight linked facts, the fact the question matched first and the constrained subject last, and when facts are left out it says how many and gives the `kb_query` that lists them all (`moreFacts`). Before, the list stopped at four facts in stored order, so a requirement's newest clause could vanish from the answer with only `truncated: true` to show for it. Questions that name a code identifier or a file now match on the words that matter: `canExport` is read as "can export", and a path the call also passes in `sourceLocations` no longer dilutes the question. `kb_model` mode `predicates` names the stored decisions a proposed rule would contradict even when no `requirementId` is given, and its relationship plan's `logicClaims` manifest now includes the requirement's stored clauses.

  Technical summary: `buildSearchAnswer` sorts each governing requirement's fact links by matched-seed rank, then grounding links (`requires_*`) before `constrains`, keeps `SEARCH_ANSWER_LIMITS.factsPerRequirement` (8), and sets `moreFacts: { count, ask }` when the limit or `fitSearchAnswer` cuts facts. Intent search splits camelCase identifiers into words (entities keep the joined token too) and removes the `sourceLocations` paths from the query text before tokenizing and lexical candidate loading; the repository gold set is unchanged (recall@3 0.909, abstention precision and recall 1). `handleKbSuggestPredicates` runs `candidateDecisionConflicts` whenever no hash-bound plan exists, appends the conflicts to the text summary, and merges the stored `logic_claims` into `logicClaims` and `relationshipPlan.logicClaims`. The semantic advisor reads `text_ref` as prose only when `semantic_text` is unset, so a reference such as `intake/batch-4` no longer raises a numeric-cardinality signal. `kb_search` text adds a rephrasing hint on abstention and points contradiction questions at `kb_check` `domain-contradictions` and `kb_model` `decisionConflicts`; `kb_model` mode `analyze` puts the claim-key drift warning in its text; the predicate-shape error names `kb_model` mode `predicates` instead of the catalog name. `kb_graph`, `kb_find_gaps` and `kb_coverage` drop mtime-only stale reasons whose content matches the compiled hashes, as `kb_status` already did. kibi-runtime and kibi-mcp are bumped because they bundle and serve the CLI operations.

- a580285: The first commit after `kibi migrate` moves a legacy knowledge base into `.kb/`, and the pre-commit hook used to refuse it with one `symbol-coverage` violation per manifest symbol, because every moved file looked new. `kibi check --staged` now compares a moved knowledge file with its committed content at the old path, so the commit is judged on what it changed inside those files, not on findings they already had. Records the commit adds or edits are still checked, and full `kibi check` still reports the older findings.
  - `captureStagedSnapshot` builds the staged base with `renameResolutionBase`: for each rename Git detects whose old path is outside `.kb/` and whose new path is the same kind of canonical knowledge file (an entity document into the `.kb/` lane of the same name, or `symbols.yaml` / `symbol-coordinates.yaml` onto the canonical file), the base tree carries the old content at the new path and drops the old path. The snapshot lists them as `renameResolved`.
  - Staged symbol-manifest evidence already reads its baseline from the snapshot base, so `changedEntityIds` after a pure move contains only the records the commit rewrote, and `symbol-coverage` runs only for them. The `minLinks` ownership gate for changed source symbols is unchanged.
  - The staged output starts with `Baseline: HEAD with N staged knowledge rename(s) into .kb/ resolved ...` when the rename base was used, and a commit with nothing left to judge says `No staged changes beyond the resolved renames.` A staged merge commit's note is now also printed when no source symbols changed.
  - Renames inside `.kb/`, renames into a different lane and edits to files that were already canonical are compared with HEAD as before.

- Updated dependencies [a484fa4]
  - kibi-core@0.22.1

## 2.15.1

### Patch Changes

- f45465a: `kb_model` mode `analyze` with the `id` of a stored requirement now warns when the analyzed prose drops a clause the stored ledger has grounded. Before, analyzing a requirement's title while its stored `semantic_text` was worded differently returned a clean receipt, and only the `kb_upsert` that followed failed with `modeled proposition claim_keys must match logical grounding target claim_keys exactly`, with no hint which key or fact was involved. Now the receipt's `warnings` carry a `Claim-key drift against the stored ledger` entry naming the stored modeled clauses the analysis no longer states, the facts that ground them, the clauses the analysis adds, and the remedy (keep the stored `semantic_text` wording, re-ground the facts with the new keys first, or supersede). The proposition-complete error itself now lists the modeled keys no grounding fact declares and the grounding facts whose keys the ledger dropped, with the same remedy, so a write refused for this reason explains itself.

  Technical summary: `storedLedgerDriftWarning` (new `semantic-advisor/stored-ledger-drift.ts`) loads the stored requirement through `loadEntities`, compares its `semantic_inventory` entries with `status: modeled` against the receipt's propositions and reads the `requires_property`/`requires_predicate`/`requires_rule` targets with their `claim_key` in one Prolog query; `executeSemanticAdvisor` calls it only when `id` is given for a `req`, over `context.prolog` or the lazy `ensureProlog`, and treats an unreadable store as no warning. `groundingClaimKeyError` appends `claimKeyMismatchDetail` to the exact-match error. The `kibi-usage` skill (2.16.1) recipe for changing a grounded requirement's text says to analyze with the requirement's `id` first. kibi-runtime and kibi-mcp are bumped because they bundle and serve the CLI operations and the skill.

- c533144: The schema upgrade in the `kb_status` / `kibi status` migration plan now declares everything `kibi migrate --yes` writes: coarse symbol links it marks `legacy-link` and the other source rewrites appear as their own actions with their own files, and `.gitignore` is listed on the upgrade itself. Approving the upgrade without those actions is refused instead of rewriting files the plan never named, and the apply result now says what the migration changed. `kb_upsert` of a non-decision entity with `firmness` now names the field, and pre-schema-9 knowledge bases are told that the schema upgrade acknowledges existing supersedes.
  - `buildActionsFromStatus` takes a `planSchemaUpgradeSources` planner; `kb_status` passes the schema 6 migration fragment (the planner `kibi migrate` uses), so actions such as `symbol-legacy-link-mark` (bound to the `.kb/symbols.yaml` hash), `entity-origin-backfill` and the lifecycle repairs join the plan and `schema-config-upgrade` depends on them. While the upgrade still moves legacy knowledge or waits on an operator, it lists `.kb/` and explains why in `evidence.sourceRewrites`.
  - `migrateCommand` returns a run summary built from the audit record; `kb_apply_plan` uses it for the upgrade's `actionResults[].detail` (schema versions, legacy-link marks, origin backfill, lifecycle repairs, whether `.gitignore` changed). `updateGitIgnore` reports whether it changed the file.
  - The migration audit record stores the pre-run schema warning as `preMigrationWarning` instead of `warning`.
  - The `supersedes-reason-missing` suggestion adds a sentence on KBs whose manifest is below schema 9.
  - Upsert validation rewrites AJV's `must NOT be valid` for type-restricted fields into `<field> is only valid on <types> entities`.

## 2.15.0

### Minor Changes

- 5ad4319: Requirements and ADRs can now say how firmly they were decided, so a later agent knows whether it may change a decision on evidence or must ask a human first. Mark a rule a person stated `firmness: firm` (it must cite their words in `origin.ref`, or `approval_ref` on a requirement), a guess `firmness: exploratory`, and leave the rest unset (`default`). `kibi check` now blocks a firm decision without that reference (Kibi checks that it is present, not that it is genuine), a decision that is not firm superseding a firm one, and a current requirement or ADR that supersedes another without a `## Why this changed` section naming the evidence. `kb_search` and `kb_query` show the firmness of each decision; the editor hooks label firm and exploratory ones.

  Migration: this is a hard rollout with KB schema 9. Run `kibi migrate --yes` once; it records every supersede edge that predates the rule in the manifest (`supersedesReasonAcknowledged`, as `FROM -> TO`), so those do not block, and an advisory `supersedes-reason-acknowledged` diagnostic counts them. No source file is rewritten and no reason is invented. New supersedes must explain themselves, including a new one on an acknowledged decision.

  Technical summary: new optional `firmness` property (`firm` | `default` | `exploratory`) on `req` and `adr` in the JSON schema, the `kb_upsert` input schema, the markdown extractor and the Prolog entity schema; the schema rejects it on other types. `kb_upsert` judges firmness as it will be written: an update that omits `firmness` keeps the stored value (also in the compiled store), and a write that leaves a decision firm without a reference is rejected. `decision-firm-superseded` checks every superseder, retired ones included, so a chain cannot launder a firm decision; shard edges from deleted entities are ignored. New rules `decision-firm-unreferenced`, `decision-firm-superseded` and `supersedes-reason-missing` (canonical, blocking) and `supersedes-reason-acknowledged` (info) read authored requirements, ADRs, front-matter `supersedes` links and relationship shards, so they agree before a sync. `LATEST_KB_SCHEMA_VERSION` is 9; the `decision-firmness-v9` migration step and the `supersedes-reason-acknowledge` fragment action write only `.kb/manifest.json`. Search answer rows and `kb_query` results carry the effective firmness of requirements and ADRs; hook snippets append `[firm]` or `[exploratory]`. The `kibi-usage` skill gains a "Decision firmness" section.

- adac6d1: `kb_delete` (and `kibi delete`) now treats a returned deletion plan as a result instead of an error. Deleting an entity authored in a Markdown or YAML file returns `outcome: "plan_returned"`, an empty `errors` list and a `nextActions` entry whose `input` is the exact `kb_apply_plan` call (`{plan, approvedPlanHash}`) to run unchanged; an authored requirement returns `outcome: "supersession_required"` with a `kb_upsert` supersession template. The `approvedPlanHash` input now works: repeating the delete with the plan's hash applies the freshly computed plan in one call, and a stale or different hash fails with `DELETE_PLAN_HASH_MISMATCH` without writing. A new `dryRun: true` input previews relationship and direct entity deletes (counts, source writes with hashes, skipped effects) without touching sources or the store.

  Technical summary: `executeDelete` builds `nextActions` for the authored plan path, lists only real per-id failures in `errors` (plus any resolved non-authored id the plan does not cover), and on a matching `approvedPlanHash` delegates to `executeApplyPlan` under the lock it already holds, which gained an optional `onCommitted` callback so a post-commit failure is still classified as committed. Relationship deletes gain a dry-run branch after preflight that renders shard and authored-source patches without writing, using the new `planRelationshipShardRemovals` (which `removeRelationshipsFromShards` now wraps). The `kibi.kb_delete.v1` result adds optional `outcome`, `dryRun`, `wouldDelete`, `planHash`, `sourcePaths` and `recoveryJournalId`; the input schema adds `dryRun` and documents `approvedPlanHash`. MCP contract fixtures, the MCP, CLI and error references, and the bundled kibi-usage and kibi-traceability skills (with their host mirrors) are updated.

### Patch Changes

- e9b50db: A clean `kibi check` now means the next commit passes `kibi check --staged`, and the staged gate no longer passes symbol coverage that the full check rejects. `kibi check --staged` runs the full-check `symbol-coverage` rule on the staged knowledge for every changed symbol, so a test that verifies a requirement directly no longer counts once that requirement has a scenario. Full `kibi check` adds the blocking rule `symbol-granularity`, which judges every linked symbol against its source file the way the staged gate does, so coarse links, including symbols whose title the extractor never produces, surface before a later commit trips over them; existing knowledge bases can see new violations (see Migration below). Source analysis for symbol checks no longer builds a TypeScript program over the default library files for every file, so the rule adds a few seconds to a full check, and the staged gate and coordinate refresh get faster too. `kibi sync --refresh-symbol-coordinates` no longer binds coordinates to a private class member that the staged extractor never produces; it lists the symbol as failed and says to re-point it to the public owner or remove it.

  Technical summary: `kb.pl` adds `changed_symbol_no_req_coverage/2`, which restricts `symbol_no_req_coverage/2` to the `changed_symbol/1` overlay facts plus symbols whose staged manifest entry changed, and `checks.pl` adds `check_changed_symbol_coverage/2`, which renders those as `symbol-coverage` violations; the staged flow in `check.ts` calls it through `validateStagedSymbolCoverage` next to `validateStagedSymbols` and creates the temp KB whenever a symbol changed, including manifest-only edits. The rule registry adds the TypeScript rule `symbol-granularity`, evaluated in `executeCheck` by `collectSymbolGranularityViolations`, which reuses `createSymbolGranularityDiagnostics` with every working-tree declaration as a candidate, analyzes only the source files of symbols the rule judges, honours allowed `granularity_reason` values and skips files the analyzers cannot fully analyze; the `kb_check` `rules` enum gains the name. Granularity diagnostics now carry `entityId`, `source` and evidence, and name titles the extractor does not produce. The built-in ts-morph v2 extractor creates its project with `noLib`, `noResolve` and no `types`: it reads only syntactic diagnostics, which are unchanged, and per-file analysis drops from roughly 75 ms to a few milliseconds. The ts-morph coordinate enricher skips private class members and records a transient `coordinateRefreshFailure` that sync prints as the failure reason and never writes to the manifest. The unused `checkSymbolCoverage` helper and its stale "not traceable to any functional requirement" message are removed. kibi-runtime is bumped because it bundles the CLI operations that kibi-mcp serves.

  Migration: `symbol-granularity` is canonical and blocking, so `kibi check`, `kb_check` and CI fail until its violations are fixed. A symbol violates it when it has `implements`, `covered_by` or `executable_for` links, no allowed `granularity_reason`, and its source file has a narrower behavioral declaration: a member of the symbol's title (a class symbol while its methods exist), or any declaration when the title names nothing the extractor produces (a non-exported helper, a private class member, a removed or renamed declaration). Run `kibi check --rules symbol-granularity` to list them, fix them with `kb_upsert`/`kb_delete` (never by editing `.kb/` files), then run `kibi sync --refresh-symbol-coordinates`:
  - Title the extractor does not produce: re-point the symbol to its public owner, the exported function or class that owns the behavior. Change its `title` to the owner, or, when a symbol for the owner already exists, add the links to that symbol and delete the helper symbol.
  - Class symbol while its members exist: move the links to the narrow member symbols, or delete the class symbol when its members already carry the same links.
  - Coarse ownership that is intended: add an allowed `granularity_reason` (`module-level-behavior`, `config-artifact`, `extractor-miss`, `test-suite` or `legacy-link`).

- df1a59b: `kibi doctor` no longer calls a pre-commit hook you wrote yourself (husky, lefthook, a shell script) a "legacy template" and tells you to run `kibi init`, which never touches such hooks. It now checks that the hook runs both `kibi check-generated --staged --changed-only` and `kibi check --staged`, and when it does not, its remediation names those commands and the new `kibi init --print-hook pre-commit`, which prints a copy-paste snippet and writes nothing. The snippet finds a project-local `kibi` the same way the managed hooks do, so it works where a bare `kibi` call would fail; `kibi init`'s message for a skipped hook points at it too. `kibi-runtime` now rebuilds itself before packing, so locally packed tarballs no longer ship a stale runtime.

  Technical summary: `init-helpers` exports `MANAGED_HOOK_NAMES`, `isManagedHookName` and `hookDelegationSnippet(hook)`, which reuses the template's `KIBI_BIN` resolver, propagates each command's exit status, and keeps the template guards (`post-checkout` branch checkouts only, `post-rewrite` rebases only). `kibi init --print-hook <hook>` returns before any repository resolution or write and rejects unmanaged hook names with exit 1. Doctor classifies a hook without `# BEGIN kibi-managed` as custom: pre-commit passes only when uncommented commands invoke both gates (`kibi`, `npx kibi`, `node_modules/.bin/kibi` or `"$KIBI_BIN"`), post-rewrite when one runs `kibi sync`; managed hooks keep the existing template checks. `packages/runtime` gains `prepack: npm run build && verify-package-contract kibi-runtime`, the contract verifier checks the runtime's `dist/index.js`, `dist/engine-daemon.js` and `dist/skills`, and `scripts/pack-packages.ts` resolves a relative `--destination` against the caller's directory instead of each package directory. Docs cover local dogfood packing (CONTRIBUTING), pnpm 11 `minimumReleaseAgeExclude` for `kibi-*`, and delegating from husky/lefthook hooks.

- c619886: After upgrading to a Kibi CLI whose entity schema changed, `kibi status` / `kb_status` reports each branch store compiled by the older CLI once as stale with `compiler_changed`; `kibi sync`, or applying the freshness plan's automatic resync, clears it. The status migration plan now covers that reason with its automatic `freshness-resync` action instead of a review action, so `kb_apply_plan` can clear it even when it is the only stale reason (before, the plan had nothing automatic to apply). A `kb_upsert` dry run or write of a fact no longer returns a semantic advisor receipt that minted a claim key from the fact's title and reported it as missing; the fact's own derived `claim_key` stays in `normalizedPreview` and the write's `claimKey`.

  Technical summary: `buildActionsFromStatus` plans the automatic `freshness-resync` (`kibi sync`) for a `RESYNC_REASON_CODES` set (the mtime source codes plus `compiler_changed`) and skips those codes when it emits per-reason review actions; `MTIME_SOURCE_REASON_CODES` and status reporting are unchanged. The upsert path runs the semantic advisor and the proposition-complete ingestion boundary only for `req` payloads (`analyzeUpsertSemantics`): a dry run of any other entity type returns `semanticAdvisor: null` and its write result omits `semanticAdvisor`, while requirement receipts, warnings and the contradiction-check readiness are unchanged.

- f82d4f5: Migrating an older knowledge base now needs fewer manual steps: `kibi migrate` marks coarse symbol links as `legacy-link` whatever the schema version, using the same rule as `kibi check --staged`. It offers review actions you can approve by id to map legacy requirement statuses such as `accepted` and to drop grounding links whose claims are no longer modeled. Moved files that Git does not track yet compile on the next `kibi sync`. Legacy copies left beside `.kb/` are removed when identical and otherwise named precisely (stale symbols subset, generated coordinates, ambiguous symbols manifest, real conflict), and `kibi doctor`, `kibi migrate` and the migration plan now report the same finding.

  Technical summary: The legacy-link pass shares `narrowerSymbols` with the staged granularity diagnostics, runs in every migrate path and is planned as the automatic `symbol_legacy_link_mark` action (`symbol-legacy-link-mark`), bound to the symbols manifest hash and listed among the source-rewrite actions. `semantic_inventory_rederive_drop_grounding` is a hash-bound `review` action that re-derives the inventory and removes only the orphaned front-matter grounding links; it applies only through `--approved-action`, and sync stays fail-closed. `req_status_vocabulary_map` carries the suggested status and the latent inventory drift; when drift exists the re-derive action depends on it. Migrate writes pending-source receipts for moved untracked files (Kibi never stages them), and parity violations with `untrackedSources` collapse into one `untracked_knowledge_sources` review action. `planLegacyStorageMigration` reports `removals` and classified `conflicts`, no longer falls back to `documentation/symbols.yaml` when the legacy lanes sit under another folder, and the migration plan evaluates legacy storage even after the legacy config is gone. The `kb_apply_plan` description and contract fixtures mention the approvable review actions.

- 9f2eff3: `kb_upsert` with `dryRun: true` no longer warns that an existing requirement "has no body context" when its document already has a `## Context` section and the payload sends no `document.body`. The dry run now judges the same document body the real write preserves, so its warnings match what the write (and `kb_check`) report.

  Technical summary: `executeValidateUpsert` resolves the authored document the write would update (`canonicalSourcePath` with the stored entity, under the same source-first conditions as `executeUpsert`) and passes it to `entityContextWarnings` as `targetPath`; `upsertDocumentBody` reads that path when no `document.body` or `document.path` is supplied, because the preview entity's `source` is the runtime marker. The written-path argument becomes an options object `{ writtenPath, targetPath }`.

- 0019f9e: `kb_upsert` on an existing Markdown entity no longer reformats front matter it did not change. Before, any update re-serialized the whole block: unquoted timestamps gained `.000Z`, quoting changed, flow lists such as `tags: [a, b]` became block lists and `links` were re-indented, so a one-field update produced a noisy diff. Now only keys whose value changes are rewritten (new keys are appended), and every other line keeps its authored bytes.

  Technical summary: `renderEntityDocument` in `source-authoring.ts` splits the existing document with `frontmatterBlock`, computes the keys the upsert sets (`entityFrontmatterUpdates`, unchanged rules: no runtime timestamps, `source` or relationship keys; `type` and a derived `semantic_text` are still written), and `patchFrontmatter` splices each changed key over its source range from a `yaml` `parseDocument` (a value equal under either the YAML 1.2 core or the js-yaml reading counts as unchanged; a changed flow collection stays in flow style). A front matter block that is not a plain block mapping, or has parse errors such as duplicate keys, falls back to the previous full render. New documents render as before.

- Updated dependencies [e9b50db]
- Updated dependencies [5ad4319]
  - kibi-core@0.22.0
  - kibi-plugin-builtin@0.5.2

## 2.14.4

### Patch Changes

- 38a6051: Upgrading a knowledge base that still has a legacy `.kb/config.json` no longer loses migration steps. Before, `kibi init` on such a repository (which `kibi doctor` recommended) and the plan path `kibi migrate` → `--apply-safe` both wrote a latest-schema manifest first, so migrate reported "was 8", skipped every legacy step (including the schema 8 `context_missing_tag` acknowledgement and the legacy-link marking) and left `kibi check` blocked on missing context; init also seeded an empty `.kb/symbols.yaml` that then blocked the move with "destination exists". Now init leaves the manifest and symbols manifest to `kibi migrate --yes`, migrate starts from the legacy version, and doctor sends you to migrate instead of init. `--apply-safe` no longer fails a resync on the requirement an inventory re-derivation in the same plan would fix, the manual inventory review gives an input that `kibi model` accepts, and the apply result prints as a short summary unless you ask for JSON.

  Technical summary: `kibi init` skips `createManifestFile` and `ensureSymbolsManifestFile` when `readLegacyKbConfig` finds a config. `kibi migrate` writes the baseline manifest for `initializeMissingConfig` only without a legacy config or moves, and starts from the lower of the manifest and legacy `schemaVersion` while the legacy config is present. `applyLegacyStorageMigration` records the source schema version (raised to the latest after the schema steps) and treats an empty `symbols: []` stub destination as replaceable. After a move, migrate warns when moved files are untracked by Git, since sync compiles tracked sources only. The workspace migration plan makes `freshness-resync` and `branch-store-compile` depend on the source-rewrite actions, and blocks them (evidence `blockedBy`) while a `semantic_inventory_review` is open. That review now carries the re-derived `contract`/`contractHash` in its evidence and tells the operator to fix the requirement file directly, with a `{mode, type, id, text}` analyze input that passes the `kb_model` schema. Doctor recommends `kibi migrate --yes` for a missing manifest beside a legacy config and prints legacy-storage blockers with a keep-the-current-copy resolution; the plan's blocked storage instruction no longer tells you to keep the `.kb/` copy unconditionally. Table-mode `--apply-safe` prints the outcome, one line per action and a remaining-plan summary instead of the full JSON.

## 2.14.3

### Patch Changes

- c11f6a6: `kb_model` mode `predicates` no longer plans an unlinked predicate fact for a claim the requirement does not state, and it recognises a grounding that was worded differently. When the stored requirement's proposition ledger has no entry for the text, the action is now `extend_requirement` with an empty `applyPlan`, and a warning says to extend the requirement's prose first. When the requirement already links a predicate fact with the recommended candidate's `canonical_key`, the action is `keep_existing_grounding` and `existingGrounding[].matchedBy` reports the match, instead of `provide_argument_bindings` or a pointless `replace_grounding` swap. When no hash-bound plan ran the contradiction analysis, `decisionConflicts` and a warning name the stored decision facts (with their requirements) a complete candidate would contradict, before any write. `kb_upsert` returns the `claimKey` it stored for a written fact that carries `claim_text`, so a writer without a dry run learns the derived key without a `kb_query`. Two further plan defects are fixed on the way: the hash-bound plan of a requirement with several ledger claims now keeps the stored `logic_claims` manifest and merges the new claim into it, where before `kb_apply_plan` refused the plan with a proposition-complete error, and a predicate fact planned from a project `predicate_schema` in a namespace now carries that `predicate_namespace`, where before `kb_check` reported `predicate-schema-conformance` for the written fact.

  Technical summary: `existingClaimGrounding` reads `canonical_key` beside `claim_key` and labels each row with `matchedBy`; the decision block reads the stored requirement contract once, derives a `ledgerState`, and gates `apply_requires_predicate`, `relationshipPlan` and the hash-bound plan on the ledger carrying the claim; `candidateDecisionConflicts` queries the decision-conflict rules (`kb:decision_signatures`, `kb:decision_req_fact`, `kb:bind_key_arguments`, `kb:effective_decision`) for the candidate tuple when `plan` is null; the `kb_suggest_predicates` contract adds the two actions and `decisionConflicts`; `UpsertPayload` adds `claimKey`; the `kibi-usage` skill (2.15.4) explains the new actions; `groundingPlan` merges the stored `logic_claims` into the requirement step; `predicateSchemaFromEntity` and `schemaForCandidate` keep `predicate_namespace`, and `buildPredicateApplyPlan` writes it on the planned fact. kibi-runtime is bumped because it bundles the CLI operations and the skill that kibi-mcp serves.

- e653c1d: The `ask` call on a predicate fact in a `kb_search` answer now reproduces that fact's own tuple instead of naming the predicate alone: pasted, `kb_query` returns the fact and only the facts sharing its key arguments (`has_role(alice, admin)` asks `where: { user: "alice" }`, a `permission_rule` asks by actor, action and resource), where before it returned every fact of the predicate. The `predicate_schema` catalog now gives a built-in schema such as `permission_rule` the id that `kb_model` accepts as `schemaId` (`FACT-SCHEMA-PERMISSION-RULE`) together with `stored: false`, so an agent is no longer told `id: null` and no longer looks up an entity that does not exist; project schemas carry `stored: true`.

  Technical summary: `buildSearchAnswer` resolves the schema of each linked or ungoverned predicate fact (project `predicate_schema` of its namespace and name, else the built-in signature) in the round trip that loads the linked rows, and `factDetail` builds `where` over the schema's `key_arguments`, else the argument named `subject`, else the first argument, with the fact's `namespace` when it is not `default`; a fact without a schema, or whose schema does not fit its arity, gets its full positional `args`. `kb.pl` gains `builtin_predicate_signature/3` (catalog id and argument names of a built-in decision predicate), which `discovery.pl` uses for the catalog row and `ask_schema_dict`; every schema row carries `stored`, and the `kb_query` text summary marks a built-in row as not a stored entity.

- Updated dependencies [e653c1d]
  - kibi-core@0.21.1

## 2.14.2

### Patch Changes

- 050c4c0: kibi-mcp 3.9.0 still refused a grounding fact sent with `claim_text` and no `claim_key`, and its `kb_upsert` schema still said `claim_text` requires `claim_key`, although kibi-cli 2.21.0 derives the key. The MCP server loads Kibi's operations from kibi-runtime, which bundles the CLI sources at build time, and kibi-runtime 2.14.1 was built before that change. This release rebuilds kibi-runtime so the derived claim key, the `kibi migrate` receipt and approved-action fixes, and the kibi-usage 2.15.3 skill reach MCP hosts, and bumps kibi-mcp to depend on it.

  Technical summary: release-only change; no source edits. kibi-runtime bundles `packages/cli/src` into `dist/index.js`, so any CLI source change that MCP hosts must see needs a kibi-runtime changeset alongside the kibi-cli one.

## 2.14.1

### Patch Changes

- d668d4c: A workspace copied with its `.kb` directory while another workspace's engine held its store no longer treats that engine as the holder of the copy. The copy carried the `rdf/lock` file and the ownership journal of the original engine, whose pid is still running, so the attach path classified the lock as held by a live process for another workspace. Kibi now recognises a journal written for a different workspace as a copied artifact, breaks it like a dead holder's lock and reports the takeover in `kb_status` notices with the reason `journal belongs to another workspace <path>`. `kibi engine janitor` also reports takeover records older than the 24-hour notice window, and `--apply` deletes them.

  Technical summary: `foreignStoreLockJournalRoot` in `prolog/store-lock.ts` compares the journal's recorded `workspaceRoot` (kb.pl records the attached store directory) with the store being attached, both `realpath`-normalised and reduced to the workspace that owns `.kb/branches/<key>`. It is conservative: a lock file whose pid differs from the journal's, a recorded path that no longer exists (the store may have moved with its holder) or that is the same directory leaves today's behaviour in place. `decideStoreLockTakeover(owner, { storePath })` breaks a foreign journal, and `noteDeadHolderBeforeAttach`, `retryAttachAfterBreakingStaleLock` and the engine's `recoverStaleJournalLock` pass the store path; `classifyStoreLockHolder` and the `store_lock_stale` status reason are unchanged. `sweepStoreLockTakeoverRecords` adds `takeover-record` findings to `runJanitor`.

- b1d003a: Agents working under the Kibi host hooks now have a guide to the snippet that arrives before a read or edit: which line names the governing requirements, which lists the facts the edit must keep true, which tests prove the file, what the one-line follow-up and the unowned-file and unreadable-manifest notes mean, and which `kb_check` call to run afterwards. The modeling cheatsheet also explains where a `claim_key` comes from and how to repair a mismatch instead of editing the clause text.

  Technical summary: kibi-usage 2.15.2 gains a "Reading a hook snippet" section describing the lines `kibi-agent-core/snippets` renders (`Kibi knowledge for …`, `must keep true`, `Decision`, `Covered by`, `Next layer`, the `kb_check` line, `focusUpdate`, `unownedSourceNote`, `unreadableManifestNote`); host skill mirrors are regenerated. `docs/modeling-cheatsheet.md` gains a "Claim keys" section covering derivation from `claim_text`, the `kb_model` sources of the key, the mismatch error and the grounding-target rule.

- 8f3f586: Permission grants written the way product owners write them now model as permission rules. `kb_model` (mode predicates) accepted "may", "can", "is allowed to" and "are permitted to" but rejected "must be able to", "are able to", "have permission to" and "are entitled to" with "required semantic cue absent", so a requirement such as "An admin must be able to read any analysis request" ended as an ontology gap even with complete argument bindings. The semantic advisor now also treats "have permission to" and "are entitled to" as normative clauses, and inferred permission bindings drop the leading article and singularise the resource, so "any analysis request" and "analysis requests" bind the same actor, action and resource key that the allow/deny contradiction check compares.
  - `predicate-applicability.ts`: the permission_rule cue and the normative-intent gate accept `must/shall/should be able to`, `is/are able to`, `is/are entitled to` and `has/have permission to`, including the common-verb form right after the grant.
  - `clauses.ts`: `has/have (no) permission to` and `is/are (not) entitled to` are normative assertions; bare `is/are able to` stays descriptive so stored inventories keep their roles.
  - `predicate-inference-1.ts`: grant and prohibition forms of the new cues bind actor, action, resource and decision; actors and resources lose their determiner and resources are singular.
  - The builtin semantic classifier's permission signal recognises `permitted`, `able to`, `entitled to` and `permission to`.
  - kibi-usage 2.15.1: the deny example shows the singular resource and lists the grant wordings `permission_rule` accepts.

- 5c287fd: `kb_upsert` now tells an agent up front when a production symbol will fail `symbol-coverage`. A symbol upserted with `implements` but neither `covered_by` nor `executable_for` used to come back `valid: true` with no warnings, and the agent only learned from the next `kb_check` that the symbol lacks requirement coverage. The dry run and the write now return a non-blocking warning naming the missing `covered_by` edge, so the agent can add it in the same step; a symbol that already has a stored `covered_by` edge is not warned about.

  Technical summary: `symbolCoverageWarnings` in `operations/mutation/warnings.ts` warns for `type: symbol` payloads whose own relationships include `implements` and neither `covered_by` nor `executable_for`, unless `once((kb_relationship(covered_by, Id, _) ; kb_relationship(executable_for, Id, _)))` succeeds. It runs after the commit in `executeUpsert` (next to `scenarioCoverageWarnings`) and in `executeValidateUpsert` on the validated relationships, so `dryRun: true` and `kibi validate-upsert` return it too. No Prolog rule changes.

- Updated dependencies [1c7ffc3]
- Updated dependencies [8f3f586]
  - kibi-core@0.21.0
  - kibi-plugin-builtin@0.5.1

## 2.14.0

### Minor Changes

- 78e561d: Agents can now ask Kibi precise questions about modeled facts through `kb_query` instead of reading through search results: which permission rules apply to an actor, how many roles a user holds, or what limit a subject property has, with the answer coming from the typed facts the requirements require. The schema catalog (`factKind: "predicate_schema"`), named `where` arguments, suggestions when nothing matches and a `next` call on every answer mean an agent does not need to know the predicate vocabulary or any Prolog up front. `kb_search` answers now show each linked fact's typed claim and the `kb_query` call that asks about it.

  Technical summary: `kb_query` (CLI `query`) accepts `factKind`, `predicate`, `namespace`, `where`, `args`, `polarity`, `scope`, `distinct`, `subjectKey` and `propertyKey`; typed answers return fact rows in `entities` plus a `factQuery` block (mode, schema, distinct, suggestions, warnings, next). The discovery Prolog module gains `ask_predicate_json/9`, `ask_property_json/6`, `ask_schemas_json/5` and `ask_fact_kind_json/4`, invoked only through validated goals. The search answer layer adds `claim` and `ask` to linked predicate, property and subject facts.

### Patch Changes

- fa208f1: When an engine or a `kibi prove` run is killed while it holds the branch store, the next attach now records the takeover, so `kb_status` lists the `store_lock_taken_over` notice and `kibi doctor` reports it. Before, the notice never appeared in practice: the operating system releases a dead holder's lock, so the attach that the takeover record depended on never failed. `kibi doctor` now also reports a takeover on a branch store that is not compiled yet.

  Technical summary: the new `noteDeadHolderBeforeAttach(kbPath)` in `prolog/store-lock.ts` reads the `rdf/lock` file a holder leaves only when it crashes or is killed (SWI deletes it on every detach and halt), classifies its holder (the ownership journal when it names the same pid, else the lock file's pid) with `decideStoreLockTakeover`, and returns a step that writes `<store>/.kibi-lock-takeover.json`; `EngineSession.boot` and the CLI runtime run it only after `kb_attach` succeeds. `recoverStaleJournalLock`, which the daemon and sync run before attaching, records the takeover before it removes a dead holder's `rdf/lock` and now treats an `EPERM` liveness probe as a live holder. `retryAttachAfterBreakingStaleLock` keeps its record for the `store_locked` path.

- 1cee3b0: `kibi proof inspect --update <id>` now says "To add integration '<id>'" when the integrations file does not have that id yet, instead of claiming it would replace an integration that does not exist. An existing id still reads "To replace integration '<id>'".

  Technical summary: `inspectProofEnvironment` picks the verb from `currentIntegrations` and uses the trimmed `--update` id, matching the create-or-update choice `buildProofIntegrationPlan` already makes.

- d973759: The kibi-usage skill (2.15.0) now tells agents to title a symbol after the behavioral member the extractor can find (`ClassName.methodName`, an exported function, or a class). It also explains that linking a coarse file- or module-level symbol to a requirement is refused when the file already has granular behavioral symbols, unless the symbol sets `granularity_reason`, so agents stop retrying refused symbol writes.

  Technical summary: the "Symbol-First Traceability" section of `kibi-usage/SKILL.md` gains one paragraph on `title` and the granularity gate, listing the allowed `granularity_reason` values (`config-artifact`, `module-level-behavior`, `extractor-miss`, `legacy-link`, `test-suite`). Host skill copies are regenerated.

- 1b8d532: A fresh clone with a restored `.kb/` no longer reports every source file stale when its symbols were written by `kb_upsert` into an untracked `.kb/symbols.yaml` that an older Kibi left without a pending-source receipt. `kb_status` now confirms those files against the per-symbol source hashes recorded in `.kb/symbol-coordinates.yaml`, and the next `kibi sync` (including the automatic `freshness-resync` action) compiles that manifest so the store records its content hash for every later clone.

  Technical summary: `confirmSourceNewerReasons` reads the canonical `.kb/symbol-coordinates.yaml` (plus the artifact beside every hashed manifest) even when the manifest's composite hash is absent from `sync-cache.json`; a file with neither cache nor coordinate evidence keeps its reason. Before discovery, `syncCommand` calls the new `adoptUpsertOnlySymbolManifest`: when `.kb/symbols.yaml` is untracked by Git, has no pending-source receipt, declares symbols, and at least one of them is already in the compiled branch store (one entity lookup per id through the engine, stopping at the first hit), it writes the receipt `kb_upsert` writes, so tracked-only discovery includes the manifest. A hand-written untracked manifest whose symbols the store never saw keeps the tracked-only boundary and sync's "stage this file" note.

- Updated dependencies [78e561d]
  - kibi-core@0.20.0

## 2.13.3

### Patch Changes

- 50b7a65: `kb_status` no longer reports a freshly cloned or checked-out workspace as stale just because every file got a new modification time. A source is only reported as newer than the compiled store when its content differs from what the last `kibi sync` compiled, and sources that really changed now come with one automatic `freshness-resync` action (`kibi sync`) that `kb_apply_plan` can run, instead of one review-only action per file with no executor.

  Technical summary: `executeStatus` confirms each `indexed_source_newer`, `knowledge_source_newer` and `documentation_source_newer` reason against recorded content hashes (the store's `sync-cache.json` source hashes, a symbol manifest's composite hash of its referenced sources, or the coordinate artifact's per-symbol `sourceHash`), drops reasons whose sha256 matches and recomputes `syncState`/`dirty` when nothing else remains. `buildActionsFromStatus` maps the remaining reasons to a single automatic `freshness-resync` action (code `freshness_resync`, `kibi sync`), and `applyMigrationAction` runs it through `syncCommand`. The Prolog status module is unchanged.

- 50b7a65: Stopping the engine daemon now releases the branch store cleanly, so `rdf/lock` and `.kibi-lock-owner.json` no longer stay behind after every stop or idle exit, and the idle exit happens on time even after the machine or VM was suspended. When Kibi does take over a lock whose holder died, `kb_status` and `kibi doctor` now say so instead of the takeover being visible only in a detached process's discarded output.

  Technical summary: daemon shutdown runs `kb_detach` after a successful `kb_save` and fsync, then signals the SWI-Prolog child; when the detach did not complete it first gives the child up to 1 s to halt on stdin EOF and run its at_halt cleanup (`PrologProcess.terminate({ graceMs })`, which returns as soon as the child exits). Idle exit uses a wall-clock check (`lastActivityAt`, updated on every request and client close) on an unref'd interval of min(idle timeout, 30 s) instead of a one-shot timer. Before breaking a stale lock, `retryAttachAfterBreakingStaleLock` writes `<store>/.kibi-lock-takeover.json` (`brokenPid`, `reason`, `at`); `kb_status` lists it for 24 hours as a non-blocking `store_lock_taken_over` entry in the new `notices` field, and `kibi doctor`'s branch-store check reports it.

- 50b7a65: Permission statements written with a plain "can", "may" or "are permitted to" ("Coaches can read analysis requests that are not assigned to them.") are now modelled as `permission_rule` facts instead of being rejected as non-normative prose. And an allow and a deny for the same actor, action and resource now contradict: `kb_check` (`domain-contradictions`) and the commit-time check of `kb_upsert` (including `dryRun`) report "Decision conflict on default:permission_rule(coach,read,…)" for the pair.

  Technical summary: the predicate applicability gate accepts bare `can`/`may` modals, `is/are (not) allowed/permitted to` and `permitted`; the semantic advisor's normative-assertion detector accepts only the explicit grant forms (`is/are (not) allowed/permitted to`, `permitted`), so descriptive "can" sentences in existing requirements are not reclassified; the `permission_rule` intent cue, catalog keywords and exact-pattern scorer accept `permitted` and plural `are … to` forms. The built-in `permission_rule` schema declares `key_arguments: [actor, action, resource]`, and kibi-core adds a `req_conflict_witness/3` clause: two `requires_predicate` facts of a decision predicate (the built-in `permission_rule`, or a project schema that declares `key_arguments` and a non-key `decision` argument) that agree on every key argument but whose decisions resolve to allow and deny (a deny decision counts as a denial whatever its polarity) are a contradiction. `docs/inference-rules.md` documents the rule.

- 50b7a65: The kibi-usage skill (2.14.0) now says plainly what moves `proofProven`: only an end-to-end test (by its `verification_scope`) with a fresh passing receipt; unit receipts are recorded but leave the `missing_passing_e2e` gap. Its second-agent recipes now create scenarios with `assumes` links to the facts they rely on, so a new or superseding requirement no longer leaves a "Scenario expects success but assumes nothing" warning. `kibi proof inspect` shows the command each configured integration runs.

  Technical summary: kibi-usage `resources/proof.md` gains a "What counts toward proofProven" section (scope source, unit/integration receipts, the component-scope UI exception, `coverage_depth` following authored status); recipes 1 and 2 of "Second-agent edits" add `assumes` (sent in the scenario's own write) and `expects` only with `assumes`, and re-pointing or closing the old scenario. `kibi proof inspect --json` adds `currentIntegrations: [{ id, producer, command }]` beside the compatible `currentIntegration`, and the text output lists each integration's command. Host skill copies are regenerated.

- 50b7a65: `kb_search` now says when it searched a branch store that was never compiled. On a new branch created without the post-checkout hook, a search used to return only "No intent search results … (abstained)" while the authored requirements sat uncompiled in `.kb/`; it now names the branch, reports the uncompiled store and tells the agent to run `kibi sync` first, the same diagnosis `kb_status` and `kb_check` already gave.

  Technical summary: the `kb_search` payload gains `branch` (the attached Kibi branch or `null`, present whatever the result count) and, when `uncompiledBranchStoreReason` fires, `branchStore: { state: "not_compiled", code: "branch_store_not_compiled", path, detail, remediation }`; the text output appends the same note. The `kb_search` data contract and `docs/mcp-reference.md` list both fields.

- 50b7a65: Symbols that `kb_upsert` adds to the `.kb/symbols.yaml` created by `kibi init` now survive the first compile of a new branch. Before, that file was untracked and had no pending-source receipt, so sync never read it: the branch that wrote the symbols kept them, but a new branch store compiled their `implements`/`covered_by` edges without the symbols, warned about dangling relationships and failed `kb_check` with `source-relationship-parity` violations. The symbols manifest is also written as block YAML instead of one `symbols: [ { … } ]` line.

  Technical summary: `writeSourceForUpsert` now writes the pending-source receipt whenever Git does not track the target file (`git ls-files --error-unmatch`), not only for new or already-receipted files, mirroring relationship shards. Sync's dangling-relationship warning names each missing endpoint and, when the endpoint is declared in an untracked file with no receipt (markdown or symbol manifest), names the file and the `git add` / `kb_upsert` fix; `kb_check`'s `source-relationship-parity` findings carry the same cause in `suggestion` and `evidence.untrackedSources`. Appending to a flow-style `symbols` sequence converts it to block style.

- Updated dependencies [50b7a65]
  - kibi-core@0.19.0

## 2.13.2

### Patch Changes

- 95d4a9e: A migration plan that `kb_apply_plan` refuses no longer looks like a success. Re-applying a proof-integration plan whose `.kb/proof/integrations.json` already exists (or one whose runner config changed since planning) used to return `status: "success"` with `outcome: "reconciliation_required"`, so an agent reading only the status thought it had worked. It now returns an error result (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `MIGRATION_PLAN_REFUSED`, `data.outcome: "refused"` and the refusal reason in the message; nothing was changed and nothing needs reconciling.

  Technical summary: `kibi.migration-apply-result.v1` gains `outcome: "refused"` (with `closeout.taskOutcome: "blocked"`) for an application that applied no action and whose every failure was a `MigrationActionRefusedError`: the proof-integration executor's refusals, predicate-schema-alignment drift and malformed invocations, and an action code with no automatic executor. `reconciliation_required` keeps meaning an action failed without being refused. `toKibiResult` turns a refused migration result into an error envelope with effects `not_applicable`; the CLI JSON route now exits 1 for any error envelope it returns (also a rejected bootstrap plan), and the MCP tool wrapper sets `isError: true` for one. `docs/mcp-reference.md` documents each migration outcome and how `kb_delete` reports an authored-entity refusal (status success, `deleted: 0`, the reason in `errors`); `docs/error-reference.md` adds `MIGRATION_PLAN_REFUSED`; kibi-usage describes both.

- 2e54379: `kb_model` (`mode: "predicates"`) now recognises everyday permission statements. "Suspended users must not publish articles." — the kibi-usage skill's own deny example — returns an applicable `permission_rule` candidate instead of an ontology-gap observation, and so do claims such as "Only editors may approve drafts.". Subject and actor keys derived from plurals are spelled correctly: "coaches" becomes `coach` (not `coache`), "policies" becomes `policy`, and singular words such as "access" or "analysis" keep their final "s".

  Technical summary: the `permission_rule` applicability gate keeps its action-cue list and also accepts a common action verb (publish, approve, assign, view, edit, create, submit, share, complete and similar) when it directly follows the permission modal (`may`, `can`, `cannot`, `must not`, `is allowed to`, …), so a quota such as "Uploads must not exceed 10 MB." still does not read as a permission. Both `singularize` helpers (predicate modeling and the semantic advisor) now share `singularizeToken`: `-ches`/`-shes`/`-sses`/`-xes` drop "es", `-ies` becomes "y", and tokens ending in "ss", "us" or "is" are kept; each helper keeps its existing exceptions. kibi-usage 2.13.0 shows the four-argument `permission_rule(suspended_user,publish,articles,deny)` fact that `kb_model` plans for the fact-lanes deny example.

- f4cc71c: Agents setting up proof now learn up front that a `command` integration is judged as one run: when `kibi proof inspect` proposes the package's whole `test` script, `integrationPlanReason` (also printed in the human output now) says that any failing test in the run fails every proof obligation that names the integration, and how to narrow it. The new `kibi proof inspect --command "<command>"` option proposes that command instead of the detected one, so `kibi proof inspect --update <id> --command "…" --json` can narrow an existing integration to the proof-bearing tests. The kibi-usage proof resource also states that every `required_proofs[].symbol_id` must name an existing symbol entity (create it first) and that `proof_bindings[].source_file` must match that symbol's `sourceFile`.

  Technical summary: `proposeProofIntegration` and `buildProofIntegrationPlan` accept an explicit argv (`--command`, parsed as space-separated words or a JSON array of strings) ahead of the `package.json` test script and the detected runner; a plan built from the package test script appends the whole-run note to its reason. kibi-usage 2.13.0 `resources/proof.md`, `docs/cli-reference.md` and `docs/proving-requirements.md` document the option and the whole-run semantics (the latter no longer suggests an update plan can switch to a native producer).

- Updated dependencies [8599f27]
  - kibi-core@0.18.2

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
