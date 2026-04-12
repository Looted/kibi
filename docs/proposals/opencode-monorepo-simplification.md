# OpenCode monorepo simplification review

## Completed in this change

- `ux.toastStartup` config flag added (default on, project overrides global)
- `packages/opencode/src/startup-notifier.ts` created with TUI toast + structured-log fallback
- `packages/opencode/src/plugin-startup.ts` extracted from `index.ts`, reducing entrypoint from ~800 to ~600 lines

## Scope and bar for recommendations

This review compares the current monorepo against the stated package responsibilities in `docs/architecture.md` and the thin-bridge constraint in `documentation/adr/ADR-016.md`.

I only classify work as:

- `now` when a real hotspot is visible in package code and the change stays inside the package's existing responsibility.
- `later` when there is evidence for cleanup, but the change needs stronger contracts/tests first.
- `not recommended` when the package boundary already matches the architecture docs and the "simplification" is really a rewrite.

The overall result is conservative: package boundaries are mostly sound already. The clearest justified simplification is inside `packages/opencode`, especially `packages/opencode/src/index.ts`.

## core

`packages/core` matches `docs/architecture.md`: the package is the Prolog/RDF engine, validation layer, and concurrency boundary. The evidence is concentrated in `packages/core/src/kb.pl`, `packages/core/src/checks.pl`, `packages/core/src/discovery.pl`, and `packages/core/schema/validation.pl`.

- `later` — tighten the public save/error surface before any deeper cleanup. `packages/core/src/kb.pl` mixes persistence, file locking, audit syncing, and stale-snapshot failure paths in one module. If maintainers want simplification here, the safe first step is a narrower wrapper around save/attach error handling, not a package reshuffle.
    - **Payoff**: Improved reliability and clearer error handling for KB persistence.
    - **Risk**: Potential regressions in file locking or audit synchronization logic.
    - **Constraint/ADR**: Aligns with `docs/architecture.md` core responsibilities.
- `not recommended` — do not treat "simplify core" as "rewrite Prolog/RDF into TypeScript". `packages/core/src/kb.pl` and `packages/core/src/checks.pl` rely on SWI-Prolog RDF, persistency, and rule evaluation in ways that are the product architecture, not accidental complexity. That rewrite would replace the core design described in `docs/architecture.md`, not simplify it.
    - **Payoff**: Avoids massive rewrite and potential loss of complex rule evaluation capabilities.
    - **Risk**: Continued dependence on Prolog might be seen as a barrier for some contributors.
    - **Constraint/ADR**: Violates the fundamental architecture defined in `docs/architecture.md`.

## cli

`packages/cli` also fits its documented role: command surface, extractor orchestration, and Prolog process wrapper. The main evidence is `packages/cli/src/cli.ts`, `packages/cli/src/prolog.ts`, `packages/cli/src/prolog/codec.ts`, and `packages/cli/src/commands/sync.ts`.

- `now` — simplify around tests and seams, not around package boundaries. `packages/cli/src/prolog.ts` combines interactive process management, one-shot execution, attach/save flows, and error translation; the justified simplification is to harden that seam with better integration coverage before refactoring internals.
    - **Payoff**: Faster developer iteration and fewer regressions in CLI-Prolog communication.
    - **Risk**: High initial effort to create robust integration test suite.
    - **Constraint/ADR**: Maintains CLI ownership of extraction as per `docs/architecture.md`.
- `later` — extract a smaller Prolog client boundary only after the current behavior is pinned. The split between `packages/cli/src/prolog.ts` and `packages/cli/src/prolog/codec.ts` suggests a future adapter boundary is plausible, but `packages/cli/src/commands/sync.ts` still depends on today's semantics, so this is cleanup work, not an immediate simplification win.
    - **Payoff**: Better internal modularity and potential for reusable Prolog client.
    - **Risk**: Breaking the critical `sync` command if semantics are misunderstood.
    - **Constraint/ADR**: Consistent with documented roles for CLI and its internal components.
- `not recommended` — do not collapse CLI responsibilities into MCP or replace the Prolog-backed wrapper with a new JS-only implementation. `docs/architecture.md` assigns CLI ownership of extraction and subprocess orchestration, and the current files still reflect that boundary cleanly.
    - **Payoff**: Maintains clear separation of concerns between CLI and MCP.
    - **Risk**: Unnecessary complexity if transport boundaries are collapsed prematurely.
    - **Constraint/ADR**: Respects the extraction and subprocess orchestration ownership in `docs/architecture.md`.

