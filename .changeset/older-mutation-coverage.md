---
"kibi-cli": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
---

A `kb_check` scoped to `sourceFiles` no longer fails when it cuts a result with more violations than diagnostics to its size budget; a violation without a diagnostic now costs only its own text. In a workspace nested inside a larger Git repository, the scoped check now recognizes the agent's own `.kb/` document changes (Git reports them relative to the repository root), so their findings are listed instead of counted as omitted.

Small simplifications in `kb_upsert`'s inventory fill-in, `kb_apply_plan`'s legacy migration ordering, the migration plan, check policies, pending-source receipts and `statedRule` change no behavior; new tests pin each of those decisions.
