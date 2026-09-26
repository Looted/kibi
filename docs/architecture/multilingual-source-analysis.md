# Multilingual source analysis

Status: implementation in progress. This document distinguishes implemented interfaces from delivery requirements that still need verification.

## Decision

Extend the existing capability registry and `SourceAnalysisService` with the additive `kibi.symbol-extractor.v2` contract. Keep the synchronous v1 API and ts-morph implementation available. V2 analyses supplied snapshot bytes asynchronously and distinguishes `ok`, `partial`, `unsupported`, and `failed`. A configured provider failure remains a failure; an empty successful declaration list is valid. Shadow providers cannot change the canonical result.

Positions use one-based lines, zero-based UTF-16 columns and exclusive ends. CRLF is not rewritten. Host validation checks ranges against the supplied content and assigns provider/input provenance. Qualified names and container names are locators, not authored KB identities. An ambiguous locator cannot transfer ownership or proof.

Git inventory precedes language analysis. Capture the index once with `git write-tree`, read both versions from immutable Git objects, and reject a changed index or HEAD before reporting a staged result. Knowledge must come from the same tree as source, including requirements, symbol manifests and relationship shards. Neither a working-tree manifest nor a previously compiled branch database can repair an invalid staged snapshot. An unborn branch uses an empty tree. Explicit commit diffs use the same inventory representation.

The official Tree-sitter plugin supplies a small qualified catalog, starting with Python and Go and then Rust. Installation supplies the runtime, WASM grammars, queries and license material; analysis does not download artifacts or run consumer toolchains. Grammar availability alone does not mean qualified symbol support. A worker provides bounded execution and failure containment, not a sandbox for arbitrary JavaScript.

Explicit `sync --refresh-symbol-coordinates` can refresh unique, already authored Python declarations when the host-validated Tree-sitter result is partial only because of decorator expansion. The command prints a partial-analysis warning and preserves diagnostics and uncovered ranges. It does not invent decorator-created declarations or mark analysis complete. Default enrichment and the generated-manifest gate remain strict in this delivery; policy-bound migration is a separate stage. Syntax, integrity, timeout and other incomplete-analysis failures remain errors.

Maintenance may only use builtin providers and explicitly activated, host-approved source analyzers whose package contents were verified before importing code. Ontology and semantic-classifier activation does not authorize running those capabilities during a check. Package names and `network: false` declarations alone are not a trust boundary.

## Delivery sequence

1. Additive SDK contract, builtin adapter, host validation, exact Git inventory and regression tests.
2. Qualified offline Python/Go plugin, staged/sync integration and packed-consumer tests.
3. Rust through the same catalog and conformance suite.
4. Java, C#, PHP, C, C++, Bash, Ruby and HCL structure, each after artifact and license qualification. SQL, HTML/CSS, JSON/YAML remain explicitly classified at file level unless separately qualified. Bash is not a guarantee for every shell dialect.
5. Explicit impact-policy migration, content-bound review evidence, controlled broker-repository copy and aggregate PR-diff CI using trusted policy.
6. Bounded LSP comparison on two servers; an opt-in adapter only if the measured benefit warrants it. Distribution, isolation and performance qualification.

The first delivery does not silently change every advisory file-level warning to a blocking error. Technical freshness, impact review and executable proof are separate checks. File-level review never substitutes for executable-symbol proof. No release publication, merge or branch-protection change is part of this work.

## Runtime evidence

Session metadata records the initial orchestrator as `gpt-6-astra` with effort `high`. After the host resumed the session, its active model changed to `gpt-6-sol` with effort `xhigh`; the owner explicitly approved completing the PR in that session. The active orchestrator settings were verified again on 2026-09-26. The SDK/builtin, Git snapshot and parser qualification workers each record `gpt-6-luna` with effort `xhigh`. These values were read from actual session `turn_context` records, not inferred from task prompts. Both independent critical reviewers record `gpt-6-sol` with effort `xhigh`. Their reviews reproduced and drove fixes for missing staged requirement endpoints, working-tree granularity leakage, TypeScript accessor identity and staged analyzer activation precedence.

The clean initial worktree used `origin/develop` at `f1f437188bd9c4abc5dd0aaacbd92fac1cd142d3`. PRs #279 and #280 were checked for overlap before implementation. After they merged independently, this feature branch incorporated `develop` at `750d8c5ce4ddbd95f49b3dc0094545a55f7fec97`. Canonical queries reconciled the symbol manifests and retained all 3701 distinct IDs and all ownership edges from both parents. PR #281 remains separate; its Git-hook installation changes do not overlap the owned production files in this delivery.