## mcp

`packages/mcp` remains a focused transport/server package. `packages/mcp/src/server.ts`, `packages/mcp/src/server/transport.ts`, `packages/mcp/src/server/session.ts`, and `packages/mcp/src/workspace.ts` line up with the architecture doc's stdio JSON-RPC, persistent Prolog session, and branch-aware behavior.

- `now` — simplify the riskiest hotspot by documenting and testing session invariants, not by moving package boundaries. `packages/mcp/src/server/session.ts` owns the real complexity: Prolog lifecycle, branch attachment, KB path switching, and shutdown coordination.
    - **Payoff**: Stability in multi-branch agent sessions and reliable shutdown.
    - **Risk**: Requires deep understanding of Prolog lifecycle management.
    - **Constraint/ADR**: Aligns with branch-aware behavior in `docs/architecture.md`.
- `later` — split Prolog session mechanics out of `packages/mcp/src/server/session.ts` only after those invariants are better pinned. The evidence supports an eventual internal extraction, but it is still package-internal cleanup.
    - **Payoff**: Cleaner `session.ts` focused only on MCP protocol integration.
    - **Risk**: Introduction of complex internal state management between session and Prolog handler.
    - **Constraint/ADR**: Internal refactoring consistent with `docs/architecture.md`.
- `not recommended` — do not reframe MCP simplification as a transport rewrite. `docs/architecture.md` explicitly describes a stdio JSON-RPC server, and `packages/mcp/src/server/transport.ts` plus `packages/mcp/tests/stdio-protocol.test.ts` show that this transport is the current contract, not incidental plumbing.
    - **Payoff**: Preserves compatibility with existing MCP clients.
    - **Risk**: Significant effort for minimal gain if transport is fundamentally changed.
    - **Constraint/ADR**: Explicitly follows the stdio JSON-RPC server model in `docs/architecture.md`.

## opencode

`packages/opencode` is where simplification work is most justified. `documentation/adr/ADR-016.md` says this package must stay a thin bridge and must not duplicate Kibi logic from CLI/MCP. The package still respects that rule: `packages/opencode/src/scheduler.ts` shells out to `kibi sync`, `packages/opencode/src/prompt.ts` limits agent guidance to public MCP tools, and `packages/opencode/README.md` repeats the thin-bridge policy. But `packages/opencode/src/index.ts` has grown into the main orchestration hotspot at 791 lines while importing many helper modules.

- `now` — split `packages/opencode/src/index.ts` by lifecycle concern while keeping the same bridge boundary. The strongest candidate is to separate plugin boot/setup, file-edited event handling, and prompt-hook emission into smaller modules because the current file owns cache invalidation, posture detection, runtime degraded state, scheduler wiring, warning emission, and hook registration all at once.
    - **Payoff**: Much easier to maintain and test the OpenCode bridge entrypoint.
    - **Risk**: Breaking the plugin initialization sequence or hook registration.
    - **Constraint/ADR**: Enforces the thin-bridge constraint from `ADR-016`.
- `later` — remove duplicated lightweight orchestration helpers only after the main split lands. For example, both `packages/opencode/src/index.ts` and `packages/opencode/src/prompt.ts` carry local `deriveFileBucket` helpers, and the package already exports stable submodules in `packages/opencode/package.json`; that supports later consolidation, but the real gain is first getting `index.ts` smaller.
    - **Payoff**: Reduced code duplication and cleaner internal API surface.
    - **Risk**: Low, mainly around ensuring helper semantics are truly identical.
    - **Constraint/ADR**: Follows the thin-bridge policy and export structure.
- `not recommended` — do not "simplify" by moving sync, validation, or KB logic into the plugin host. `documentation/adr/ADR-016.md`, `packages/opencode/src/scheduler.ts`, and `packages/opencode/src/prompt.ts` show that the bridge is intentionally thin because CLI and MCP already own those responsibilities.
    - **Payoff**: Prevents logic duplication and maintainability issues in the host.
    - **Risk**: Potential for performance bottlenecks if shelling out is overly frequent.
    - **Constraint/ADR**: Directly adheres to the thin-bridge constraint in `ADR-016`.

