---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": minor
---

A fresh clone of a Kibi repository now uses Kibi without anyone running `kibi init` in it. Before, a clone had the knowledge but no git hooks, an empty branch store (so queries answered nothing) and, without a per-user plugin, nothing telling an agent the knowledge base existed, so agents in new clones and cloud sessions ignored it. Now `kibi init` writes a Kibi section into `AGENTS.md` (imported from `CLAUDE.md`), adds a `package.json` `prepare` step that installs the hooks on every dependency install, and the first query, check or write in a clone compiles the branch store itself. Re-run `kibi init` in an existing repository to get the `AGENTS.md` section and the `prepare` step; `kibi doctor` reports them as missing until then.

- New setup choices `autoSync`, `prepareHooks`, `agentInstructions` (on by default) and `ciGate` (off), recorded on the first `kibi init` in `package.json` `kibi.setup`, or `.kb/setup.json` without a root `package.json`. `kibi init` takes `--[no-]auto-sync`, `--[no-]prepare-hooks`, `--[no-]agent-instructions` and `--[no-]ci-gate`, and the `kibi-bootstrap` skill (3.20.0) asks about them once.
- Auto-sync: CLI routes, `kibi check` and MCP tools that find this branch's store never compiled compile it first, with a compile that writes nothing Git tracks (no symbol-manifest layout rewrite, no adoption receipt), progress on stderr only, and a fallback to the previous `branch_store_not_compiled` answer when it fails. `kb_status` stays read-only and `kb_apply_plan` never pre-empts a plan. `KIBI_AUTO_SYNC=0` turns it off for one environment.
- New `kibi hooks install [--quiet]`. The `prepare` step is a Node one-liner that does nothing when `kibi-cli` is not installed (for example `npm ci --omit=dev`), in CI or outside a Git work tree, works under Windows `cmd.exe`, and is not added when a hook manager owns the hooks or there is no root `package.json`. `kibi-cli` exports `./bin/kibi` for it.
- `AGENTS.md` and `CLAUDE.md` get a marker-delimited section; text outside it is never changed, a link between the two files is written once, and a symlink that leaves the repository is not written through.
- `kibi init --ci-gate` adds `.github/workflows/kibi-check.yml`, which runs `kibi check` on pull requests (template in `docs/examples/github/kibi-check.yml`).
- `kibi doctor` has a "Fresh-clone setup" check against the recorded choices, and its missing-hooks remediation is now `kibi hooks install`.
- The Claude Code, Codex, Cursor, ZCode and OpenCode plugins tell the agent at session start when Kibi's hooks are not installed in the checkout (not where a hook manager or `core.hooksPath` owns them). The check lives in `kibi-agent-core/checkout-hooks`.
