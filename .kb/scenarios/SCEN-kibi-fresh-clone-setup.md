---
title: A fresh clone of a Kibi repository gets hooks, agent instructions and a compiled store without kibi init
status: active
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:53.991Z'
id: SCEN-kibi-fresh-clone-setup
type: scenario
---
Steps:

1. Run `kibi init` in a repository with a root `package.json`: it records
   `kibi.setup` with autoSync, prepareHooks and agentInstructions on and
   ciGate off, writes `AGENTS.md` with a marker-delimited Kibi section and a
   `CLAUDE.md` that imports it, and adds a `prepare` script that runs
   `kibi hooks install --quiet`.
2. Clone that repository and install its dependencies: the `prepare` step
   installs Kibi's Git hooks. Without `kibi-cli` installed, in CI or outside a
   Git work tree, the same step exits 0 and prints nothing.
3. In the clone, run a store-backed operation such as `kibi query`: it compiles
   the branch store first, answers from the knowledge base and leaves every
   tracked file unchanged. With `KIBI_AUTO_SYNC=0` or `autoSync: false` it
   reports `branch_store_not_compiled` as before.
4. Re-run `kibi init` with `--no-prepare-hooks --no-agent-instructions`: it
   records the opt-outs, removes only its own `prepare` step, and a later
   plain `kibi init` keeps them.
5. Start a session in a clone without hooks: each harness plugin adds one note
   naming `kibi hooks install`; once the hooks are installed, or where a hook
   manager or `core.hooksPath` owns them, there is no note.
6. Run `kibi doctor` where a recorded choice is not in place: the
   "Fresh-clone setup" check warns and points at `kibi init`.