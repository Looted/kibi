You are installing and bootstrapping “Kibi” (a repo-local, per-branch project knowledge base + MCP server).

Goal
- Initialize Kibi in THIS existing repository so it works out-of-the-box for a monorepo.
- Kibi must be per-branch, and on first use of a branch it must copy its KB from main.
- After setup, I should be able to run: kibi sync, kibi check, and start the MCP server.

Hard rules
- Do not guess installation steps. First run the Kibi command that prints agent instructions (e.g., `kibi doctor` and/or `kibi init --print-instructions`); follow those instructions exactly.
- If Kibi instructions conflict with the repo state, stop and ask me what to do.
- Make changes in the smallest possible way; do not reformat unrelated files.
- Never commit unless I explicitly ask. Prefer creating a branch and a clear change summary.

What to do (high-level)
1) Inspect repo root: package manager, OS assumptions, existing hook tooling, CI, and whether `.git` is present (not a shallow export).
2) Install Kibi using the method Kibi recommends (global/local/binary) and verify `kibi --version`.
3) Run Kibi initialization in repo root:
   - Create the `.kb/` (or Kibi’s chosen) directory layout.
   - Configure per-branch storage with “copy-from-main” behavior.
   - Generate a minimal schema supporting: req/scenario/test/adr/flag/event/symbol.
4) Hook automation:
   - Install Git hooks (prefer `core.hooksPath` if Kibi recommends).
   - Ensure branch switching triggers “ensure branch KB exists” + “sync”.
   - Ensure merges trigger “sync”.
   - Provide a cleanup command (`kibi gc`) and hook it if Kibi recommends.
5) Run a first import/sync:
   - If the project already has Markdown docs (ADRs/requirements/features), configure Kibi to ingest them (IDs, frontmatter, tags).
   - Otherwise create the minimal example structure Kibi expects (without inventing real requirements).
6) Validate:
   - Run `kibi sync` then `kibi check` and fix any reported issues by adjusting configuration/templates (not by faking data).
7) Output a “Setup Report”:
   - Commands executed.
   - Files added/modified (paths).
   - How to run locally (3–5 commands).
   - How to use with an agent (which MCP server command / config).
   - How per-branch copying works and where the DBs live on disk.

Deliverables
- A working initialization in the repo with documented next steps.
- No broken hooks, no noisy logs, and no non-deterministic behavior.