## vscode

`packages/vscode` is broader than the v0 description in `docs/architecture.md`, but still coherent: TreeView plus MCP integration remain the center, with added editor helpers. The evidence is `packages/vscode/src/extension.ts`, `packages/vscode/src/activation/index.ts`, `packages/vscode/src/activation/mcp.ts`, `packages/vscode/src/treeProvider.ts`, `packages/vscode/src/symbolIndex.ts`, and `packages/vscode/src/relationshipCache.ts`.

- `now` — simplify activation orchestration before touching features. `packages/vscode/src/activation/index.ts` is the clearest internal coordination point for MCP startup, tree view registration, and feature/provider wiring, so cleanup should start there.
    - **Payoff**: Faster VS Code extension startup and cleaner activation sequence.
    - **Risk**: Accidental disruption of feature registration order.
    - **Constraint/ADR**: Matches current v0 role described in `docs/architecture.md`.
- `later` — revisit whether `packages/vscode/src/symbolIndex.ts` and `packages/vscode/src/relationshipCache.ts` should become a clearer internal service boundary. The code suggests a shared stateful subsystem, but there is not yet evidence that a package split would pay for itself.
    - **Payoff**: Potential for a robust VS Code-specific indexing service.
    - **Risk**: Premature abstraction before the indexing needs are fully stable.
    - **Constraint/ADR**: Internal refactoring with no immediate external architectural impact.
- `not recommended` — do not remove hover/codeLens/codeAction providers just to make the extension look more "minimal" on paper. `packages/vscode/src/hoverProvider.ts`, `packages/vscode/src/codeLensProvider.ts`, and `packages/vscode/src/codeActionProvider.ts` are implemented product surface, not obvious dead weight.
    - **Payoff**: Preserves valuable user features and editor integration.
    - **Risk**: High user dissatisfaction if core IDE features are removed.
    - **Constraint/ADR**: Aligns with the editor helper additions beyond v0.

## dogfood shim

The repo-local dogfood coupling is real, but small and explicit. `.opencode/plugins/kibi.ts` is a two-line shim that re-exports `packages/opencode/dist/index.js`, while `packages/opencode/package.json` defines the published surface and `packages/opencode/README.md` documents the dogfood workflow.

- `now` — improve the shim's failure mode, because the coupling is operational rather than architectural. `.opencode/plugins/kibi.ts` hard-depends on a built `packages/opencode/dist/index.js`; the justified simplification is a clearer loader error or guard, not a new runtime layer.
    - **Payoff**: Better developer experience when working on the local dogfood environment.
    - **Risk**: Very low, primarily around potential edge cases in loader paths.
    - **Constraint/ADR**: Maintains the explicit split between package code and local shim.
- `later` — consider a fallback loader that prefers local `dist` and otherwise resolves the installed `kibi-opencode` package, but only if developer workflow friction stays high. The evidence supports this as a UX improvement, not an architectural need.
    - **Payoff**: More resilient local development setup.
    - **Risk**: Complexity in ensuring the right version is loaded (dist vs installed).
    - **Constraint/ADR**: Purely operational improvement, no architectural change.
- `not recommended` — do not duplicate plugin implementation under `.opencode/plugins/`. `documentation/adr/ADR-016.md`, `packages/opencode/package.json`, and `.opencode/plugins/kibi.ts` already establish the right split: package code owns behavior; the shim only points at it.
    - **Payoff**: Avoids code fragmentation and ensures only the package is the source of truth.
    - **Risk**: Increased maintenance burden if implementation is duplicated.
    - **Constraint/ADR**: Consistently follows `ADR-016` and package boundary rules.

## Conclusion

The monorepo does not need a broad package rewrite. The package boundaries are sound. The evidence supports:

1. package-internal cleanup in `packages/opencode` right now, centered on `packages/opencode/src/index.ts`;
2. smaller internal simplifications in `packages/vscode`, `packages/mcp`, `packages/cli`, and `packages/core` only when tied to existing hotspots;
3. rejecting rewrite-shaped proposals that would replace the Prolog core, collapse transport boundaries, or move Kibi logic into the OpenCode host.


