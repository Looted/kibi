# kibi-zcode

## 0.2.0

### Minor Changes

- e9a8158: Kibi now ships a native ZCode plugin. Teams working in ZCode get the four
  bundled Kibi workflow skills, a `/kibi-bootstrap` slash command, advisory
  lifecycle hooks, and the Kibi MCP server without hand-editing any ZCode
  configuration — and without the plugin making a sound in workspaces that never
  adopted Kibi. Local ZCode development, package builds, and tests use Linux/WSL
  in this release.

  - Install via the repo marketplace from a locally built checkout: run
    `bun run build:zcode`, then in ZCode open Settings → Plugin Management →
    Discover, add the repository directory with the `+` button (marketplace
    manifest at `.claude-plugin/marketplace.json`, plugin at `packages/zcode`),
    and install `kibi-zcode`. GitHub-source installs are unsupported — the
    generated `dist/hook-runner.js` is not committed, and marketplace copies
    never build; `prepack` applies only to npm packaging flows.
  - `.zcode-plugin/plugin.json` declares the skills, command, hooks, and an
    inline `mcpServers` entry verified against ZCode's strict schemas (stdio
    servers accept only `command`/`args`/`cwd`/`env`/`enabled`/`timeoutMs`;
    hook matchers are case-sensitive regexes, so "match all" is expressed by
    omitting the matcher rather than a bare `*`).
  - `hooks/hooks.json` wires `SessionStart`, `PreToolUse` (edit-like tools),
    `PostToolUse`, and `Stop` to `dist/hook-runner.js`. Outputs use the exact
    ZCode contract (`hookSpecificOutput.hookEventName` + `additionalContext`):
    direct `.kb/` edits get an advisory warning, opted-in sessions get discovery
    guidance, and stops remind about impact checks and freshness. Tracking is
    mutation-based (read-only tool calls never count as changes), compares
    canonical workspace-relative paths across edits and `kb_check` sourceFiles,
    invalidates a covering impact check when the same path is edited again, and
    is namespaced per host session so concurrent ZCode sessions in one workspace
    cannot consume or clear each other's pending reminders. Hard enforcement
    stays with the Kibi git hooks.
  - The skills mirror (`packages/zcode/skills/`) rewrites each canonical
    SKILL.md frontmatter to ZCode's recognized key set (`name`, `description`,
    `license`, `metadata`) so skills are marked `safeToAutoLoad`; bodies and
    resources stay byte-identical to `packages/runtime/src/skills/`, enforced by
    a drift test. `scripts/sync-agent-skills.ts` gained a `zcode` target.
  - `bin/mcp-launcher.cjs` keeps non-Kibi workspaces silent: a zero-tool MCP
    session when no `.kb/manifest.json` exists at the resolved Kibi project
    root, a proxy of the resolved `kibi-mcp` (project-local package entry first
    via Node's own resolution, then a PATH lookup — launched shell-free through
    `process.execPath`, so it also works on Windows without command
    interpreters) when it does, and a guidance session that distinguishes a
    missing installation from a launch failure.
  - The launcher resolves export-restricted local `kibi-mcp` installs through
    their public Node entry and declared `bin`, so a working local package wins
    over PATH while a broken local package is surfaced rather than silently
    replaced. Its shell-free `process.execPath` launch path retains the runtime
    handling needed for Windows npm shims.
  - Packaging: `files` ships the manifest, launcher, hooks, skills, command, and
    built `dist/`; `scripts/sync-plugin-manifest-versions.ts` keeps the plugin
    manifest version in sync with the package version; root scripts gained
    `build:zcode`, `dev:zcode`, and matching typecheck entries wired into the
    `build`, `typecheck`, and `pack:all` chains.

### Patch Changes

- 96db9d8: The bundled kibi-usage skill now documents how to debug proof-ratchet regressions: when `kibi prove` or the proof baseline check fails, follow the new "Debugging proof regressions" section in `resources/proof.md`. It explains how to read the failure with `kibi proof explain`, compare current proof state against the committed `proof/baseline.json` ratchet with `kibi proof impact`, and resolve regressions by restoring real coverage (tests, symbol ownership, fresh receipts) instead of lowering the baseline. Agent sessions get a canonical recovery path instead of improvising around proof failures.

  - Add "Debugging proof regressions" guidance to `kibi-usage/resources/proof.md`
  - Point `kibi-usage/SKILL.md` at the new section and bump the skill version to 2.1.3

- c77b371: Proof coverage reaches every requirement that has honest end-to-end evidence: fourteen new packed end-to-end tests wire previously unproven scenarios (status freshness, conservative proof reporting, snapshot relevance, MCP model-requirement and freshness, schema version, strict modeling, plan-hash enforcement, OpenCode enforcement, briefing removal, Prolog/SPARQL adoption, check-gate enforcement, evaluator gold runs, batch diagnostics) into the proof ladder, and requirements that are historically retired can now actually opt out of E2E proof.

  - `kb_check` with `async: true` returns a `kibi.job.v1` receipt whose shape is declared in the tool's output contract, so hosts no longer reject the response schema mismatch on large KBs.
  - Authored `proof_exempt` / `proof_exempt_reason` frontmatter on requirement documents is now extracted and persisted; previously the exemption was silently dropped on sync.
  - The MCP JSON-Schema-to-Zod bridge converts `anyOf` unions faithfully for declared output contracts (input `oneOf` guards keep their intentional lenient behavior).
  - Proof-entity maintenance: stale `SYM-proof-runner` obligation removed from the journaled-engine harness contract, and `REQ-*` inline annotations repointed to the modeled verification-evidence requirement.
  - New proof obligations: `TEST-e2e-*` packed scenarios, `TEST-kibi-change-to-proof-evaluation-live` gold-corpus run, and `TEST-e2e-root-batch-diagnostics`; `runBatch` is exported from the curated suite runner for diagnostic reuse.
